import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  UserCheck,
  Building,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Settings,
  Lock,
  Save,
  Users,
  FileCheck,
  Briefcase,
} from "lucide-react";
import { CrmLead, HUDSON_CONSULTANTS, normalizeConsultantId } from "@/lib/crm/crmTypes";
import {
  calculateConsultantEarnings,
  ConsultantEarningsSummary,
} from "@/lib/commission/commissionCalculator";
import {
  loadConsultantSettings,
  saveConsultantSettings,
} from "@/lib/crm/crmStorage";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { getActiveStaffUser, canViewRemuneration } from "@/lib/authSession";

interface CrmCommissionDashboardProps {
  leads: CrmLead[];
  selectedConsultantId: string;
  onSelectConsultant: (id: string) => void;
  userRole?: "nhc" | "admin" | "viewer";
}

export function CrmCommissionDashboard({
  leads,
  selectedConsultantId,
  onSelectConsultant,
  userRole = "nhc",
}: CrmCommissionDashboardProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const staffUser = getActiveStaffUser();
  const isAuthorized = canViewRemuneration(staffUser);

  // Admin access check (Morgan Hales or admin role)
  const isAdmin =
    staffUser?.role === "admin" ||
    staffUser?.id === "morgan-hales" ||
    staffUser?.email === "morgan.hales@hudsonhomes.com.au";

  // If user is NHC, strictly lock to their own consultant ID.
  const activeConsultantId = isAdmin
    ? selectedConsultantId && selectedConsultantId !== "all"
      ? selectedConsultantId
      : "morgan_hales"
    : normalizeConsultantId(staffUser?.id || staffUser?.name);

  // Auto-sync parent state if NHC is currently on another consultant or "all"
  React.useEffect(() => {
    if (!isAdmin && selectedConsultantId !== activeConsultantId) {
      onSelectConsultant(activeConsultantId);
    }
  }, [isAdmin, selectedConsultantId, activeConsultantId, onSelectConsultant]);

  if (!isAuthorized) {
    return (
      <div className={`p-8 rounded-2xl border ${isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"} text-center space-y-3`}>
        <Lock className="h-8 w-8 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-white">Commission Access Restricted</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Commission features are private and restricted to authorized personnel.
        </p>
      </div>
    );
  }

  // Private salary & commission editor
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState(() =>
    loadConsultantSettings(activeConsultantId)
  );

  React.useEffect(() => {
    setCurrentSettings(loadConsultantSettings(activeConsultantId));
  }, [activeConsultantId]);

  const summary = calculateConsultantEarnings(activeConsultantId, leads);

  const formatAud = (val: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(val);

  const handleSavePrivateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveConsultantSettings(activeConsultantId, currentSettings);
    toast.success("Private salary & commission structure updated! ✓");
    setIsSettingsOpen(false);
  };

  // --------------------------------------------------------------------------
  // 12-Month Performance & Remuneration Matrix Calculations (Jan - Dec)
  // --------------------------------------------------------------------------
  const activeYear = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  const consultantLeads = leads.filter(
    (l) =>
      l.assignedConsultantId === activeConsultantId &&
      l.stage !== "sale_not_proceeding" &&
      l.stage !== "no_contact"
  );

  const monthlyMatrixRows = MONTH_NAMES.map((monthName, monthIdx) => {
    // 1. Inbound Leads created in this month
    const monthLeads = consultantLeads.filter((l) => {
      if (!l.createdAt) return false;
      const d = new Date(l.createdAt);
      if (isNaN(d.getTime())) return false;
      return d.getMonth() === monthIdx && (d.getFullYear() === activeYear || consultantLeads.length <= 10);
    });

    // 2. ATPs achieved in this month (Tranche 1 eligible)
    const monthAtps = summary.deals.filter((d) => {
      if (!d.tranche1Eligible) return false;
      const dateStr = d.tranche1PaidDate;
      if (dateStr) {
        const dDate = new Date(dateStr);
        if (!isNaN(dDate.getTime())) {
          return dDate.getMonth() === monthIdx && (dDate.getFullYear() === activeYear || consultantLeads.length <= 10);
        }
      }
      const lead = consultantLeads.find((l) => l.id === d.leadId);
      const fallbackDate = lead?.atpSignedDate || lead?.createdAt;
      if (fallbackDate) {
        const dDate = new Date(fallbackDate);
        if (!isNaN(dDate.getTime())) {
          return dDate.getMonth() === monthIdx && (dDate.getFullYear() === activeYear || consultantLeads.length <= 10);
        }
      }
      return false;
    });

    // 3. Contracts signed in this month (Tranche 2 eligible)
    const monthContracts = summary.deals.filter((d) => {
      if (!d.tranche2Eligible) return false;
      const dateStr = d.tranche2PaidDate;
      if (dateStr) {
        const dDate = new Date(dateStr);
        if (!isNaN(dDate.getTime())) {
          return dDate.getMonth() === monthIdx && (dDate.getFullYear() === activeYear || consultantLeads.length <= 10);
        }
      }
      const lead = consultantLeads.find((l) => l.id === d.leadId);
      const fallbackDate = lead?.contractSignedDate || lead?.updatedAt || lead?.createdAt;
      if (fallbackDate) {
        const dDate = new Date(fallbackDate);
        if (!isNaN(dDate.getTime())) {
          return dDate.getMonth() === monthIdx && (dDate.getFullYear() === activeYear || consultantLeads.length <= 10);
        }
      }
      return false;
    });

    const commFromAtps = monthAtps.reduce((sum, d) => sum + d.tranche1Amount, 0);
    const commFromContracts = monthContracts.reduce((sum, d) => sum + d.tranche2Amount, 0);
    const monthlyCommissions = commFromAtps + commFromContracts;

    const monthlySalary = (currentSettings.baseSalaryYearly || 75000) / 12;
    const totalRemuneration = monthlySalary + monthlyCommissions;

    return {
      monthIndex: monthIdx,
      monthName,
      shortName: MONTH_SHORT[monthIdx],
      leadsCount: monthLeads.length,
      atpCount: monthAtps.length,
      contractCount: monthContracts.length,
      commissionEarned: monthlyCommissions,
      baseSalary: monthlySalary,
      totalRemuneration,
      isCurrentMonth: monthIdx === currentMonthIdx,
    };
  });

  const ytdTotals = {
    leads: monthlyMatrixRows.reduce((acc, r) => acc + r.leadsCount, 0),
    atps: monthlyMatrixRows.reduce((acc, r) => acc + r.atpCount, 0),
    contracts: monthlyMatrixRows.reduce((acc, r) => acc + r.contractCount, 0),
    commissions: monthlyMatrixRows.reduce((acc, r) => acc + r.commissionEarned, 0),
    baseSalary: (currentSettings.baseSalaryYearly || 75000),
    totalRemuneration:
      (currentSettings.baseSalaryYearly || 75000) +
      monthlyMatrixRows.reduce((acc, r) => acc + r.commissionEarned, 0),
  };

  return (
    <div className="space-y-6">
      {/* Consultant Header & Private Commission Configuration */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border ${
          isLight
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-slate-900/90 border-slate-800 backdrop-blur-xl shadow-xl"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-xl flex items-center justify-center shadow-inner ${
              isLight
                ? "bg-amber-100 text-amber-700 border border-amber-300"
                : "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-amber-400"
            }`}
          >
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-lg font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
                Consultant Remuneration &amp; Performance Portal
              </h2>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                  isLight
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : "text-amber-300 bg-amber-950/80 border-amber-800/60"
                }`}
              >
                <Lock className="h-3 w-3" /> Private to {summary.consultantName}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
              50% Commission paid at Tender Acceptance (ATP) &bull; 50% paid at Building Contract (5% deposit).
            </p>
          </div>
        </div>

        {/* Consultant Switcher (Admin only) or Locked Identity Badge (NHC) */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin ? (
            <div className="flex items-center gap-1.5 min-w-[200px]">
              <UserCheck className={`h-4 w-4 ${isLight ? "text-slate-500" : "text-slate-400"}`} />
              <Select
                value={activeConsultantId}
                onValueChange={(id) => {
                  onSelectConsultant(id);
                  setCurrentSettings(loadConsultantSettings(id));
                }}
              >
                <SelectTrigger
                  className={`text-xs font-bold ${
                    isLight
                      ? "border-slate-300 bg-white text-slate-900"
                      : "border-slate-800 bg-slate-950 text-white"
                  }`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className={
                    isLight ? "border-slate-200 bg-white text-slate-900" : "border-slate-800 bg-slate-950 text-slate-100"
                  }
                >
                  {HUDSON_CONSULTANTS.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                      {c.name} ({c.displayOffice})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-xs shadow-inner ${
                isLight
                  ? "bg-amber-50 border-amber-300 text-amber-900"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-300"
              }`}
            >
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              <span>{summary.consultantName}</span>
              <span className={`text-[10px] font-normal ${isLight ? "text-amber-700" : "text-amber-400/80"}`}>
                ({staffUser?.displayCentre || "My Remuneration"})
              </span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`text-xs gap-1.5 font-semibold ${
              isLight
                ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                : "border-slate-800 bg-slate-950 text-slate-300 hover:text-white"
            }`}
          >
            <Settings className="h-3.5 w-3.5 text-amber-500" />
            <span>Salary &amp; Rate Settings</span>
          </Button>
        </div>
      </div>

      {/* Private Salary & Commission Config Dropdown */}
      {isSettingsOpen && (
        <form
          onSubmit={handleSavePrivateSettings}
          className={`p-5 rounded-2xl border space-y-4 animate-in fade-in max-w-lg shadow-xl ${
            isLight
              ? "bg-white border-amber-400/60 shadow-amber-500/5"
              : "bg-slate-900/95 border-amber-500/40 backdrop-blur-xl"
          }`}
        >
          <div
            className={`flex items-center justify-between border-b pb-2 ${
              isLight ? "border-slate-200" : "border-slate-800"
            }`}
          >
            <span
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isLight ? "text-amber-700" : "text-amber-400"
              }`}
            >
              <Lock className="h-3.5 w-3.5" />
              Private Remuneration Structure &bull; {summary.consultantName}
            </span>
            <span className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
              Only visible to your login
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Private Base Annual Salary Input */}
            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Annual Base Salary ($ AUD)
              </Label>
              <Input
                type="number"
                step="1000"
                min="0"
                value={currentSettings.baseSalaryYearly}
                onChange={(e) =>
                  setCurrentSettings({
                    ...currentSettings,
                    baseSalaryYearly: Number(e.target.value) || 0,
                  })
                }
                placeholder="75000"
                className={`h-9 text-xs font-mono font-bold ${
                  isLight
                    ? "border-slate-300 bg-slate-50 text-emerald-700 focus:bg-white"
                    : "border-slate-800 bg-slate-950 text-emerald-400"
                }`}
              />
              <span className={`text-[10px] block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Monthly: {formatAud(Math.round((currentSettings.baseSalaryYearly || 75000) / 12))}
              </span>
            </div>

            {/* Commission Rate (%) */}
            <div className="space-y-1.5">
              <Label className={`text-xs font-semibold ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                Commission Rate (%) on Ex-GST
              </Label>
              <Input
                type="number"
                step="0.05"
                min="0"
                max="10"
                value={currentSettings.commissionRatePct}
                onChange={(e) =>
                  setCurrentSettings({
                    ...currentSettings,
                    commissionRatePct: Number(e.target.value) || 0,
                  })
                }
                placeholder="2.25"
                className={`h-9 text-xs font-mono font-bold ${
                  isLight
                    ? "border-slate-300 bg-slate-50 text-amber-700 focus:bg-white"
                    : "border-slate-800 bg-slate-950 text-emerald-400"
                }`}
              />
              <span className={`text-[10px] block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                50% at ATP, 50% at Contract
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(false)}
              className={`text-xs ${isLight ? "text-slate-600" : "text-slate-400"}`}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-sm"
            >
              <Save className="h-3.5 w-3.5" /> Save Remuneration
            </Button>
          </div>
        </form>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Annual Base Salary */}
        <div
          className={`p-4 rounded-2xl border shadow-md ${
            isLight
              ? "border-slate-200 bg-white"
              : "border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40"
          }`}
        >
          <div className={`flex items-center justify-between text-xs mb-2 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            <span className="font-semibold">Base Annual Salary</span>
            <Briefcase className={`h-4 w-4 ${isLight ? "text-slate-400" : "text-slate-500"}`} />
          </div>
          <div className={`text-2xl font-black ${isLight ? "text-slate-900" : "text-white"}`}>
            {formatAud(currentSettings.baseSalaryYearly || 75000)}
          </div>
          <span className={`text-[11px] mt-1 block ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            {formatAud(Math.round((currentSettings.baseSalaryYearly || 75000) / 12))}/month guaranteed
          </span>
        </div>

        {/* Card 2: Realized Commission YTD */}
        <div
          className={`p-4 rounded-2xl border shadow-md ${
            isLight
              ? "border-emerald-200 bg-emerald-50/70"
              : "border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 to-slate-900/40"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={`font-bold ${isLight ? "text-emerald-800" : "text-emerald-400"}`}>
              Realized Commission (YTD)
            </span>
            <CheckCircle2 className={`h-4 w-4 ${isLight ? "text-emerald-600" : "text-emerald-400"}`} />
          </div>
          <div className={`text-2xl font-black ${isLight ? "text-emerald-900" : "text-emerald-300"}`}>
            {formatAud(summary.totalRealizedCommissionYTD)}
          </div>
          <span className={`text-[11px] mt-1 block ${isLight ? "text-emerald-700" : "text-emerald-400/80"}`}>
            Earned from Tender &amp; Contract Milestones
          </span>
        </div>

        {/* Card 3: Pending Commission Pipeline */}
        <div
          className={`p-4 rounded-2xl border shadow-md ${
            isLight
              ? "border-cyan-200 bg-cyan-50/70"
              : "border-cyan-500/30 bg-gradient-to-b from-cyan-950/40 to-slate-900/40"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={`font-bold ${isLight ? "text-cyan-800" : "text-cyan-400"}`}>
              Pending Pipeline Commission
            </span>
            <Clock className={`h-4 w-4 ${isLight ? "text-cyan-600" : "text-cyan-400"}`} />
          </div>
          <div className={`text-2xl font-black ${isLight ? "text-cyan-900" : "text-cyan-300"}`}>
            {formatAud(summary.totalPendingCommissionPipeline)}
          </div>
          <span className={`text-[11px] mt-1 block ${isLight ? "text-cyan-700" : "text-cyan-400/80"}`}>
            Across {summary.totalDealsCount} Active Deals
          </span>
        </div>

        {/* Card 4: Total Remuneration Forecast */}
        <div
          className={`p-4 rounded-2xl border shadow-lg relative overflow-hidden ${
            isLight
              ? "border-amber-300 bg-amber-50/90"
              : "border-amber-500/40 bg-gradient-to-b from-amber-950/50 to-slate-900/60"
          }`}
        >
          <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs mb-2">
            <span className={`font-bold flex items-center gap-1 ${isLight ? "text-amber-900" : "text-amber-400"}`}>
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Projected Total Remuneration
            </span>
            <TrendingUp className={`h-4 w-4 ${isLight ? "text-amber-700" : "text-amber-400"}`} />
          </div>
          <div className={`text-2xl font-black ${isLight ? "text-amber-950" : "text-amber-300"}`}>
            {formatAud(
              (currentSettings.baseSalaryYearly || 75000) +
                summary.totalRealizedCommissionYTD +
                summary.totalPendingCommissionPipeline * 0.65
            )}
          </div>
          <span className={`text-[11px] mt-1 block font-medium ${isLight ? "text-amber-800" : "text-amber-400/90"}`}>
            Base Salary + Realized + 65% Pipeline
          </span>
        </div>
      </div>

      {/* 12-Month Performance & Remuneration Matrix (Jan - Dec) */}
      <div
        className={`rounded-2xl border overflow-hidden shadow-xl ${
          isLight ? "bg-white border-slate-200" : "bg-slate-900/80 border-slate-800 backdrop-blur-xl"
        }`}
      >
        <div
          className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
            isLight ? "bg-slate-50/80 border-slate-200" : "bg-slate-950/60 border-slate-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-500" />
            <div>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}>
                12-Month Performance &amp; Remuneration Matrix ({activeYear})
              </h3>
              <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                Monthly breakdown of Leads, ATPs, Contracts, Commission, Base Salary, and Total Remuneration
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`px-2.5 py-1 rounded-full font-bold text-[11px] border ${
                isLight
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-amber-950/60 text-amber-300 border-amber-800/60"
              }`}
            >
              Base Salary: {formatAud(currentSettings.baseSalaryYearly || 75000)}/yr
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                isLight
                  ? "bg-slate-100/90 border-slate-200 text-slate-700"
                  : "bg-slate-950/90 border-slate-800 text-slate-300"
              }`}
            >
              <tr>
                <th className="py-3 px-4">Month</th>
                <th className="py-3 px-4 text-center">Inbound Leads</th>
                <th className="py-3 px-4 text-center">Tender Accepted (ATP)</th>
                <th className="py-3 px-4 text-center">Contracts Signed</th>
                <th className="py-3 px-4 text-right">Commission Earned</th>
                <th className="py-3 px-4 text-right">Base Salary</th>
                <th className="py-3 px-4 text-right font-bold">Total Remuneration</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? "divide-slate-200 text-slate-700" : "divide-slate-800/80 text-slate-200"}`}>
              {monthlyMatrixRows.map((row) => (
                <tr
                  key={row.monthName}
                  className={`transition-colors ${
                    row.isCurrentMonth
                      ? isLight
                        ? "bg-amber-50/70 font-semibold"
                        : "bg-amber-500/10 font-semibold"
                      : isLight
                      ? "hover:bg-slate-50"
                      : "hover:bg-slate-800/40"
                  }`}
                >
                  <td className="py-3 px-4 font-bold flex items-center gap-2">
                    <span className={isLight ? "text-slate-900" : "text-white"}>{row.monthName}</span>
                    {row.isCurrentMonth && (
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                        Current
                      </span>
                    )}
                  </td>

                  {/* Leads Count */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold border ${
                        row.leadsCount > 0
                          ? isLight
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-blue-950/70 text-blue-300 border-blue-800"
                          : isLight
                          ? "text-slate-400 bg-slate-100 border-slate-200"
                          : "text-slate-600 bg-slate-900 border-slate-800"
                      }`}
                    >
                      {row.leadsCount}
                    </span>
                  </td>

                  {/* ATP Count */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold border ${
                        row.atpCount > 0
                          ? isLight
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : "bg-emerald-950/70 text-emerald-300 border-emerald-800"
                          : isLight
                          ? "text-slate-400 bg-slate-100 border-slate-200"
                          : "text-slate-600 bg-slate-900 border-slate-800"
                      }`}
                    >
                      {row.atpCount}
                    </span>
                  </td>

                  {/* Contracts Signed */}
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full text-xs font-bold border ${
                        row.contractCount > 0
                          ? isLight
                            ? "bg-cyan-100 text-cyan-800 border-cyan-300"
                            : "bg-cyan-950/70 text-cyan-300 border-cyan-800"
                          : isLight
                          ? "text-slate-400 bg-slate-100 border-slate-200"
                          : "text-slate-600 bg-slate-900 border-slate-800"
                      }`}
                    >
                      {row.contractCount}
                    </span>
                  </td>

                  {/* Commission Earned */}
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    <span
                      className={
                        row.commissionEarned > 0
                          ? isLight
                            ? "text-amber-700"
                            : "text-amber-400"
                          : isLight
                          ? "text-slate-400"
                          : "text-slate-600"
                      }
                    >
                      {row.commissionEarned > 0 ? formatAud(row.commissionEarned) : "—"}
                    </span>
                  </td>

                  {/* Base Salary */}
                  <td className={`py-3 px-4 text-right font-mono ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    {formatAud(row.baseSalary)}
                  </td>

                  {/* Total Remuneration */}
                  <td className="py-3 px-4 text-right font-mono font-bold">
                    <span
                      className={
                        isLight
                          ? row.commissionEarned > 0
                            ? "text-emerald-700 font-extrabold"
                            : "text-slate-900"
                          : row.commissionEarned > 0
                          ? "text-emerald-300 font-extrabold"
                          : "text-slate-100"
                      }
                    >
                      {formatAud(row.totalRemuneration)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>

            {/* YTD Totals Footer */}
            <tfoot
              className={`border-t-2 font-bold ${
                isLight
                  ? "border-slate-300 bg-slate-100/95 text-slate-900"
                  : "border-slate-700 bg-slate-950 text-white"
              }`}
            >
              <tr>
                <td className="py-3.5 px-4 font-black uppercase tracking-wider text-xs">
                  Full Year / YTD Totals
                </td>
                <td className="py-3.5 px-4 text-center font-mono">
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40">
                    {ytdTotals.leads}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center font-mono">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    {ytdTotals.atps}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-center font-mono">
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                    {ytdTotals.contracts}
                  </span>
                </td>
                <td
                  className={`py-3.5 px-4 text-right font-mono font-black ${
                    isLight ? "text-amber-700" : "text-amber-400"
                  }`}
                >
                  {formatAud(ytdTotals.commissions)}
                </td>
                <td className={`py-3.5 px-4 text-right font-mono ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  {formatAud(ytdTotals.baseSalary)}
                </td>
                <td
                  className={`py-3.5 px-4 text-right font-mono font-black text-sm ${
                    isLight ? "text-emerald-800" : "text-emerald-300"
                  }`}
                >
                  {formatAud(ytdTotals.totalRemuneration)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Individual Deals Commission Breakdown Table */}
      <div
        className={`rounded-2xl border overflow-hidden shadow-2xl ${
          isLight ? "bg-white border-slate-200" : "bg-slate-900/80 border-slate-800 backdrop-blur-xl"
        }`}
      >
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-500" />
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}>
              Individual Deal Milestone Payouts ({summary.commissionRatePct}% Formula)
            </h3>
          </div>
          <span className={`text-xs ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            {summary.deals.length} Active Deals for {summary.consultantName}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                isLight
                  ? "bg-slate-100 border-slate-200 text-slate-700"
                  : "bg-slate-950/80 border-slate-800 text-slate-400"
              }`}
            >
              <tr>
                <th className="py-3 px-4">Client / Deal</th>
                <th className="py-3 px-4 text-right">Tender / Contract Value</th>
                <th className="py-3 px-4 text-right">Total Comms ({summary.commissionRatePct}%)</th>
                <th className="py-3 px-4 text-center">Tranche 1 (50% @ Tender ATP)</th>
                <th className="py-3 px-4 text-center">Tranche 2 (50% @ Contract 5%)</th>
                <th className="py-3 px-4 text-right">Payout Status</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? "divide-slate-200 text-slate-700" : "divide-slate-800/80 text-slate-200"}`}>
              {summary.deals.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`py-8 text-center text-xs italic ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                    No active deals found for {summary.consultantName}.
                  </td>
                </tr>
              ) : (
                summary.deals.map((deal) => (
                  <tr
                    key={deal.leadId}
                    className={`transition-colors ${isLight ? "hover:bg-slate-50" : "hover:bg-slate-800/40"}`}
                  >
                    <td className={`py-3.5 px-4 font-bold ${isLight ? "text-slate-900" : "text-white"}`}>
                      {deal.clientName}
                      <span className={`block text-[10px] font-normal ${isLight ? "text-slate-500" : "text-slate-500"}`}>
                        Stage: {deal.stage.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Tender / Contract Value */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold">
                      {deal.hasTenderPrice ? (
                        <>
                          <span className={isLight ? "text-slate-900" : "text-white"}>
                            {formatAud(deal.dealValueIncGst)}
                          </span>
                          <span className={`block text-[10px] ${isLight ? "text-slate-500" : "text-slate-500"}`}>
                            Ex GST: {formatAud(deal.dealValueExGst)}
                          </span>
                        </>
                      ) : (
                        <span className={`italic text-[11px] ${isLight ? "text-slate-400" : "text-slate-500"}`}>
                          Pending Tender Received
                        </span>
                      )}
                    </td>

                    {/* Total Comms */}
                    <td className={`py-3.5 px-4 text-right font-mono font-bold ${isLight ? "text-amber-700" : "text-amber-400"}`}>
                      {deal.hasTenderPrice ? (
                        formatAud(deal.grossCommission)
                      ) : (
                        <span className={isLight ? "text-slate-400" : "text-slate-600"}>—</span>
                      )}
                    </td>

                    {/* Tranche 1 (50% @ Tender ATP) */}
                    <td className="py-3.5 px-4 text-center">
                      {deal.hasTenderPrice ? (
                        deal.tranche1Eligible ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isLight
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-emerald-950/80 text-emerald-300 border-emerald-800/80"
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {formatAud(deal.tranche1Amount)} (Paid)
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border ${
                              isLight
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : "bg-slate-900 text-slate-400 border-slate-800"
                            }`}
                          >
                            <Clock className={`h-3 w-3 ${isLight ? "text-slate-400" : "text-slate-500"}`} />
                            {formatAud(deal.tranche1Amount)} (Pending ATP)
                          </span>
                        )
                      ) : (
                        <span className={`text-[11px] ${isLight ? "text-slate-400" : "text-slate-600"}`}>—</span>
                      )}
                    </td>

                    {/* Tranche 2 (50% @ Contract 5%) */}
                    <td className="py-3.5 px-4 text-center">
                      {deal.hasTenderPrice ? (
                        deal.tranche2Eligible ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              isLight
                                ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                                : "bg-emerald-950/80 text-emerald-300 border-emerald-800/80"
                            }`}
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            {formatAud(deal.tranche2Amount)} (Paid)
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border ${
                              isLight
                                ? "bg-slate-100 text-slate-600 border-slate-200"
                                : "bg-slate-900 text-slate-400 border-slate-800"
                            }`}
                          >
                            <Clock className={`h-3 w-3 ${isLight ? "text-slate-400" : "text-slate-500"}`} />
                            {formatAud(deal.tranche2Amount)} (Pending Contract)
                          </span>
                        )
                      ) : (
                        <span className={`text-[11px] ${isLight ? "text-slate-400" : "text-slate-600"}`}>—</span>
                      )}
                    </td>

                    {/* Realized vs Pending Status */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      {deal.hasTenderPrice ? (
                        <>
                          <span
                            className={`font-bold block ${
                              isLight ? "text-emerald-700" : "text-emerald-400"
                            }`}
                          >
                            +{formatAud(deal.realizedCommission)}
                          </span>
                          {deal.pendingCommission > 0 && (
                            <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-500"}`}>
                              {formatAud(deal.pendingCommission)} pending
                            </span>
                          )}
                        </>
                      ) : (
                        <span className={`text-[11px] ${isLight ? "text-slate-400" : "text-slate-600"}`}>
                          Tender Awaiting
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

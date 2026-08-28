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
} from "lucide-react";
import { CrmLead, HUDSON_CONSULTANTS } from "@/lib/crm/crmTypes";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

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

  // Private salary & commission editor
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentSettings, setCurrentSettings] = useState(() =>
    loadConsultantSettings(selectedConsultantId)
  );

  const summary = calculateConsultantEarnings(selectedConsultantId, leads);

  const formatAud = (val: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(val);

  const handleSavePrivateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    saveConsultantSettings(selectedConsultantId, currentSettings);
    toast.success("Private salary & commission structure updated! ✓");
    setIsSettingsOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Consultant Header & Private Remuneration Configuration */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border ${
        isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-900/90 border-slate-800 backdrop-blur-xl shadow-xl"
      }`}>
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">
                Consultant Remuneration &amp; Commission Portal
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/60 flex items-center gap-1">
                <Lock className="h-3 w-3" /> Private to {summary.consultantName}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              50% Commission paid at Tender Acceptance (ATP) &bull; 50% paid at Building Contract (5% deposit).
            </p>
          </div>
        </div>

        {/* Consultant Switcher & Settings Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-[200px]">
            <UserCheck className="h-4 w-4 text-slate-400" />
            <Select
              value={selectedConsultantId}
              onValueChange={(id) => {
                onSelectConsultant(id);
                setCurrentSettings(loadConsultantSettings(id));
              }}
            >
              <SelectTrigger className="border-slate-800 bg-slate-950 text-xs font-bold text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
                {HUDSON_CONSULTANTS.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs font-semibold">
                    {c.name} ({c.displayOffice})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="border-slate-800 bg-slate-950 text-slate-300 hover:text-white text-xs gap-1"
          >
            <Settings className="h-3.5 w-3.5" />
            <span>Customize Rate</span>
          </Button>
        </div>
      </div>

      {/* Private Remuneration Config Dropdown */}
      {isSettingsOpen && (
        <form
          onSubmit={handleSavePrivateSettings}
          className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/40 space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Private Remuneration Structure &bull; {summary.consultantName}
            </span>
            <span className="text-[11px] text-slate-400">Only visible to your login</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Annual Base Salary ($ AUD)</Label>
              <Input
                type="number"
                value={currentSettings.baseSalaryYearly}
                onChange={(e) =>
                  setCurrentSettings({
                    ...currentSettings,
                    baseSalaryYearly: Number(e.target.value) || 0,
                  })
                }
                placeholder="75000"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-white font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-300">Commission Rate (%) per Contract Value</Label>
              <Input
                type="number"
                step="0.05"
                value={currentSettings.commissionRatePct}
                onChange={(e) =>
                  setCurrentSettings({
                    ...currentSettings,
                    commissionRatePct: Number(e.target.value) || 0,
                  })
                }
                placeholder="2.25"
                className="h-9 text-xs border-slate-800 bg-slate-950 text-emerald-400 font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSettingsOpen(false)}
              className="text-xs text-slate-400"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1"
            >
              <Save className="h-3.5 w-3.5" /> Save Remuneration Rate
            </Button>
          </div>
        </form>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Base Salary */}
        <div className="p-4 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-900/40 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Annual Base Salary</span>
            <Building className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-2xl font-black text-white">
            {formatAud(summary.baseSalaryYearly)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {formatAud(summary.baseSalaryMonthly)} / month gross
          </span>
        </div>

        {/* Card 2: Realized Commission YTD */}
        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/40 to-slate-900/40 shadow-lg">
          <div className="flex items-center justify-between text-xs text-emerald-400 mb-2">
            <span className="font-bold">Realized Commission (YTD)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">
            {formatAud(summary.totalRealizedCommissionYTD)}
          </div>
          <span className="text-[11px] text-emerald-400/80 mt-1 block">
            Earned from Tender &amp; Contract Milestones
          </span>
        </div>

        {/* Card 3: Pending Commission Pipeline */}
        <div className="p-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/40 to-slate-900/40 shadow-lg">
          <div className="flex items-center justify-between text-xs text-cyan-400 mb-2">
            <span className="font-bold">Pending Pipeline Commission</span>
            <Clock className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-300">
            {formatAud(summary.totalPendingCommissionPipeline)}
          </div>
          <span className="text-[11px] text-cyan-400/80 mt-1 block">
            Across Active Tender &amp; Contract Deals
          </span>
        </div>

        {/* Card 4: Projected Annual Total */}
        <div className="p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-950/50 to-slate-900/60 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-amber-400 mb-2">
            <span className="font-bold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Projected Total Remuneration
            </span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">
            {formatAud(summary.projectedAnnualSalary)}
          </div>
          <span className="text-[11px] text-amber-400/90 mt-1 block font-medium">
            Base + Commissions (Est. Net: {formatAud(summary.estimatedNetTakeHomeYTD)})
          </span>
        </div>
      </div>

      {/* Individual Deals Commission Breakdown Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Individual Deal Milestone Payouts ({summary.commissionRatePct}% Formula)
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            {summary.deals.length} Active Deals for {summary.consultantName}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Client / Deal</th>
                <th className="py-3 px-4 text-right">Tender / Contract Value</th>
                <th className="py-3 px-4 text-right">Total Comms ({summary.commissionRatePct}%)</th>
                <th className="py-3 px-4 text-center">Tranche 1 (50% @ Tender ATP)</th>
                <th className="py-3 px-4 text-center">Tranche 2 (50% @ Contract 5%)</th>
                <th className="py-3 px-4 text-right">Payout Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {summary.deals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500 italic">
                    No active deals found for {summary.consultantName}.
                  </td>
                </tr>
              ) : (
                summary.deals.map((deal) => (
                  <tr key={deal.leadId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      {deal.clientName}
                      <span className="block text-[10px] text-slate-500 font-normal">
                        Stage: {deal.stage.replace(/_/g, " ")}
                      </span>
                    </td>

                    {/* Tender / Contract Value */}
                    <td className="py-3.5 px-4 text-right font-mono font-semibold">
                      {deal.hasTenderPrice ? (
                        <>
                          <span className="text-white">{formatAud(deal.dealValueIncGst)}</span>
                          <span className="block text-[10px] text-slate-500">
                            Ex GST: {formatAud(deal.dealValueExGst)}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">
                          Pending Tender Received
                        </span>
                      )}
                    </td>

                    {/* Total Comms */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                      {deal.hasTenderPrice ? (
                        formatAud(deal.grossCommission)
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    {/* Tranche 1 (50% @ Tender ATP) */}
                    <td className="py-3.5 px-4 text-center">
                      {deal.hasTenderPrice ? (
                        deal.tranche1Eligible ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[11px] font-bold">
                            <CheckCircle2 className="h-3 w-3" />
                            {formatAud(deal.tranche1Amount)} (Paid)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 text-[11px]">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {formatAud(deal.tranche1Amount)} (Pending ATP)
                          </span>
                        )
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Tranche 2 (50% @ Contract 5%) */}
                    <td className="py-3.5 px-4 text-center">
                      {deal.hasTenderPrice ? (
                        deal.tranche2Eligible ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[11px] font-bold">
                            <CheckCircle2 className="h-3 w-3" />
                            {formatAud(deal.tranche2Amount)} (Paid)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 text-[11px]">
                            <Clock className="h-3 w-3 text-slate-500" />
                            {formatAud(deal.tranche2Amount)} (Pending Contract)
                          </span>
                        )
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Realized vs Pending Status */}
                    <td className="py-3.5 px-4 text-right font-mono">
                      {deal.hasTenderPrice ? (
                        <>
                          <span className="text-emerald-400 font-bold block">
                            +{formatAud(deal.realizedCommission)}
                          </span>
                          {deal.pendingCommission > 0 && (
                            <span className="text-slate-500 text-[10px]">
                              {formatAud(deal.pendingCommission)} pending
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-600 text-[11px]">Tender Awaiting</span>
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

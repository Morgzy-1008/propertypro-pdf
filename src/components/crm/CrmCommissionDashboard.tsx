import React from "react";
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
} from "lucide-react";
import { CrmLead, HUDSON_CONSULTANTS } from "@/lib/crm/crmTypes";
import {
  calculateConsultantEarnings,
  ConsultantEarningsSummary,
} from "@/lib/commission/commissionCalculator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CrmCommissionDashboardProps {
  leads: CrmLead[];
  selectedConsultantId: string;
  onSelectConsultant: (id: string) => void;
}

export function CrmCommissionDashboard({
  leads,
  selectedConsultantId,
  onSelectConsultant,
}: CrmCommissionDashboardProps) {
  const summary = calculateConsultantEarnings(selectedConsultantId, leads);

  const formatAud = (val: number) =>
    new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="space-y-6">
      {/* Consultant Switcher & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight">
                Consultant Commission &amp; Salary Forecasting Engine
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800/60">
                2.25% Net Split
              </span>
            </div>
            <p className="text-xs text-slate-400">
              $75,000 Base Salary + 2.25% Contract Value (50% at Tender Acceptance &bull; 50% at Contract 5% Deposit)
            </p>
          </div>
        </div>

        {/* Consultant Switcher Dropdown */}
        <div className="flex items-center gap-2 min-w-[240px]">
          <UserCheck className="h-4 w-4 text-slate-400" />
          <Select value={selectedConsultantId} onValueChange={onSelectConsultant}>
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
      </div>

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
            Across {summary.totalDealsCount} Active Deals ({formatAud(summary.totalPipelineDealValue)})
          </span>
        </div>

        {/* Card 4: Projected Annual Salary */}
        <div className="p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-950/50 to-slate-900/60 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-24 w-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-amber-400 mb-2">
            <span className="font-bold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Projected Total Salary
            </span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-300">
            {formatAud(summary.projectedAnnualSalary)}
          </div>
          <span className="text-[11px] text-amber-400/90 mt-1 block font-medium">
            Base + Commissions (Est. Net Take Home: {formatAud(summary.estimatedNetTakeHomeYTD)})
          </span>
        </div>
      </div>

      {/* Individual Deals Commission Breakdown Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Individual Deal Milestone Payouts (2.25% Formula)
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
                <th className="py-3 px-4 text-right">Contract Value</th>
                <th className="py-3 px-4 text-right">Total Comms (2.25%)</th>
                <th className="py-3 px-4 text-center">Tranche 1 (50% @ Tender ATP)</th>
                <th className="py-3 px-4 text-center">Tranche 2 (50% @ Contract 5%)</th>
                <th className="py-3 px-4 text-right">Payout Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-200">
              {summary.deals.map((deal) => (
                <tr key={deal.leadId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {deal.clientName}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold">
                    {formatAud(deal.dealValueIncGst)}
                    <span className="block text-[10px] text-slate-500">
                      Ex GST: {formatAud(deal.dealValueExGst)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                    {formatAud(deal.grossCommission)}
                  </td>
                  {/* Tranche 1 */}
                  <td className="py-3.5 px-4 text-center">
                    {deal.tranche1Eligible ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[11px] font-bold">
                        <CheckCircle2 className="h-3 w-3" />
                        {formatAud(deal.tranche1Amount)} (Paid)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 text-[11px]">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {formatAud(deal.tranche1Amount)} (Pending ATP)
                      </span>
                    )}
                  </td>
                  {/* Tranche 2 */}
                  <td className="py-3.5 px-4 text-center">
                    {deal.tranche2Eligible ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/80 text-[11px] font-bold">
                        <CheckCircle2 className="h-3 w-3" />
                        {formatAud(deal.tranche2Amount)} (Paid)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 text-[11px]">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {formatAud(deal.tranche2Amount)} (Pending Contract)
                      </span>
                    )}
                  </td>
                  {/* Realized vs Pending */}
                  <td className="py-3.5 px-4 text-right font-mono">
                    <span className="text-emerald-400 font-bold block">
                      +{formatAud(deal.realizedCommission)}
                    </span>
                    {deal.pendingCommission > 0 && (
                      <span className="text-slate-500 text-[10px]">
                        {formatAud(deal.pendingCommission)} pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

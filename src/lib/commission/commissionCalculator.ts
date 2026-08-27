import { CrmLead, HUDSON_CONSULTANTS } from "../crm/crmTypes";

export interface SingleDealCommission {
  leadId: string;
  clientName: string;
  dealValueIncGst: number;
  dealValueExGst: number;
  grossCommission: number; // 2.25% of Ex GST
  
  // Tranche 1: 50% at Tender Acceptance ($1,650 fee)
  tranche1Amount: number;
  tranche1Eligible: boolean; // isAtpSigned && atpFeePaid
  tranche1PaidDate?: string;

  // Tranche 2: 50% at Building Contract 5% Deposit
  tranche2Amount: number;
  tranche2Eligible: boolean; // isContractSigned && contractDepositPaid
  tranche2PaidDate?: string;

  // Total Realized vs Pending
  realizedCommission: number;
  pendingCommission: number;
}

export interface ConsultantEarningsSummary {
  consultantId: string;
  consultantName: string;
  baseSalaryYearly: number; // $75,000
  baseSalaryMonthly: number; // $6,250
  
  // Commission Totals
  totalDealsCount: number;
  totalPipelineDealValue: number;
  totalRealizedCommissionYTD: number;
  totalPendingCommissionPipeline: number;
  
  // Total Remuneration
  projectedAnnualSalary: number; // $75k + Realized + Weighted Pipeline
  
  // Tax & Super Estimates (AU standards: 11.5% Super, ~30% marginal tax)
  estimatedSuperContribution: number;
  estimatedTaxWithheld: number;
  estimatedNetTakeHomeYTD: number;

  deals: SingleDealCommission[];
}

/**
 * Calculates 2.25% commission breakdown with 50/50 split at Tender ATP and Contract.
 */
export function calculateDealCommission(lead: CrmLead): SingleDealCommission {
  const dealValueIncGst = lead.totalEstimatedDealValue || 0;
  const dealValueExGst = Number((dealValueIncGst / 1.1).toFixed(2));
  const grossCommission = Number((dealValueExGst * 0.0225).toFixed(2)); // 2.25%

  const tranche1Amount = Number((grossCommission * 0.5).toFixed(2));
  const tranche2Amount = Number((grossCommission - tranche1Amount).toFixed(2));

  // Tranche 1 eligible when stage reaches ATP Signed or later
  const isTranche1Eligible =
    lead.isAtpSigned ||
    lead.atpFeePaid ||
    [
      "atp_signed_paid",
      "drafting_working_drawings",
      "contract_signed",
      "under_construction",
    ].includes(lead.stage);

  // Tranche 2 eligible when stage reaches Contract Signed or later
  const isTranche2Eligible =
    lead.isContractSigned ||
    lead.contractDepositPaid ||
    ["contract_signed", "under_construction"].includes(lead.stage);

  let realized = 0;
  let pending = 0;

  if (isTranche1Eligible) realized += tranche1Amount;
  else pending += tranche1Amount;

  if (isTranche2Eligible) realized += tranche2Amount;
  else pending += tranche2Amount;

  return {
    leadId: lead.id,
    clientName: lead.clientName,
    dealValueIncGst,
    dealValueExGst,
    grossCommission,
    tranche1Amount,
    tranche1Eligible: isTranche1Eligible,
    tranche1PaidDate: lead.atpSignedDate,
    tranche2Amount,
    tranche2Eligible: isTranche2Eligible,
    tranche2PaidDate: lead.contractSignedDate,
    realizedCommission: realized,
    pendingCommission: pending,
  };
}

/**
 * Calculates annual salary and payout forecasts for a specific consultant.
 */
export function calculateConsultantEarnings(
  consultantId: string,
  leads: CrmLead[]
): ConsultantEarningsSummary {
  const consultant =
    HUDSON_CONSULTANTS.find((c) => c.id === consultantId) ||
    HUDSON_CONSULTANTS[0];

  const consultantLeads = leads.filter(
    (l) => l.assignedConsultantId === consultantId && l.stage !== "lost"
  );

  const deals = consultantLeads.map(calculateDealCommission);

  const totalDealsCount = deals.length;
  const totalPipelineDealValue = deals.reduce((acc, d) => acc + d.dealValueIncGst, 0);
  const totalRealizedCommissionYTD = deals.reduce((acc, d) => acc + d.realizedCommission, 0);
  const totalPendingCommissionPipeline = deals.reduce((acc, d) => acc + d.pendingCommission, 0);

  // 70% confidence weighting on pending pipeline
  const projectedAnnualSalary = Number(
    (
      consultant.baseSalaryYearly +
      totalRealizedCommissionYTD +
      totalPendingCommissionPipeline * 0.65
    ).toFixed(2)
  );

  const totalGrossYTD = consultant.baseSalaryYearly + totalRealizedCommissionYTD;
  const estimatedSuperContribution = Number((totalGrossYTD * 0.115).toFixed(2));
  const estimatedTaxWithheld = Number((totalGrossYTD * 0.28).toFixed(2));
  const estimatedNetTakeHomeYTD = Number(
    (totalGrossYTD - estimatedTaxWithheld).toFixed(2)
  );

  return {
    consultantId: consultant.id,
    consultantName: consultant.name,
    baseSalaryYearly: consultant.baseSalaryYearly,
    baseSalaryMonthly: consultant.baseSalaryYearly / 12,
    totalDealsCount,
    totalPipelineDealValue,
    totalRealizedCommissionYTD,
    totalPendingCommissionPipeline,
    projectedAnnualSalary,
    estimatedSuperContribution,
    estimatedTaxWithheld,
    estimatedNetTakeHomeYTD,
    deals,
  };
}

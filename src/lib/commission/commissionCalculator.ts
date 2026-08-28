import { CrmLead, HUDSON_CONSULTANTS } from "../crm/crmTypes";
import { loadConsultantSettings } from "../crm/crmStorage";

export interface SingleDealCommission {
  leadId: string;
  clientName: string;
  stage: string;
  hasTenderPrice: boolean;
  dealValueIncGst: number;
  dealValueExGst: number;
  grossCommission: number;
  
  // Tranche 1: 50% at Tender Acceptance ($1,650 fee / ATP Signed)
  tranche1Amount: number;
  tranche1Eligible: boolean;
  tranche1PaidDate?: string;

  // Tranche 2: 50% at Building Contract Signing (5% deposit paid)
  tranche2Amount: number;
  tranche2Eligible: boolean;
  tranche2PaidDate?: string;

  // Realized vs Pending
  realizedCommission: number;
  pendingCommission: number;
}

export interface ConsultantEarningsSummary {
  consultantId: string;
  consultantName: string;
  baseSalaryYearly: number;
  baseSalaryMonthly: number;
  commissionRatePct: number;
  
  // Commission Totals
  totalDealsCount: number;
  totalPipelineDealValue: number;
  totalRealizedCommissionYTD: number;
  totalPendingCommissionPipeline: number;
  
  // Total Remuneration
  projectedAnnualSalary: number;
  
  // Tax & Super Estimates
  estimatedSuperContribution: number;
  estimatedTaxWithheld: number;
  estimatedNetTakeHomeYTD: number;

  deals: SingleDealCommission[];
}

/**
 * Calculates deal commission breakdown with 50/50 split at Tender ATP and Contract.
 * NOTE: Clients won't have a tender price figure until they pass Tender Received (or tenderPrice is explicitly set).
 */
export function calculateDealCommission(
  lead: CrmLead,
  commissionRatePct: number = 2.25
): SingleDealCommission {
  const hasReachedTenderReceived = [
    "tender_received",
    "tender_accepted",
    "contract_signed",
    "under_construction",
  ].includes(lead.stage);

  const hasTenderPrice = !!(lead.tenderPrice && lead.tenderPrice > 0) || hasReachedTenderReceived;

  // If tender received or price provided, use that; otherwise 0 for commission calculations
  const dealValueIncGst = hasTenderPrice
    ? lead.tenderPrice || lead.totalEstimatedDealValue || 0
    : 0;

  const dealValueExGst = hasTenderPrice ? Number((dealValueIncGst / 1.1).toFixed(2)) : 0;
  const rateFactor = commissionRatePct / 100;
  const grossCommission = hasTenderPrice ? Number((dealValueExGst * rateFactor).toFixed(2)) : 0;

  const tranche1Amount = Number((grossCommission * 0.5).toFixed(2));
  const tranche2Amount = Number((grossCommission - tranche1Amount).toFixed(2));

  // Tranche 1: Paid at Tender Acceptance (ATP Signed)
  const isTranche1Eligible =
    lead.isAtpSigned ||
    lead.atpFeePaid ||
    ["tender_accepted", "contract_signed", "under_construction"].includes(lead.stage);

  // Tranche 2: Paid at Contract Signing (5% deposit)
  const isTranche2Eligible =
    lead.isContractSigned ||
    lead.contractDepositPaid ||
    ["contract_signed", "under_construction"].includes(lead.stage);

  let realized = 0;
  let pending = 0;

  if (hasTenderPrice) {
    if (isTranche1Eligible) realized += tranche1Amount;
    else pending += tranche1Amount;

    if (isTranche2Eligible) realized += tranche2Amount;
    else pending += tranche2Amount;
  }

  return {
    leadId: lead.id,
    clientName: lead.clientName,
    stage: lead.stage,
    hasTenderPrice,
    dealValueIncGst,
    dealValueExGst,
    grossCommission,
    tranche1Amount,
    tranche1Eligible: isTranche1Eligible && hasTenderPrice,
    tranche1PaidDate: lead.atpSignedDate,
    tranche2Amount,
    tranche2Eligible: isTranche2Eligible && hasTenderPrice,
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

  const privateSettings = loadConsultantSettings(consultant.id);
  const baseSalaryYearly = privateSettings.baseSalaryYearly || consultant.baseSalaryYearly || 75000;
  const commissionRatePct = privateSettings.commissionRatePct || consultant.commissionRatePct || 2.25;

  const consultantLeads = leads.filter(
    (l) => l.assignedConsultantId === consultantId && l.stage !== "sale_not_proceeding" && l.stage !== "no_contact"
  );

  const deals = consultantLeads.map((l) => calculateDealCommission(l, commissionRatePct));

  const totalDealsCount = deals.length;
  const totalPipelineDealValue = deals.reduce((acc, d) => acc + (d.hasTenderPrice ? d.dealValueIncGst : 0), 0);
  const totalRealizedCommissionYTD = deals.reduce((acc, d) => acc + d.realizedCommission, 0);
  const totalPendingCommissionPipeline = deals.reduce((acc, d) => acc + d.pendingCommission, 0);

  const projectedAnnualSalary = Number(
    (
      baseSalaryYearly +
      totalRealizedCommissionYTD +
      totalPendingCommissionPipeline * 0.65
    ).toFixed(2)
  );

  const totalGrossYTD = baseSalaryYearly + totalRealizedCommissionYTD;
  const estimatedSuperContribution = Number((totalGrossYTD * 0.115).toFixed(2));
  const estimatedTaxWithheld = Number((totalGrossYTD * 0.28).toFixed(2));
  const estimatedNetTakeHomeYTD = Number(
    (totalGrossYTD - estimatedTaxWithheld).toFixed(2)
  );

  return {
    consultantId: consultant.id,
    consultantName: consultant.name,
    baseSalaryYearly,
    baseSalaryMonthly: baseSalaryYearly / 12,
    commissionRatePct,
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

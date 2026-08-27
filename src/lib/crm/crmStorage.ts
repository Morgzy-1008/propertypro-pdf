import { CrmLead, CrmStageId } from "./crmTypes";

const CRM_STORAGE_KEY = "hudson_crm_leads_v1";

export const INITIAL_DEMO_LEADS: CrmLead[] = [
  {
    id: "lead_hales_001",
    clientName: "Jordan Hales",
    email: "jordan.hales@gmail.com",
    mobile: "0412 888 999",
    targetEstate: "Providence Estate",
    suburb: "South Ripley",
    lotNumber: "719",
    landStatus: "Have Land (Registered)",
    landBudget: 320000,
    preferredDesign: "Amber 21",
    facadeName: "Hampton Executive",
    housingType: "Single Storey",
    totalEstimatedDealValue: 467789,
    stage: "atp_signed_paid",
    assignedConsultantId: "morgan_hales",
    leadSource: "Display Home Kiosk",
    notes: "Extended family living & larger alfresco. $1,650 fee paid via PayID (Ref: HALES-8841).",
    linkedQuoteNumber: "Q-2026-8841",
    linkedTenderSubmissionNumber: "TR-2026-8841",
    isAtpSigned: true,
    atpFeePaid: true,
    atpSignedDate: "27/08/2026",
    isContractSigned: false,
    contractDepositPaid: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date().toISOString(),
  },
  {
    id: "lead_mitchell_002",
    clientName: "Nathan & Sarah Mitchell",
    email: "nathan.mitchell@gmail.com",
    mobile: "0417 555 123",
    secondaryCustomerName: "Sarah Mitchell",
    secondaryCustomerMobile: "0417 555 124",
    targetEstate: "Flagstone Estate",
    suburb: "Flagstone",
    lotNumber: "402",
    landStatus: "Have Land (Registered)",
    landBudget: 295000,
    preferredDesign: "Jasper 26",
    facadeName: "Modern Coastal",
    housingType: "Double Storey",
    totalEstimatedDealValue: 528400,
    stage: "contract_signed",
    assignedConsultantId: "morgan_hales",
    leadSource: "Website Inquiry",
    notes: "5% deposit received. Building contract fully executed. Pre-construction handover next week.",
    linkedQuoteNumber: "Q-2026-7732",
    linkedTenderSubmissionNumber: "TR-2026-7732",
    isAtpSigned: true,
    atpFeePaid: true,
    atpSignedDate: "10/08/2026",
    isContractSigned: true,
    contractDepositPaid: true,
    contractSignedDate: "24/08/2026",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date().toISOString(),
  },
  {
    id: "lead_vance_003",
    clientName: "Marcus Vance",
    email: "marcus.vance@investqld.com.au",
    mobile: "0422 111 444",
    targetEstate: "Yarrabilba",
    suburb: "Yarrabilba",
    lotNumber: "1104",
    landStatus: "Land Under Contract (Unregistered)",
    landBudget: 340000,
    preferredDesign: "Sapphire 29 Dual Living",
    facadeName: "Executive Metro",
    housingType: "Dual Living",
    totalEstimatedDealValue: 645000,
    stage: "estimate_sent",
    assignedConsultantId: "morgan_hales",
    leadSource: "Developer Land Partner",
    notes: "Investor package for high rental yield. Sent 5-page Estimate PDF. Follow up on Monday.",
    linkedQuoteNumber: "Q-2026-9014",
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date().toISOString(),
  },
  {
    id: "lead_cooper_004",
    clientName: "David & Emma Cooper",
    email: "david.cooper@hotmail.com",
    mobile: "0433 999 777",
    secondaryCustomerName: "Emma Cooper",
    targetEstate: "Springfield Rise",
    suburb: "Springfield",
    lotNumber: "55",
    landStatus: "Have Land (Registered)",
    landBudget: 360000,
    preferredDesign: "Coral 21 Modified",
    facadeName: "Hamptons Classic",
    housingType: "Single Storey",
    totalEstimatedDealValue: 442500,
    stage: "concept_plan",
    assignedConsultantId: "adrian",
    leadSource: "Display Home Kiosk",
    notes: "Custom floorplan modified in Foresight Concept Editor with 1200mm master bedroom extension.",
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date().toISOString(),
  },
  {
    id: "lead_thompson_005",
    clientName: "Liam Thompson",
    email: "liam.t@gmail.com",
    mobile: "0455 222 888",
    targetEstate: "Harmony",
    suburb: "Palmview",
    lotNumber: "89",
    landStatus: "Looking for Land",
    landBudget: 280000,
    preferredDesign: "Ruby 24",
    facadeName: "Modernist",
    housingType: "Single Storey",
    totalEstimatedDealValue: 485000,
    stage: "display_walkin",
    assignedConsultantId: "jesse",
    leadSource: "Display Home Kiosk",
    notes: "Walked into Springfield Central display home. Looking for 400m2 lot in Harmony stage 6.",
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date().toISOString(),
  },
];

export async function loadAllCrmLeads(): Promise<CrmLead[]> {
  try {
    const raw = localStorage.getItem(CRM_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // Return initial demo leads and seed
  try {
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_LEADS));
  } catch {}
  return INITIAL_DEMO_LEADS;
}

export async function saveCrmLead(lead: CrmLead): Promise<CrmLead[]> {
  const current = await loadAllCrmLeads();
  const existingIdx = current.findIndex((l) => l.id === lead.id);

  let updated: CrmLead[];
  const leadToSave = { ...lead, updatedAt: new Date().toISOString() };

  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = leadToSave;
  } else {
    updated = [leadToSave, ...current];
  }

  try {
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export async function updateCrmLeadStage(leadId: string, newStage: CrmStageId): Promise<CrmLead[]> {
  const current = await loadAllCrmLeads();
  const updated = current.map((lead) => {
    if (lead.id === leadId) {
      const isNowAtp = newStage === "atp_signed_paid" || newStage === "drafting_working_drawings" || newStage === "contract_signed";
      const isNowContract = newStage === "contract_signed" || newStage === "under_construction";
      return {
        ...lead,
        stage: newStage,
        isAtpSigned: isNowAtp ? true : lead.isAtpSigned,
        atpFeePaid: isNowAtp ? true : lead.atpFeePaid,
        atpSignedDate: isNowAtp && !lead.atpSignedDate ? new Date().toLocaleDateString("en-AU") : lead.atpSignedDate,
        isContractSigned: isNowContract ? true : lead.isContractSigned,
        contractDepositPaid: isNowContract ? true : lead.contractDepositPaid,
        contractSignedDate: isNowContract && !lead.contractSignedDate ? new Date().toLocaleDateString("en-AU") : lead.contractSignedDate,
        updatedAt: new Date().toISOString(),
      };
    }
    return lead;
  });

  try {
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

export async function deleteCrmLead(leadId: string): Promise<CrmLead[]> {
  const current = await loadAllCrmLeads();
  const updated = current.filter((l) => l.id !== leadId);
  try {
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
  return updated;
}

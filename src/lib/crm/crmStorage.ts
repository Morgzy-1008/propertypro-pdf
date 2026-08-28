import { CrmLead, CrmStageId, CrmMessage } from "./crmTypes";

const CRM_STORAGE_KEY = "hudson_crm_leads_v2";
const CRM_MESSAGES_KEY = "hudson_crm_messages_v2";
const OUTLOOK_SYNC_KEY = "hudson_outlook_sync_state";

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
    stage: "tender_accepted",
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
    clientNotes: [
      { id: "n1", author: "Morgan Hales", content: "Client loves the Amber 21 modified layout with 4.6m front setback.", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: "n2", author: "Morgan Hales", content: "ATP signed and $1,650 deposit verified in Westpac account.", createdAt: new Date(Date.now() - 86400000 * 1).toISOString() }
    ],
    tasks: [
      { id: "t1", title: "Review soil test engineering report with Bernie", dueDate: "Tomorrow", completed: false, createdAt: new Date().toISOString() },
      { id: "t2", title: "Send colour selection portal login to Jordan", dueDate: "Next Tuesday", completed: true, createdAt: new Date().toISOString() }
    ],
    activities: [
      { id: "a1", type: "tender", title: "Tender Accepted & ATP Signed", description: "Tender #TR-2026-8841 signed by Jordan Hales.", timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
      { id: "a2", type: "quote", title: "Quote #MH8841 Generated", description: "Amber 21 Modified total: $467,789 with H2 Inclusions.", timestamp: new Date(Date.now() - 86400000 * 3).toISOString() },
      { id: "a3", type: "siting", title: "1:200 Siting Blueprint Saved", description: "Lot 719 Providence (14.0m frontage, 5.0m garage setback).", timestamp: new Date(Date.now() - 86400000 * 4).toISOString() },
      { id: "a4", type: "flyer", title: "Showcase Flyer Created", description: "Amber 21 Hampton Executive package flyer generated.", timestamp: new Date(Date.now() - 86400000 * 5).toISOString() }
    ],
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
    clientNotes: [
      { id: "n3", author: "Morgan Hales", content: "Contract signing meeting completed at Flagstone display home.", createdAt: new Date(Date.now() - 86400000 * 4).toISOString() }
    ],
    tasks: [
      { id: "t3", title: "Handover job folder to construction supervisor", dueDate: "Friday", completed: false, createdAt: new Date().toISOString() }
    ],
    activities: [
      { id: "a5", type: "status_change", title: "Contract Signed & 5% Deposit Paid", description: "HIA Contract executed for Jasper 26 Modern Coastal.", timestamp: new Date(Date.now() - 86400000 * 4).toISOString() },
      { id: "a6", type: "tender", title: "Tender Package Finalized", description: "Tender #TR-2026-7732 processed with full working drawings.", timestamp: new Date(Date.now() - 86400000 * 12).toISOString() }
    ],
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
    stage: "estimate_presented",
    assignedConsultantId: "morgan_hales",
    leadSource: "Developer Land Partner",
    notes: "Investor package for high rental yield. Sent 5-page Estimate PDF. Follow up on Monday.",
    linkedQuoteNumber: "Q-2026-9014",
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    clientNotes: [
      { id: "n4", author: "Morgan Hales", content: "Sent 5-page Estimate PDF via email & SMS link.", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() }
    ],
    tasks: [
      { id: "t4", title: "Follow up Marcus on rental yield appraisal & tender request", dueDate: "Monday 10am", completed: false, createdAt: new Date().toISOString() }
    ],
    activities: [
      { id: "a7", type: "quote", title: "Estimate #MH9014 Sent", description: "Sapphire 29 Dual Occupancy estimate total: $645,000.", timestamp: new Date(Date.now() - 86400000 * 2).toISOString() }
    ],
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
    notes: "Custom floorplan modified in Concept Editor with 1200mm master bedroom extension.",
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
    stage: "walk_ins",
    assignedConsultantId: "jesse",
    leadSource: "Display Home Kiosk",
    notes: "Walked into Springfield Central display home. Looking for 400m2 lot in Harmony stage 6.",
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date().toISOString(),
  },
  {
    id: "lead_clarke_006",
    clientName: "Anthony Clarke",
    email: "a.clarke@buildcorp.com.au",
    mobile: "0488 333 111",
    targetEstate: "North Harbour",
    suburb: "Burpengary East",
    lotNumber: "142",
    landStatus: "Have Land (Registered)",
    landBudget: 310000,
    preferredDesign: "Azure 19",
    facadeName: "Coastal Elegance",
    housingType: "Single Storey",
    totalEstimatedDealValue: 412000,
    stage: "new_lead",
    assignedConsultantId: "morgan_hales",
    leadSource: "Website Inquiry",
    notes: "Online package inquiry for Azure 19 on 12.5m frontage lot in North Harbour.",
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date().toISOString(),
  },
  {
    id: "lead_wright_007",
    clientName: "Chloe Wright",
    email: "chloe.wright@outlook.com",
    mobile: "0401 777 444",
    targetEstate: "Pebble Creek",
    suburb: "South Maclean",
    lotNumber: "212",
    landStatus: "Looking for Land",
    landBudget: 270000,
    preferredDesign: "Banksia 21",
    facadeName: "Classic Plus",
    housingType: "Single Storey",
    totalEstimatedDealValue: 395000,
    stage: "tender_requested",
    assignedConsultantId: "morgan_hales",
    leadSource: "Referral",
    notes: "Tender submitted. Client reviewing preliminary site costs and soil test allowance.",
    linkedTenderSubmissionNumber: "TR-2026-9102",
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date().toISOString(),
  }
];

export const INITIAL_DEMO_MESSAGES: CrmMessage[] = [
  {
    id: "msg_1",
    clientEmail: "jordan.hales@gmail.com",
    clientMobile: "0412 888 999",
    direction: "inbound",
    channel: "email",
    senderName: "Jordan Hales",
    recipientName: "Morgan Hales",
    subject: "Re: Amber 21 Modified Siting & Tender Quote",
    body: "Hi Morgan, thanks for sending through the siting plan and the 5-page estimate. The $1,650 ATP fee has been transferred via PayID today. Looking forward to the soil test!",
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    isRead: true,
    outlookSynced: true,
  },
  {
    id: "msg_2",
    clientEmail: "jordan.hales@gmail.com",
    clientMobile: "0412 888 999",
    direction: "outbound",
    channel: "email",
    senderName: "Morgan Hales",
    recipientName: "Jordan Hales",
    subject: "Amber 21 Modified Siting & Tender Quote",
    body: "Hi Jordan, attached is your customized Builders Estimate and 1:200 Siting Blueprint showing 4.60m front setback and 1.00m side clearances on Lot 719 Providence.",
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    isRead: true,
    outlookSynced: true,
  },
  {
    id: "msg_3",
    clientEmail: "jordan.hales@gmail.com",
    clientMobile: "0412 888 999",
    direction: "outbound",
    channel: "sms",
    senderName: "Morgan Hales",
    recipientName: "Jordan Hales",
    body: "Hi Jordan, Morgan from Hudson Homes here. Your interactive Builders Estimate is ready to review: https://hudsonhomes.com.au/quote/Q-8841",
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    isRead: true,
  },
  {
    id: "msg_4",
    clientEmail: "marcus.vance@investqld.com.au",
    clientMobile: "0422 111 444",
    direction: "inbound",
    channel: "email",
    senderName: "Marcus Vance",
    recipientName: "Morgan Hales",
    subject: "Sapphire 29 Dual Living Pricing",
    body: "Hi Morgan, had a look through the estimate for the Sapphire 29. Can we confirm if the air conditioning is split system for both the main dwelling and secondary unit?",
    timestamp: new Date(Date.now() - 86400000 * 1.5).toISOString(),
    isRead: false,
    outlookSynced: true,
  },
  {
    id: "msg_5",
    clientEmail: "nathan.mitchell@gmail.com",
    clientMobile: "0417 555 123",
    direction: "inbound",
    channel: "email",
    senderName: "Nathan Mitchell",
    recipientName: "Morgan Hales",
    subject: "Re: HIA Building Contract Execution",
    body: "Morning Morgan, Sarah and I have reviewed the HIA contract and signed the final page. Transferring the 5% deposit right now. Thanks for all your help!",
    timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
    isRead: true,
    outlookSynced: true,
  },
  {
    id: "msg_6",
    clientEmail: "a.clarke@buildcorp.com.au",
    clientMobile: "0488 333 111",
    direction: "inbound",
    channel: "email",
    senderName: "Anthony Clarke",
    recipientName: "Morgan Hales",
    subject: "Inquiry: Azure 19 on Lot 142 North Harbour",
    body: "Hi Hudson Homes team, I am looking for a turn-key house and land package on my registered lot in North Harbour. Could you please send me pricing with the Coastal Elegance facade?",
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    isRead: false,
    outlookSynced: true,
  }
];

export async function loadAllCrmLeads(): Promise<CrmLead[]> {
  try {
    const raw = localStorage.getItem(CRM_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_LEADS));
      return INITIAL_DEMO_LEADS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_LEADS;
  } catch (err) {
    console.error("Error loading CRM leads:", err);
    return INITIAL_DEMO_LEADS;
  }
}

export async function saveCrmLead(lead: CrmLead): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const idx = list.findIndex((l) => l.id === lead.id);
  let updatedList: CrmLead[];

  const updatedLead = {
    ...lead,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    updatedList = [...list];
    updatedList[idx] = updatedLead;
  } else {
    updatedList = [updatedLead, ...list];
  }

  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updatedList));
  return updatedList;
}

export async function updateCrmLeadStage(leadId: string, newStage: CrmStageId): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updatedList = list.map((l) => {
    if (l.id === leadId) {
      const newActivities = [...(l.activities || [])];
      newActivities.unshift({
        id: `act_${Date.now()}`,
        type: "status_change",
        title: `Moved to ${newStage.replace(/_/g, " ").toUpperCase()}`,
        description: `Lead moved to ${newStage} stage by sales consultant.`,
        timestamp: new Date().toISOString(),
      });

      return {
        ...l,
        stage: newStage,
        activities: newActivities,
        updatedAt: new Date().toISOString(),
        lastContactedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updatedList));
  return updatedList;
}

export async function loadAllCrmMessages(): Promise<CrmMessage[]> {
  try {
    const raw = localStorage.getItem(CRM_MESSAGES_KEY);
    if (!raw) {
      localStorage.setItem(CRM_MESSAGES_KEY, JSON.stringify(INITIAL_DEMO_MESSAGES));
      return INITIAL_DEMO_MESSAGES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_MESSAGES;
  } catch {
    return INITIAL_DEMO_MESSAGES;
  }
}

export async function saveCrmMessage(msg: CrmMessage): Promise<CrmMessage[]> {
  const list = await loadAllCrmMessages();
  const updated = [msg, ...list];
  localStorage.setItem(CRM_MESSAGES_KEY, JSON.stringify(updated));
  return updated;
}

export function getOutlookSyncStatus(): { synced: boolean; count: number; lastSync: string } {
  try {
    const raw = localStorage.getItem(OUTLOOK_SYNC_KEY);
    if (!raw) return { synced: true, count: 28, lastSync: "Just now" };
    return JSON.parse(raw);
  } catch {
    return { synced: true, count: 28, lastSync: "Just now" };
  }
}

export function triggerOutlookSync(): { synced: boolean; count: number; lastSync: string } {
  const current = getOutlookSyncStatus();
  const updated = {
    synced: true,
    count: current.count + 4,
    lastSync: "Just now (Synced)",
  };
  localStorage.setItem(OUTLOOK_SYNC_KEY, JSON.stringify(updated));
  return updated;
}

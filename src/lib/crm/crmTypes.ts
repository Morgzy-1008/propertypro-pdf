export type CrmStageId =
  | "new_lead"
  | "walk_ins"
  | "concept_plan"
  | "estimate_presented"
  | "tender_requested"
  | "tender_received"
  | "tender_accepted"
  | "contract_signed"
  | "under_construction"
  | "long_term"
  | "no_contact"
  | "sale_not_proceeding";

export interface CrmStageDefinition {
  id: CrmStageId;
  label: string;
  shortLabel: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  description: string;
  isCommissionTrigger?: "tranche1" | "tranche2";
}

export const CRM_PIPELINE_STAGES: CrmStageDefinition[] = [
  {
    id: "new_lead",
    label: "1. New Leads",
    shortLabel: "New Leads",
    color: "from-blue-500/20 to-blue-600/20 border-blue-500/40",
    badgeBg: "bg-blue-950/60 border-blue-800/60",
    badgeText: "text-blue-300",
    description: "Inbound website inquiries & developer package leads",
  },
  {
    id: "walk_ins",
    label: "2. Walk In's",
    shortLabel: "Walk In's",
    color: "from-indigo-500/20 to-indigo-600/20 border-indigo-500/40",
    badgeBg: "bg-indigo-950/60 border-indigo-800/60",
    badgeText: "text-indigo-300",
    description: "Display home walk-ins & iPad kiosk registrations",
  },
  {
    id: "concept_plan",
    label: "3. Concept Plan",
    shortLabel: "Concept Plan",
    color: "from-cyan-500/20 to-cyan-600/20 border-cyan-500/40",
    badgeBg: "bg-cyan-950/60 border-cyan-800/60",
    badgeText: "text-cyan-300",
    description: "Architectural floorplan modifications & 1:200 siting",
  },
  {
    id: "estimate_presented",
    label: "4. Estimate Presented",
    shortLabel: "Estimate Presented",
    color: "from-teal-500/20 to-teal-600/20 border-teal-500/40",
    badgeBg: "bg-teal-950/60 border-teal-800/60",
    badgeText: "text-teal-300",
    description: "Itemized Builders Estimate sent to customer",
  },
  {
    id: "tender_requested",
    label: "5. Tender Requested",
    shortLabel: "Tender Requested",
    color: "from-amber-500/20 to-amber-600/20 border-amber-500/40",
    badgeBg: "bg-amber-950/60 border-amber-800/60",
    badgeText: "text-amber-300",
    description: "Tender submission initiated by sales consultant",
  },
  {
    id: "tender_received",
    label: "6. Tender Recieved",
    shortLabel: "Tender Recieved",
    color: "from-orange-500/20 to-orange-600/20 border-orange-500/40",
    badgeBg: "bg-orange-950/60 border-orange-800/60",
    badgeText: "text-orange-300",
    description: "Head office tender document ready for presentation",
  },
  {
    id: "tender_accepted",
    label: "7. Tender Accepted",
    shortLabel: "Tender Accepted",
    color: "from-emerald-500/20 to-emerald-600/20 border-emerald-500/40",
    badgeBg: "bg-emerald-950/60 border-emerald-800/60",
    badgeText: "text-emerald-300",
    description: "ATP signed & initial preliminary deposit confirmed",
    isCommissionTrigger: "tranche1",
  },
  {
    id: "contract_signed",
    label: "8. Contract Signed",
    shortLabel: "Contract Signed",
    color: "from-yellow-500/20 to-amber-600/20 border-yellow-500/40",
    badgeBg: "bg-yellow-950/60 border-yellow-800/60",
    badgeText: "text-yellow-300",
    description: "Formal HIA/QBCC Building Contract executed & 5% deposit paid",
    isCommissionTrigger: "tranche2",
  },
  {
    id: "under_construction",
    label: "9. Under Construction",
    shortLabel: "Under Construction",
    color: "from-emerald-600/20 to-teal-700/20 border-emerald-600/40",
    badgeBg: "bg-emerald-950/60 border-emerald-800/60",
    badgeText: "text-emerald-300",
    description: "Slab poured, framing, lockup, practical completion",
  },
  {
    id: "long_term",
    label: "10. Long-Term",
    shortLabel: "Long-Term",
    color: "from-purple-500/20 to-purple-600/20 border-purple-500/40",
    badgeBg: "bg-purple-950/60 border-purple-800/60",
    badgeText: "text-purple-300",
    description: "Future land registration, saving deposit, or 6+ month horizon",
  },
  {
    id: "no_contact",
    label: "11. No-Contact",
    shortLabel: "No-Contact",
    color: "from-slate-500/20 to-slate-600/20 border-slate-500/40",
    badgeBg: "bg-slate-900 border-slate-700",
    badgeText: "text-slate-300",
    description: "Customer unresponsive across multiple follow-ups",
  },
  {
    id: "sale_not_proceeding",
    label: "12. Sale Not Proceeding",
    shortLabel: "Sale Not Proceeding",
    color: "from-rose-500/20 to-rose-600/20 border-rose-500/40",
    badgeBg: "bg-rose-950/60 border-rose-800/60",
    badgeText: "text-rose-300",
    description: "Finance declined, lot cancelled, or selected alternative builder",
  },
];

export interface CrmConsultant {
  id: string;
  name: string;
  email: string;
  phone: string;
  displayOffice: string;
  baseSalaryYearly: number;
  commissionRatePct: number;
}

export const HUDSON_CONSULTANTS: CrmConsultant[] = [
  {
    id: "morgan_hales",
    name: "Morgan Hales",
    email: "morgan.hales@hudsonhomes.com.au",
    phone: "0417 571 864",
    displayOffice: "Flagstone Display Home",
    baseSalaryYearly: 75000,
    commissionRatePct: 2.25,
  },
  {
    id: "adrian",
    name: "Adrian",
    email: "adrian@hudsonhomes.com.au",
    phone: "0412 333 444",
    displayOffice: "Springfield Central",
    baseSalaryYearly: 75000,
    commissionRatePct: 2.25,
  },
  {
    id: "jesse",
    name: "Jesse",
    email: "jesse@hudsonhomes.com.au",
    phone: "0413 444 555",
    displayOffice: "Springfield Central",
    baseSalaryYearly: 75000,
    commissionRatePct: 2.25,
  },
];

export interface CrmTask {
  id: string;
  title: string;
  dueDate?: string;
  completed: boolean;
  assignedTo?: string;
  createdAt: string;
}

export interface CrmNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface CrmActivityItem {
  id: string;
  type: "flyer" | "siting" | "quote" | "tender" | "status_change" | "note" | "email" | "sms";
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface CrmMessage {
  id: string;
  clientEmail: string;
  clientMobile?: string;
  direction: "inbound" | "outbound";
  channel: "email" | "sms" | "call_note" | "whatsapp";
  senderName: string;
  recipientName: string;
  subject?: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  outlookSynced?: boolean;
}

export interface CrmLead {
  id: string;
  clientName: string;
  email: string;
  mobile: string;
  secondaryCustomerName?: string;
  secondaryCustomerMobile?: string;
  secondaryCustomerEmail?: string;
  
  // Land & Site Details
  targetEstate: string;
  suburb: string;
  lotNumber: string;
  landStatus: "Have Land (Registered)" | "Land Under Contract (Unregistered)" | "Looking for Land" | "Knockdown Rebuild (KDRB)";
  landBudget: number;

  // Build Spec
  preferredDesign: string;
  facadeName: string;
  housingType: "Single Storey" | "Double Storey" | "Split Level" | "Dual Living";
  totalEstimatedDealValue: number;
  tenderPrice?: number; // Official head office tender price once Tender Received stage is reached

  // Workflow State
  stage: CrmStageId;
  assignedConsultantId: string;
  leadSource: "Display Home Kiosk" | "Website Inquiry" | "Phone Walk-in" | "Referral" | "Developer Land Partner";
  notes: string;
  
  // Rich Sub-records
  clientNotes?: CrmNote[];
  tasks?: CrmTask[];
  activities?: CrmActivityItem[];
  
  // Linked System Records
  linkedQuoteNumber?: string;
  linkedTenderSubmissionNumber?: string;
  linkedFlyerId?: string;
  isAtpSigned: boolean;
  atpFeePaid: boolean;
  atpSignedDate?: string;
  isContractSigned: boolean;
  contractDepositPaid: boolean;
  contractSignedDate?: string;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  lastContactedAt: string;
}

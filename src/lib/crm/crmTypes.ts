export type CrmStageId =
  | "new_lead"
  | "display_walkin"
  | "concept_plan"
  | "estimate_sent"
  | "tender_requested"
  | "atp_signed_paid"
  | "drafting_working_drawings"
  | "contract_signed"
  | "under_construction"
  | "lost";

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
    label: "1. New Inquiries & Web Leads",
    shortLabel: "New Leads",
    color: "from-blue-500/20 to-blue-600/20 border-blue-500/40",
    badgeBg: "bg-blue-950/60 border-blue-800/60",
    badgeText: "text-blue-300",
    description: "Inbound leads, website packages, online portal inquiries",
  },
  {
    id: "display_walkin",
    label: "2. Display Home Walk-in",
    shortLabel: "Walk-in",
    color: "from-indigo-500/20 to-indigo-600/20 border-indigo-500/40",
    badgeBg: "bg-indigo-950/60 border-indigo-800/60",
    badgeText: "text-indigo-300",
    description: "Springfield Central display village iPad kiosk registrations",
  },
  {
    id: "concept_plan",
    label: "3. Concept Plan Modified",
    shortLabel: "Concept Plan",
    color: "from-cyan-500/20 to-cyan-600/20 border-cyan-500/40",
    badgeBg: "bg-cyan-950/60 border-cyan-800/60",
    badgeText: "text-cyan-300",
    description: "Custom wall modifications & Foresight floorplan adjustments",
  },
  {
    id: "estimate_sent",
    label: "4. Formal Estimate Presented",
    shortLabel: "Estimate Sent",
    color: "from-teal-500/20 to-teal-600/20 border-teal-500/40",
    badgeBg: "bg-teal-950/60 border-teal-800/60",
    badgeText: "text-teal-300",
    description: "Technical builders quote sent via SMS/WhatsApp with PDF",
  },
  {
    id: "tender_requested",
    label: "5. Tender Request Submitted",
    shortLabel: "Tender Pending",
    color: "from-amber-500/20 to-amber-600/20 border-amber-500/40",
    badgeBg: "bg-amber-950/60 border-amber-800/60",
    badgeText: "text-amber-300",
    description: "Tender portal completed; awaiting ATP e-signature & fee",
  },
  {
    id: "atp_signed_paid",
    label: "6. ATP Signed & $1,650 Fee Paid",
    shortLabel: "ATP Signed (50% Comms)",
    color: "from-emerald-500/20 to-emerald-600/20 border-emerald-500/40",
    badgeBg: "bg-emerald-950/60 border-emerald-800/60",
    badgeText: "text-emerald-300",
    description: "Authority to Proceed signed. Tranche 1 (50%) commission triggered!",
    isCommissionTrigger: "tranche1",
  },
  {
    id: "drafting_working_drawings",
    label: "7. Soil/Survey & Drafting In Progress",
    shortLabel: "Drafting (Bernie)",
    color: "from-purple-500/20 to-purple-600/20 border-purple-500/40",
    badgeBg: "bg-purple-950/60 border-purple-800/60",
    badgeText: "text-purple-300",
    description: "Job Folder handoff to Bernie & OnSite for Rev A working drawings",
  },
  {
    id: "contract_signed",
    label: "8. Building Contract & 5% Deposit",
    shortLabel: "Contract (50% Comms)",
    color: "from-yellow-500/20 to-amber-600/20 border-yellow-500/40",
    badgeBg: "bg-yellow-950/60 border-yellow-800/60",
    badgeText: "text-yellow-300",
    description: "Building contract signed & 5% deposit paid. Tranche 2 (50%) commission triggered!",
    isCommissionTrigger: "tranche2",
  },
  {
    id: "under_construction",
    label: "9. Site Start & Construction",
    shortLabel: "Under Construction",
    color: "from-slate-500/20 to-slate-600/20 border-slate-500/40",
    badgeBg: "bg-slate-900 border-slate-700",
    badgeText: "text-slate-200",
    description: "Slab poured, framing, lockup, practical completion",
  },
  {
    id: "lost",
    label: "10. Archived / Unqualified",
    shortLabel: "Archived",
    color: "from-rose-500/20 to-rose-600/20 border-rose-500/40",
    badgeBg: "bg-rose-950/60 border-rose-800/60",
    badgeText: "text-rose-300",
    description: "Lost to competitor, finance declined, or postponed",
  },
];

export interface CrmConsultant {
  id: string;
  name: string;
  email: string;
  phone: string;
  displayOffice: string;
  baseSalaryYearly: number; // $75,000
  commissionRatePct: number; // 2.25%
}

export const HUDSON_CONSULTANTS: CrmConsultant[] = [
  {
    id: "morgan_hales",
    name: "Morgan Hales",
    email: "morgan.hales@hudsonhomes.com.au",
    phone: "0411 222 333",
    displayOffice: "Springfield Central",
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

export interface CrmLead {
  id: string;
  clientName: string;
  email: string;
  mobile: string;
  secondaryCustomerName?: string;
  secondaryCustomerMobile?: string;
  
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
  totalEstimatedDealValue: number; // e.g. $467,789

  // Workflow State
  stage: CrmStageId;
  assignedConsultantId: string; // "morgan_hales", "adrian", "jesse"
  leadSource: "Display Home Kiosk" | "Website Inquiry" | "Phone Walk-in" | "Referral" | "Developer Land Partner";
  notes: string;
  
  // Linked System Records
  linkedQuoteNumber?: string;
  linkedTenderSubmissionNumber?: string;
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

/**
 * BrainDump - Morgan and Alyssa's Task Execution Engine
 * Types, presets, and SLAs for rapid task blitzing.
 */

export type BrainDumpTaskType =
  | "mark_up"            // Creating mark-up drawings for clients (SLA: 2 days EOD)
  | "call_followup"       // Client calls & SMS follow-ups (SLA: Today / 1 day EOD)
  | "estimate"            // Creating new estimates & initial pricing (SLA: 1 day EOD)
  | "tender_submission"   // Formal tender submissions / ATP preparation (SLA: 3 days EOD)
  | "re_tender"           // Existing tenders, re-tenders & variations (SLA: 2 days EOD)
  | "contract"            // Contract drafting & signing reviews (SLA: 3 days EOD)
  | "general_admin";      // Soil tests, developer covenants, admin (SLA: 1 day EOD)

export type BrainDumpAssignee = "morgan" | "alyssa" | "both";

export type BrainDumpStatus = "todo" | "in_progress" | "completed" | "cancelled";

export type BrainDumpPriority = "critical" | "urgent" | "high" | "normal" | "low";

export interface BrainDumpChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface BrainDumpNote {
  id: string;
  author: string;
  authorInitials: string;
  text: string;
  createdAt: string;
}

export interface BrainDumpTask {
  id: string;
  title: string;
  description?: string;
  type: BrainDumpTaskType;
  assignee: BrainDumpAssignee;
  creator: "morgan" | "alyssa" | "system";
  status: BrainDumpStatus;
  priority: BrainDumpPriority;
  
  // SLA & Deadlines
  slaDays: number;         // Amount of days (e.g. 0, 1, 2, 3, 5, 7)
  dueAt: string;           // ISO timestamp representing 5:00 PM EOD on target day
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
  completedAt?: string;    // ISO timestamp
  completedBy?: string;    // Morgan Hales or Alyssa Hales

  // Client & Project Context (Optional Linkages)
  clientId?: string;       // CRM Lead ID
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  siteAddress?: string;
  estate?: string;
  lotNumber?: string;
  designName?: string;
  quoteNumber?: string;

  // Actions & Checklist
  checklist?: BrainDumpChecklistItem[];
  notes?: BrainDumpNote[];
  tags?: string[];
  externalUrl?: string;    // e.g. /quote-builder or /floorplan-editor
}

export interface TaskTypeConfig {
  type: BrainDumpTaskType;
  label: string;
  shortLabel: string;
  iconName: string;
  defaultDays: number;
  defaultAssignee: BrainDumpAssignee;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  accentGradient: string;
  description: string;
  quickActionLabel?: string;
  quickActionUrl?: string;
}

export const TASK_TYPE_CONFIGS: Record<BrainDumpTaskType, TaskTypeConfig> = {
  mark_up: {
    type: "mark_up",
    label: "Client Mark-up Drawing",
    shortLabel: "Mark-up",
    iconName: "PenTool",
    defaultDays: 2, // Explicit user requirement: "Like i want every mark up to be done in 2 days EOD"
    defaultAssignee: "alyssa",
    badgeBg: "bg-emerald-500/15 dark:bg-emerald-950/60",
    badgeBorder: "border-emerald-500/40",
    badgeText: "text-emerald-700 dark:text-emerald-300",
    accentGradient: "from-emerald-500 to-teal-600",
    description: "Floorplan redlines, structural wall shifts, window changes, siting overlays",
    quickActionLabel: "Floorplan Editor",
    quickActionUrl: "/floorplan-editor",
  },
  call_followup: {
    type: "call_followup",
    label: "Call / Client Follow-up",
    shortLabel: "Call / Follow-up",
    iconName: "PhoneCall",
    defaultDays: 0, // Today EOD
    defaultAssignee: "morgan",
    badgeBg: "bg-sky-500/15 dark:bg-sky-950/60",
    badgeBorder: "border-sky-500/40",
    badgeText: "text-sky-700 dark:text-sky-300",
    accentGradient: "from-sky-500 to-blue-600",
    description: "Client callback, display home enquiry follow-up, finance update check-in",
    quickActionLabel: "Open CRM",
    quickActionUrl: "/crm",
  },
  estimate: {
    type: "estimate",
    label: "Create Estimate / Quote",
    shortLabel: "New Estimate",
    iconName: "Calculator",
    defaultDays: 1, // 1 Day EOD
    defaultAssignee: "morgan",
    badgeBg: "bg-amber-500/15 dark:bg-amber-950/60",
    badgeBorder: "border-amber-500/40",
    badgeText: "text-amber-700 dark:text-amber-300",
    accentGradient: "from-amber-500 to-orange-600",
    description: "Initial package estimate, site works calculation, base house & inclusions",
    quickActionLabel: "Quote Builder",
    quickActionUrl: "/quote-builder",
  },
  tender_submission: {
    type: "tender_submission",
    label: "Tender Submission (ATP)",
    shortLabel: "Tender (ATP)",
    iconName: "Send",
    defaultDays: 3, // 3 Days EOD
    defaultAssignee: "both",
    badgeBg: "bg-purple-500/15 dark:bg-purple-950/60",
    badgeBorder: "border-purple-500/40",
    badgeText: "text-purple-700 dark:text-purple-300",
    accentGradient: "from-purple-500 to-indigo-600",
    description: "Formal Acceptance of Tender Proposal package, OnSite upload, tender presentation",
    quickActionLabel: "Tender Portal",
    quickActionUrl: "/tender-request",
  },
  re_tender: {
    type: "re_tender",
    label: "Existing Tender / Re-Tender",
    shortLabel: "Re-Tender",
    iconName: "RotateCcw",
    defaultDays: 2, // 2 Days EOD
    defaultAssignee: "morgan",
    badgeBg: "bg-rose-500/15 dark:bg-rose-950/60",
    badgeBorder: "border-rose-500/40",
    badgeText: "text-rose-700 dark:text-rose-300",
    accentGradient: "from-rose-500 to-pink-600",
    description: "Tender revisions, post-soil test pricing adjustments, variation recalculations",
    quickActionLabel: "Review Quote",
    quickActionUrl: "/quote-builder",
  },
  contract: {
    type: "contract",
    label: "Building Contract & Signing",
    shortLabel: "Contract",
    iconName: "FileCheck",
    defaultDays: 3, // 3 Days EOD
    defaultAssignee: "morgan",
    badgeBg: "bg-indigo-500/15 dark:bg-indigo-950/60",
    badgeBorder: "border-indigo-500/40",
    badgeText: "text-indigo-700 dark:text-indigo-300",
    accentGradient: "from-indigo-500 to-blue-700",
    description: "HIA/QBCC contract preparation, review, signing appointment, deposit receipt",
    quickActionLabel: "CRM Pipeline",
    quickActionUrl: "/crm",
  },
  general_admin: {
    type: "general_admin",
    label: "Admin / Priority Task",
    shortLabel: "Admin",
    iconName: "CheckSquare",
    defaultDays: 1, // 1 Day EOD
    defaultAssignee: "alyssa",
    badgeBg: "bg-slate-500/15 dark:bg-slate-800/60",
    badgeBorder: "border-slate-500/40",
    badgeText: "text-slate-700 dark:text-slate-300",
    accentGradient: "from-slate-500 to-slate-700",
    description: "Soil test booking, developer covenant submission, drafting request follow-up",
  },
};

export interface SlaPresetOption {
  days: number;
  label: string;
  badge: string;
  description: string;
  isPopular?: boolean;
}

export const SLA_PRESET_OPTIONS: SlaPresetOption[] = [
  {
    days: 0,
    label: "Today EOD",
    badge: "⚡ 5:00 PM Today",
    description: "Must be resolved before leaving today",
    isPopular: true,
  },
  {
    days: 1,
    label: "+1 Day EOD",
    badge: "🔥 Tomorrow 5PM",
    description: "Due by tomorrow end-of-day",
    isPopular: true,
  },
  {
    days: 2,
    label: "+2 Days EOD",
    badge: "⭐ 2 Days EOD",
    description: "Standard SLA for Mark-up Drawings & Re-tenders",
    isPopular: true,
  },
  {
    days: 3,
    label: "+3 Days EOD",
    badge: "📆 3 Days EOD",
    description: "Standard SLA for Tenders & Contracts",
    isPopular: true,
  },
  {
    days: 5,
    label: "+5 Days (1 Wk)",
    badge: "📅 5 Business Days",
    description: "Standard weekly turnaround",
  },
  {
    days: 7,
    label: "+7 Days",
    badge: "🗓️ 7 Days",
    description: "1 full calendar week",
  },
];

export type DueUrgency =
  | "overdue"      // Past deadline
  | "due_today"    // Due today before 5pm
  | "due_tomorrow" // Due tomorrow
  | "upcoming"     // Due in 2+ days
  | "completed";   // Smashed out!

import React, { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  CrmLead,
  CrmTask,
  CrmTaskType,
  CrmTaskNote,
  CrmChecklistItem,
  HUDSON_CONSULTANTS,
  normalizeConsultantId,
} from "@/lib/crm/crmTypes";
import {
  loadAllCrmTasks,
  addCrmTask,
  updateCrmTask,
  reassignCrmTask,
  addCrmTaskNote,
  toggleCrmTaskChecklist,
  deleteCrmTask,
  calculateEodDeadline,
  getTaskSlaUrgency,
  saveTeamMessage,
} from "@/lib/crm/crmStorage";
import {
  CheckSquare,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  User,
  Search,
  ArrowUpRight,
  Sparkles,
  Bell,
  Phone,
  MessageSquare,
  Flame,
  Share2,
  Send,
  Users,
  Copy,
  PenTool,
  Calculator,
  RotateCcw,
  FileCheck,
  Building2,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Tag,
  Check,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { getActiveStaffUser } from "@/lib/authSession";

interface CrmTasksViewProps {
  leads: CrmLead[];
  selectedConsultantId: string;
  onOpenLead: (lead: CrmLead) => void;
  onQuickAction?: (lead: CrmLead, action: "call" | "sms" | "email") => void;
  onTasksUpdated: () => void;
}

const SMART_TASK_PRESETS = [
  {
    type: "mark_up" as const,
    title: "Client Mark-up Drawing (SLA: 2 Days EOD)",
    slaDays: 2,
    priority: "high" as const,
    description: "Floorplan redlines, structural wall shifts, window changes, siting overlays",
    quickActionUrl: "/floorplan-editor",
    quickActionLabel: "Floorplan Editor",
    icon: PenTool,
  },
  {
    type: "call" as const,
    title: "Call / Client Follow-up (SLA: Today EOD)",
    slaDays: 0,
    priority: "urgent" as const,
    description: "Client callback, display home enquiry follow-up, finance update check-in",
    quickActionUrl: "/crm",
    quickActionLabel: "Client Details",
    icon: Phone,
  },
  {
    type: "estimate" as const,
    title: "Create Estimate / Initial Quote (SLA: 1 Day EOD)",
    slaDays: 1,
    priority: "high" as const,
    description: "Initial package estimate, site works calculation, base house & inclusions",
    quickActionUrl: "/quote-builder",
    quickActionLabel: "Quote Builder",
    icon: Calculator,
  },
  {
    type: "tender_submission" as const,
    title: "Tender Submission / ATP Prep (SLA: 3 Days EOD)",
    slaDays: 3,
    priority: "high" as const,
    description: "Formal Acceptance of Tender Proposal package, OnSite upload, tender presentation",
    quickActionUrl: "/tender-request",
    quickActionLabel: "Tender Portal",
    icon: Send,
  },
  {
    type: "re_tender" as const,
    title: "Re-Tender / Variation Review (SLA: 2 Days EOD)",
    slaDays: 2,
    priority: "normal" as const,
    description: "Tender revisions, post-soil test pricing adjustments, variation recalculations",
    quickActionUrl: "/quote-builder",
    quickActionLabel: "Review Quote",
    icon: RotateCcw,
  },
  {
    type: "contract" as const,
    title: "Building Contract & Signing (SLA: 3 Days EOD)",
    slaDays: 3,
    priority: "high" as const,
    description: "HIA/QBCC contract preparation, review, signing appointment, deposit receipt",
    quickActionUrl: "/crm",
    quickActionLabel: "CRM Pipeline",
    icon: FileCheck,
  },
  {
    type: "general" as const,
    title: "General Admin / Site Follow-up (SLA: 1 Day EOD)",
    slaDays: 1,
    priority: "normal" as const,
    description: "Soil test booking, developer covenant submission, drafting follow-up",
    icon: CheckSquare,
  },
];

export function CrmTasksView({
  leads,
  selectedConsultantId,
  onOpenLead,
  onQuickAction,
  onTasksUpdated,
}: CrmTasksViewProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const staffUser = getActiveStaffUser();
  const activeStaffId = normalizeConsultantId(staffUser?.id || staffUser?.email || staffUser?.name || "morgan_hales");
  const activeStaffName = staffUser?.name || "Morgan Hales";

  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterView, setFilterView] = useState<"all" | "my" | "delegated">("all");
  const [filterColleague, setFilterColleague] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeNotesTaskId, setActiveNotesTaskId] = useState<string | null>(null);
  const [newNoteInput, setNewNoteInput] = useState<{ [taskId: string]: string }>({});

  // Add Task Modal State
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");
  const [modalType, setModalType] = useState<CrmTaskType>("mark_up");
  const [modalPriority, setModalPriority] = useState<"urgent" | "high" | "normal" | "low">("high");
  const [modalAssignedTo, setModalAssignedTo] = useState<string>(activeStaffId);
  const [modalSlaDays, setModalSlaDays] = useState<number>(2);
  const [modalCustomDue, setModalCustomDue] = useState<string>("In 2 days (5:00 PM)");
  const [modalSelectedLeadId, setModalSelectedLeadId] = useState<string>("none");
  const [modalChecklistText, setModalChecklistText] = useState("");

  const refreshAllTasks = async () => {
    const list = await loadAllCrmTasks();
    setTasks(list);
  };

  useEffect(() => {
    refreshAllTasks();

    const handleCrmChange = () => {
      refreshAllTasks();
      onTasksUpdated();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("hudson_crm_change", handleCrmChange);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("hudson_crm_change", handleCrmChange);
      }
    };
  }, []);

  // Compute live metrics
  const { totalActiveCount, myTasksCount, overdueCount, dueTodayCount, smashedOutCount } = useMemo(() => {
    let total = 0;
    let myCount = 0;
    let overdue = 0;
    let today = 0;
    let smashed = 0;

    tasks.forEach((t) => {
      const { urgency } = getTaskSlaUrgency(t.dueAt || t.dueDate, t.completed);
      if (t.completed) {
        smashed++;
      } else {
        total++;
        if (t.assignedTo === activeStaffId || t.assignedTo === "all_team") {
          myCount++;
        }
        if (urgency === "overdue") overdue++;
        if (urgency === "due_today") today++;
      }
    });

    return {
      totalActiveCount: total,
      myTasksCount: myCount,
      overdueCount: overdue,
      dueTodayCount: today,
      smashedOutCount: smashed,
    };
  }, [tasks, activeStaffId]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const { urgency } = getTaskSlaUrgency(t.dueAt || t.dueDate, t.completed);

      // Primary View Filter
      if (filterView === "my") {
        const isAssignedToMe = t.assignedTo === activeStaffId || t.assignedTo === "all_team";
        if (!isAssignedToMe) return false;
      } else if (filterView === "delegated") {
        const isDelegatedByMe =
          t.delegatedBy?.toLowerCase().includes(activeStaffName.toLowerCase()) ||
          t.createdBy?.toLowerCase().includes(activeStaffName.toLowerCase());
        if (!isDelegatedByMe) return false;
      }

      // Specific Colleague Filter
      if (filterColleague !== "all") {
        if (t.assignedTo !== filterColleague) return false;
      }

      // Category / Urgency Filter
      if (filterCategory !== "all") {
        if (filterCategory === "overdue" && urgency !== "overdue") return false;
        if (filterCategory === "today" && urgency !== "due_today") return false;
        if (filterCategory === "upcoming" && urgency !== "due_tomorrow" && urgency !== "upcoming") return false;
        if (filterCategory === "completed" && !t.completed) return false;
        if (filterCategory !== "completed" && t.completed) return false;
      }

      // Task Type Filter
      if (filterType !== "all" && t.type !== filterType) return false;

      // Priority Filter
      if (filterPriority !== "all" && t.priority !== filterPriority) return false;

      // Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q) || false;
        const matchesClient = t.clientName?.toLowerCase().includes(q) || false;
        const matchesEstate = t.estate?.toLowerCase().includes(q) || false;
        const matchesDesign = t.designName?.toLowerCase().includes(q) || false;
        const matchesAssignee = (
          HUDSON_CONSULTANTS.find((c) => c.id === t.assignedTo)?.name || t.assignedTo || ""
        )
          .toLowerCase()
          .includes(q);
        const matchesNotes = (t.notes || []).some((n) => n.text.toLowerCase().includes(q));

        if (!matchesTitle && !matchesDesc && !matchesClient && !matchesEstate && !matchesDesign && !matchesAssignee && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, filterView, filterColleague, filterCategory, filterType, filterPriority, searchTerm, activeStaffId, activeStaffName]);

  // Actions
  const handleToggleTask = async (task: CrmTask) => {
    const nextCompleted = !task.completed;
    await updateCrmTask(
      task.id,
      {
        completed: nextCompleted,
        completedAt: nextCompleted ? new Date().toISOString() : undefined,
        completedBy: nextCompleted ? activeStaffName : undefined,
      },
      task.leadId
    );
    await refreshAllTasks();
    toast.success(nextCompleted ? `Task completed by ${activeStaffName}! ✓` : "Task restored to active.");
  };

  const handleReassignColleague = async (task: CrmTask, newAssignedTo: string) => {
    const targetColleague = HUDSON_CONSULTANTS.find((c) => c.id === newAssignedTo);
    await reassignCrmTask(task.id, newAssignedTo, activeStaffName, task.leadId);
    await refreshAllTasks();
    toast.success(`Task shared & reassigned to ${targetColleague?.name || newAssignedTo}! 🤝`);
  };

  const handleAddNote = async (taskId: string, leadId?: string) => {
    const text = newNoteInput[taskId]?.trim();
    if (!text) return;
    await addCrmTaskNote(taskId, text, activeStaffName, leadId);
    setNewNoteInput((prev) => ({ ...prev, [taskId]: "" }));
    await refreshAllTasks();
    toast.success("Note added for colleagues!");
  };

  const handleToggleChecklist = async (taskId: string, checkId: string, currentStatus: boolean, leadId?: string) => {
    await toggleCrmTaskChecklist(taskId, checkId, !currentStatus, leadId);
    await refreshAllTasks();
  };

  const handleDelete = async (taskId: string, leadId?: string) => {
    if (confirm("Are you sure you want to remove this task?")) {
      await deleteCrmTask(taskId, leadId);
      await refreshAllTasks();
      toast.info("Task removed.");
    }
  };

  const handleCopyTaskBriefing = (task: CrmTask) => {
    const colleague = HUDSON_CONSULTANTS.find((c) => c.id === task.assignedTo)?.name || task.assignedTo || "Team";
    const text = `📋 [${task.type?.toUpperCase() || "TASK"}] ${task.title}\n👤 Assigned to: ${colleague}\n⏱️ Due: ${task.dueDate || task.dueAt || "EOD"}\n📍 Client: ${task.clientName ? `${task.clientName} (${task.estate || ""})` : "General Task"}\n🔗 Hudson OS: ${window.location.origin}/crm?tab=tasks`;

    navigator.clipboard.writeText(text);
    toast.success("Task briefing copied to clipboard! Ready to paste into Slack, Teams, or SMS.");
  };

  const handleShareToTeamChat = async (task: CrmTask) => {
    const colleague = HUDSON_CONSULTANTS.find((c) => c.id === task.assignedTo)?.name || task.assignedTo || "Team";
    await saveTeamMessage({
      id: `chat_task_${Date.now()}`,
      channelId: "general-sales",
      authorId: activeStaffId,
      authorName: activeStaffName,
      authorRole: staffUser?.title || "New Home Consultant",
      content: `📋 Task Shared with ${colleague}: "${task.title}" (Due: ${task.dueDate || task.dueAt || "EOD"})${task.clientName ? ` for client ${task.clientName}` : ""}`,
      timestamp: new Date().toISOString(),
      linkedLeadId: task.leadId,
    });
    toast.success("Task shared directly into CRM Team Chat channel!");
  };

  const handleApplyPreset = (preset: typeof SMART_TASK_PRESETS[0]) => {
    setModalTitle(preset.title);
    setModalType(preset.type);
    setModalSlaDays(preset.slaDays);
    setModalPriority(preset.priority);
    setModalDescription(preset.description);
    setModalCustomDue(
      preset.slaDays === 0
        ? "Today 5:00 PM"
        : preset.slaDays === 1
        ? "Tomorrow 5:00 PM"
        : `In ${preset.slaDays} days (5:00 PM)`
    );
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }

    const targetLead = leads.find((l) => l.id === modalSelectedLeadId);
    const deadlineIso = calculateEodDeadline(modalSlaDays);

    const checklistItems: CrmChecklistItem[] = modalChecklistText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line, idx) => ({
        id: `check_${Date.now()}_${idx}`,
        text: line.replace(/^[-*•]\s*/, ""),
        completed: false,
      }));

    await addCrmTask({
      title: modalTitle.trim(),
      description: modalDescription.trim() || undefined,
      type: modalType,
      priority: modalPriority,
      assignedTo: modalAssignedTo,
      delegatedBy: modalAssignedTo !== activeStaffId ? activeStaffName : undefined,
      createdBy: activeStaffName,
      slaDays: modalSlaDays,
      dueAt: deadlineIso,
      dueDate: modalCustomDue || `In ${modalSlaDays} days`,
      completed: false,
      leadId: modalSelectedLeadId !== "none" ? modalSelectedLeadId : undefined,
      clientName: targetLead?.clientName,
      clientMobile: targetLead?.mobile,
      estate: targetLead?.targetEstate,
      designName: targetLead?.preferredDesign,
      checklist: checklistItems.length > 0 ? checklistItems : undefined,
    });

    const assignedColleague = HUDSON_CONSULTANTS.find((c) => c.id === modalAssignedTo);
    toast.success(
      modalAssignedTo !== activeStaffId
        ? `Task delegated & shared with ${assignedColleague?.name || modalAssignedTo}! 🤝`
        : "Task added to your queue!"
    );

    // Reset and close
    setModalTitle("");
    setModalDescription("");
    setModalChecklistText("");
    setIsAddModalOpen(false);
    await refreshAllTasks();
  };

  const getTaskTypeBadge = (type?: string) => {
    switch (type) {
      case "mark_up":
        return {
          label: "Mark-up Drawing (2-Day SLA)",
          icon: PenTool,
          style: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
          actionUrl: "/floorplan-editor",
          actionLabel: "Floorplan Editor",
        };
      case "call":
        return {
          label: "Call / Follow-up (Today EOD)",
          icon: Phone,
          style: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40",
          actionLabel: "Client Details",
        };
      case "estimate":
        return {
          label: "Estimate / Quote (1-Day EOD)",
          icon: Calculator,
          style: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
          actionUrl: "/quote-builder",
          actionLabel: "Quote Builder",
        };
      case "tender_submission":
        return {
          label: "Tender (ATP) (3-Day EOD)",
          icon: Send,
          style: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/40",
          actionUrl: "/tender-request",
          actionLabel: "Tender Portal",
        };
      case "re_tender":
        return {
          label: "Re-Tender / Variation",
          icon: RotateCcw,
          style: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40",
          actionUrl: "/quote-builder",
          actionLabel: "Review Quote",
        };
      case "contract":
        return {
          label: "Contract Review & Signing",
          icon: FileCheck,
          style: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/40",
          actionLabel: "Client Details",
        };
      case "site_visit":
        return {
          label: "Site Inspection / Soil DWG",
          icon: Building2,
          style: "bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/40",
          actionLabel: "Client Details",
        };
      default:
        return {
          label: "Admin / Task",
          icon: CheckSquare,
          style: "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/40",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Live Metrics Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className={`text-xl font-black tracking-tight ${isLight ? "text-slate-900" : "text-white"}`}>
              Colleague &amp; Team Shared Tasks
            </h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30 uppercase tracking-widest">
              Live Real-Time Sync
            </span>
          </div>
          <p className={`text-xs mt-1 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            Collaborate on client mark-ups (2-day SLA), call follow-ups, estimates, and tenders. Share &amp; delegate seamlessly across all Hudson Homes colleagues.
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
            isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-900 border-slate-800"
          }`}>
            <span className="text-[11px] font-semibold text-slate-400">Total Active:</span>
            <span className={`text-xs font-black ${isLight ? "text-slate-900" : "text-white"}`}>
              {totalActiveCount}
            </span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
            isLight ? "bg-amber-50/70 border-amber-200" : "bg-amber-950/30 border-amber-500/40"
          }`}>
            <span className="text-[11px] font-semibold text-amber-500">My Tasks:</span>
            <span className="text-xs font-black text-amber-500">
              {myTasksCount}
            </span>
          </div>

          {overdueCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl border border-rose-500/50 bg-rose-500/15 text-rose-500 flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-[11px] font-bold">Overdue: {overdueCount}</span>
            </div>
          )}

          {dueTodayCount > 0 && (
            <div className="px-3 py-1.5 rounded-xl border border-amber-500/50 bg-amber-500/15 text-amber-500 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-[11px] font-bold">Due Today: {dueTodayCount}</span>
            </div>
          )}

          <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 ${
            isLight ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-emerald-950/30 border-emerald-800 text-emerald-400"
          }`}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-[11px] font-bold">Smashed: {smashedOutCount}</span>
          </div>

          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20 shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule &amp; Share Task</span>
          </Button>
        </div>
      </div>

      {/* Filter and Collaboration Controls Bar */}
      <div className={`p-4 rounded-2xl border space-y-3 ${
        isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-900/80 border-slate-800"
      }`}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* View Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFilterView("all")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterView === "all"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              🌐 All Shared Tasks ({totalActiveCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterView("my")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterView === "my"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              🌟 My Queue ({myTasksCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterView("delegated")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                filterView === "delegated"
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              🤝 Delegated by Me
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks, clients, estates, colleagues, notes..."
              className={`pl-9 text-xs h-9 ${
                isLight ? "bg-white border-slate-300" : "bg-slate-950 border-slate-700 text-white"
              }`}
            />
          </div>
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
          {/* Colleague Filter */}
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <select
              value={filterColleague}
              onChange={(e) => setFilterColleague(e.target.value)}
              className={`h-8 rounded-lg border px-2.5 text-xs font-semibold ${
                isLight ? "bg-white border-slate-300 text-slate-800" : "bg-slate-950 border-slate-700 text-slate-200"
              }`}
            >
              <option value="all">Colleague: Everyone</option>
              {HUDSON_CONSULTANTS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.id === activeStaffId ? "(You)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Urgency Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={`h-8 rounded-lg border px-2.5 text-xs font-semibold ${
              isLight ? "bg-white border-slate-300 text-slate-800" : "bg-slate-950 border-slate-700 text-slate-200"
            }`}
          >
            <option value="all">Status: All Active &amp; Done</option>
            <option value="overdue">🚨 Overdue Deadlines</option>
            <option value="today">⚡ Due Today (5PM EOD)</option>
            <option value="upcoming">📅 Upcoming Tasks</option>
            <option value="completed">✓ Completed History</option>
          </select>

          {/* Task Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className={`h-8 rounded-lg border px-2.5 text-xs font-semibold ${
              isLight ? "bg-white border-slate-300 text-slate-800" : "bg-slate-950 border-slate-700 text-slate-200"
            }`}
          >
            <option value="all">Type: All Types</option>
            <option value="mark_up">📐 Client Mark-up Drawings (2-Day SLA)</option>
            <option value="call">📞 Client Call / Follow-up</option>
            <option value="estimate">🧮 Estimate &amp; Pricing</option>
            <option value="tender_submission">📨 Tender Submission (ATP)</option>
            <option value="re_tender">🔄 Re-Tender Variation</option>
            <option value="contract">📑 Contract Signing</option>
            <option value="site_visit">🏗️ Site / Engineering DWG</option>
            <option value="general">📋 General Team Admin</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={`h-8 rounded-lg border px-2.5 text-xs font-semibold ${
              isLight ? "bg-white border-slate-300 text-slate-800" : "bg-slate-950 border-slate-700 text-slate-200"
            }`}
          >
            <option value="all">Priority: All</option>
            <option value="urgent">🔥 Urgent Priority</option>
            <option value="high">⚡ High Priority</option>
            <option value="normal">Normal Priority</option>
            <option value="low">Low Priority</option>
          </select>

          {(filterColleague !== "all" || filterCategory !== "all" || filterType !== "all" || filterPriority !== "all" || searchTerm) && (
            <button
              type="button"
              onClick={() => {
                setFilterColleague("all");
                setFilterCategory("all");
                setFilterType("all");
                setFilterPriority("all");
                setSearchTerm("");
              }}
              className="text-[11px] text-amber-500 hover:underline font-bold px-2 py-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isLight ? "bg-white border-slate-200 text-slate-500" : "bg-slate-900/40 border-slate-800 text-slate-400"
        }`}>
          <CheckSquare className="h-10 w-10 mx-auto text-amber-500 opacity-60 mb-3" />
          <h3 className={`text-base font-bold ${isLight ? "text-slate-800" : "text-white"}`}>
            No Tasks Match Selected Filters
          </h3>
          <p className="text-xs mt-1 max-w-sm mx-auto">
            All caught up! You can schedule a new task or share work with colleagues using the button below.
          </p>
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Schedule Follow-up Task
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const { urgency, countdownText, badgeStyle } = getTaskSlaUrgency(task.dueAt || task.dueDate, task.completed);
            const typeConfig = getTaskTypeBadge(task.type);
            const TypeIcon = typeConfig.icon;
            const assignedColleague = HUDSON_CONSULTANTS.find((c) => c.id === task.assignedTo);
            const isAssignedToMe = task.assignedTo === activeStaffId;
            const targetLead = leads.find((l) => l.id === task.leadId);

            return (
              <div
                key={task.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all space-y-3.5 shadow-sm ${
                  task.completed
                    ? isLight
                      ? "bg-slate-50/70 border-slate-200 opacity-70"
                      : "bg-slate-950/40 border-slate-800/60 opacity-60"
                    : urgency === "overdue"
                    ? isLight
                      ? "bg-rose-50/70 border-rose-300 hover:border-rose-400"
                      : "bg-rose-950/20 border-rose-800/80 hover:border-rose-600"
                    : isLight
                    ? "bg-white border-slate-200/90 hover:border-slate-300 shadow-slate-100"
                    : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                }`}
              >
                {/* Top Telemetry Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => handleToggleTask(task)}
                      className="h-4 w-4 rounded border-slate-600 text-emerald-500 focus:ring-emerald-500 cursor-pointer shrink-0"
                    />

                    {/* Task Type Badge */}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${typeConfig.style}`}>
                      <TypeIcon className="h-3 w-3 shrink-0" />
                      <span>{typeConfig.label}</span>
                    </span>

                    {/* Priority Badge */}
                    {task.priority === "urgent" && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500 text-white flex items-center gap-0.5">
                        <Flame className="h-2.5 w-2.5" /> Urgent
                      </span>
                    )}

                    {/* SLA Countdown Badge */}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${badgeStyle}`}>
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>{countdownText}</span>
                    </span>
                  </div>

                  {/* Top-Right Quick Share & Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      title="Copy task briefing to clipboard (Slack / Teams / SMS)"
                      onClick={() => handleCopyTaskBriefing(task)}
                      className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                        isLight
                          ? "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          : "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Copy className="h-3 w-3" />
                      <span className="text-[10px] font-semibold hidden sm:inline">Copy Briefing</span>
                    </button>

                    <button
                      type="button"
                      title="Share directly into CRM Team Chat channel"
                      onClick={() => handleShareToTeamChat(task)}
                      className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                        isLight
                          ? "border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                          : "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Share2 className="h-3 w-3 text-cyan-400" />
                      <span className="text-[10px] font-semibold hidden sm:inline">Post in Chat</span>
                    </button>

                    <button
                      type="button"
                      title="Delete task"
                      onClick={() => handleDelete(task.id, task.leadId)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Content Row: Title, Description, Client Linkages */}
                <div className="pl-6 space-y-1.5">
                  <h3
                    className={`text-sm sm:text-base font-extrabold tracking-tight ${
                      task.completed
                        ? "line-through text-slate-400 dark:text-slate-600"
                        : isLight
                        ? "text-slate-900"
                        : "text-white"
                    }`}
                  >
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className={`text-xs leading-relaxed ${isLight ? "text-slate-600" : "text-slate-300"}`}>
                      {task.description}
                    </p>
                  )}

                  {/* Client Context Tag */}
                  {(task.clientName || targetLead) && (
                    <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                      <span className="text-slate-400">Client:</span>
                      {targetLead ? (
                        <button
                          type="button"
                          onClick={() => onOpenLead(targetLead)}
                          className="font-bold text-amber-500 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <User className="h-3 w-3" />
                          <span>{targetLead.clientName}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="font-bold text-amber-400 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>{task.clientName}</span>
                        </span>
                      )}

                      {task.estate && (
                        <span className="text-slate-400 font-medium">
                          • {task.estate}
                        </span>
                      )}

                      {task.designName && (
                        <span className="text-slate-400 font-medium">
                          • {task.designName}
                        </span>
                      )}

                      {/* Quick Call & SMS if mobile is present */}
                      {(task.clientMobile || targetLead?.mobile) && onQuickAction && targetLead && !task.completed && (
                        <div className="flex items-center gap-1 pl-2">
                          <button
                            type="button"
                            title={`Call ${task.clientName || targetLead.clientName}`}
                            onClick={() => onQuickAction(targetLead, "call")}
                            className="p-1 rounded bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Phone className="h-2.5 w-2.5" /> Call
                          </button>
                          <button
                            type="button"
                            title={`SMS ${task.clientName || targetLead.clientName}`}
                            onClick={() => onQuickAction(targetLead, "sms")}
                            className="p-1 rounded bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="h-2.5 w-2.5" /> SMS
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Direct Tool Launch Button */}
                  {typeConfig.actionUrl && !task.completed && (
                    <div className="pt-1.5">
                      <Link
                        to={typeConfig.actionUrl}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-xs ${
                          isLight
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                            : "bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
                        }`}
                      >
                        <TypeIcon className="h-3.5 w-3.5 text-amber-500" />
                        <span>Launch {typeConfig.actionLabel || "Tool"}</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  {/* Checklist (if any) */}
                  {task.checklist && task.checklist.length > 0 && (
                    <div className={`mt-2 p-3 rounded-xl border space-y-1.5 ${
                      isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        Task Checklist ({task.checklist.filter((c) => c.completed).length}/{task.checklist.length}):
                      </span>
                      {task.checklist.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 text-xs cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleChecklist(task.id, item.id, item.completed, task.leadId)}
                            className="h-3.5 w-3.5 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                          />
                          <span className={item.completed ? "line-through text-slate-400" : isLight ? "text-slate-700" : "text-slate-200"}>
                            {item.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Colleague Collaboration & Assignment Footer Bar */}
                <div className={`pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  isLight ? "border-slate-100" : "border-slate-800/80"
                }`}>
                  {/* Left: Colleague Assigned & Delegated Info */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black text-[10px] flex items-center justify-center shadow-xs">
                        {assignedColleague?.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("") || "HT"}
                      </div>
                      <span className={`font-semibold ${isLight ? "text-slate-800" : "text-slate-200"}`}>
                        {assignedColleague?.name || task.assignedTo || "Entire Team"}
                        {isAssignedToMe && " (You)"}
                      </span>
                    </div>

                    {task.delegatedBy && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                        🤝 Delegated by {task.delegatedBy}
                      </span>
                    )}

                    {task.completedBy && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        ✓ Completed by {task.completedBy}
                      </span>
                    )}
                  </div>

                  {/* Right: Quick Colleague Reassign & Notes Toggles */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Reassign / Share Dropdown */}
                    {!task.completed && (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400 hidden sm:inline">Reassign:</span>
                        <select
                          value={task.assignedTo || ""}
                          onChange={(e) => handleReassignColleague(task, e.target.value)}
                          className={`h-7 text-[11px] rounded-lg border px-2 font-bold cursor-pointer transition-colors ${
                            isLight
                              ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                              : "bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300"
                          }`}
                          title="Share / Reassign to Colleague"
                        >
                          {HUDSON_CONSULTANTS.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.id === activeStaffId ? "(You)" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Discussion Comments Toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        setActiveNotesTaskId(activeNotesTaskId === task.id ? null : task.id)
                      }
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        (task.notes && task.notes.length > 0) || activeNotesTaskId === task.id
                          ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                          : isLight
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      }`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>{task.notes?.length || 0}</span>
                      {activeNotesTaskId === task.id ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Discussion Comments Thread */}
                {activeNotesTaskId === task.id && (
                  <div className={`mt-3 p-3.5 rounded-xl border space-y-3 ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-slate-800"
                  }`}>
                    <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                      💬 Colleague Discussion &amp; Updates ({task.notes?.length || 0})
                    </span>

                    {/* Note List */}
                    {task.notes && task.notes.length > 0 ? (
                      <div className="space-y-2">
                        {task.notes.map((note) => (
                          <div
                            key={note.id}
                            className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                              isLight ? "bg-white border-slate-200 text-slate-800" : "bg-slate-900 border-slate-800 text-slate-200"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                              <span className="font-bold text-amber-500">{note.author}</span>
                              <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <p>{note.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic py-1">
                        No comments yet. Write a note or handover update for your colleagues below.
                      </p>
                    )}

                    {/* Add Note Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        value={newNoteInput[task.id] || ""}
                        onChange={(e) =>
                          setNewNoteInput((prev) => ({ ...prev, [task.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAddNote(task.id, task.leadId);
                          }
                        }}
                        placeholder="Write note / handover update for colleagues (Press Enter)..."
                        className={`text-xs h-8 ${
                          isLight ? "bg-white border-slate-300" : "bg-slate-900 border-slate-700 text-white"
                        }`}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddNote(task.id, task.leadId)}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-3 cursor-pointer shrink-0"
                      >
                        Post
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule & Share Task Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent
          className={`w-[95vw] max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 rounded-2xl ${
            isLight ? "bg-white text-slate-900 border-slate-200" : "bg-slate-950 text-slate-100 border-slate-800"
          }`}
        >
          <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <DialogTitle className="text-lg font-black flex items-center gap-2 text-amber-500">
              <CheckSquare className="h-5 w-5" />
              Schedule &amp; Share Task with Colleagues
            </DialogTitle>
          </DialogHeader>

          {/* Quick Presets */}
          <div className="pt-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              ⚡ Quick Fill Presets:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SMART_TASK_PRESETS.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                      modalType === p.type && modalTitle === p.title
                        ? "bg-amber-500/15 border-amber-500/50 shadow-xs"
                        : isLight
                        ? "bg-slate-50 border-slate-200 hover:border-amber-400 hover:bg-white"
                        : "bg-slate-900 border-slate-800 hover:border-amber-500/50 hover:bg-slate-850"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className={`text-xs font-bold block ${isLight ? "text-slate-900" : "text-white"}`}>
                        {p.title}
                      </span>
                      <span className="text-[10px] text-slate-400 block line-clamp-1 mt-0.5">
                        {p.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleCreateTaskSubmit} className="space-y-4 pt-3 text-xs">
            {/* Task Title */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-400">Task Title / Subject *</Label>
              <Input
                required
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
                placeholder="e.g. Mark-up Jasper 26 - Extended Alfresco & Butler's Pantry"
                className={`h-9 text-xs font-semibold ${
                  isLight ? "bg-white border-slate-300" : "border-slate-700 bg-slate-900 text-white"
                }`}
              />
            </div>

            {/* Task Type & Priority Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-400">Task Category</Label>
                <select
                  value={modalType}
                  onChange={(e) => setModalType(e.target.value as CrmTaskType)}
                  className={`w-full h-9 rounded-lg border px-3 text-xs font-semibold ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                >
                  <option value="mark_up">📐 Client Mark-up Drawing (2-Day SLA)</option>
                  <option value="call">📞 Phone Call / Follow-up (Today EOD)</option>
                  <option value="estimate">🧮 Create Estimate / Quote (1-Day EOD)</option>
                  <option value="tender_submission">📨 Tender Submission (ATP) (3-Day EOD)</option>
                  <option value="re_tender">🔄 Re-Tender / Variation Review</option>
                  <option value="contract">📑 Building Contract &amp; Signing</option>
                  <option value="site_visit">🏗️ Site Inspection / Contour DWG</option>
                  <option value="general">📋 General Team Admin</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-400">Priority Level</Label>
                <select
                  value={modalPriority}
                  onChange={(e) => setModalPriority(e.target.value as any)}
                  className={`w-full h-9 rounded-lg border px-3 text-xs font-semibold ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                >
                  <option value="urgent">🔥 Urgent Priority</option>
                  <option value="high">⚡ High Priority</option>
                  <option value="normal">Normal Priority</option>
                  <option value="low">Low Priority</option>
                </select>
              </div>
            </div>

            {/* Colleague Assignment & Client Linkage Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-400">Assign &amp; Share With Colleague *</Label>
                <select
                  value={modalAssignedTo}
                  onChange={(e) => setModalAssignedTo(e.target.value)}
                  className={`w-full h-9 rounded-lg border px-3 text-xs font-bold ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-amber-300"
                  }`}
                >
                  {HUDSON_CONSULTANTS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.displayOffice}) {c.id === activeStaffId ? "★ (Assign to Myself)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-400">Link to Client Lead (Optional)</Label>
                <select
                  value={modalSelectedLeadId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setModalSelectedLeadId(val);
                    const lead = leads.find((l) => l.id === val);
                    if (lead?.assignedConsultantId && modalAssignedTo === activeStaffId) {
                      setModalAssignedTo(lead.assignedConsultantId);
                    }
                  }}
                  className={`w-full h-9 rounded-lg border px-3 text-xs ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                >
                  <option value="none">None (Internal / General Task)</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.clientName} — {l.preferredDesign} ({l.targetEstate})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SLA Days & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-400">SLA Turnaround Preset</Label>
                <select
                  value={modalSlaDays}
                  onChange={(e) => {
                    const days = parseInt(e.target.value, 10);
                    setModalSlaDays(days);
                    setModalCustomDue(
                      days === 0
                        ? "Today 5:00 PM"
                        : days === 1
                        ? "Tomorrow 5:00 PM"
                        : `In ${days} days (5:00 PM)`
                    );
                  }}
                  className={`w-full h-9 rounded-lg border px-3 text-xs font-semibold ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                >
                  <option value={0}>⚡ Today 5:00 PM (EOD)</option>
                  <option value={1}>🔥 Tomorrow 5:00 PM (1 Day EOD)</option>
                  <option value={2}>⭐ 2 Days EOD (Standard for Mark-ups)</option>
                  <option value={3}>📆 3 Days EOD (Standard for Tenders &amp; Contracts)</option>
                  <option value={5}>📅 5 Business Days (1 Week)</option>
                  <option value={7}>🗓️ 7 Days Turnaround</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-400">Due Date Display Label</Label>
                <Input
                  value={modalCustomDue}
                  onChange={(e) => setModalCustomDue(e.target.value)}
                  placeholder="e.g. In 2 days (5:00 PM)"
                  className={`h-9 text-xs ${
                    isLight ? "bg-white border-slate-300" : "border-slate-700 bg-slate-900 text-white"
                  }`}
                />
              </div>
            </div>

            {/* Description & Notes */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-400">Briefing &amp; Instructions for Colleague</Label>
              <Textarea
                rows={3}
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
                placeholder="Specific instructions for your colleague (e.g. Client requested 2.4m extension on rear alfresco, cavity slider to pantry, attach PDF redline)..."
                className={`text-xs ${
                  isLight ? "bg-white border-slate-300" : "border-slate-700 bg-slate-900 text-white"
                }`}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-400">
                Action Checklist Items (One per line)
              </Label>
              <Textarea
                rows={3}
                value={modalChecklistText}
                onChange={(e) => setModalChecklistText(e.target.value)}
                placeholder="Extend rear alfresco by 2.4m&#10;Add cavity sliding door to pantry&#10;Export redline PDF and attach to quote"
                className={`text-xs font-mono ${
                  isLight ? "bg-white border-slate-300" : "border-slate-700 bg-slate-900 text-white"
                }`}
              />
            </div>

            {/* Submit Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                Assigned by: <strong>{activeStaffName}</strong>
              </span>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5 cursor-pointer shadow-md"
                >
                  <Plus className="h-4 w-4" /> Schedule &amp; Share Task
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

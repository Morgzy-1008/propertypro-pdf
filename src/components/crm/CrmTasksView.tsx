import React, { useState } from "react";
import {
  CrmLead,
  CrmTask,
  HUDSON_CONSULTANTS,
} from "@/lib/crm/crmTypes";
import {
  updateLeadTask,
  addLeadTask,
  deleteLeadTask,
  snoozeLeadTask,
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
  ChevronDown,
  Repeat,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface EnrichedTask {
  task: CrmTask;
  lead: CrmLead;
  category: "overdue" | "today" | "upcoming" | "completed";
}

const SMART_TASK_PRESETS = [
  { title: "Follow-up phone consultation", due: "Tomorrow 10am", type: "call" as const, priority: "high" as const },
  { title: "Review revised concept plan & siting", due: "In 2 days", type: "quote_revision" as const, priority: "normal" as const },
  { title: "LVM Follow-up: 2nd call attempt", due: "In 48 hours", type: "lvm_followup" as const, priority: "normal" as const },
  { title: "Tender Request preparation & ATP review", due: "This Friday 4pm", type: "tr_prep" as const, priority: "urgent" as const },
  { title: "Verify soil test & contour engineering DWG", due: "In 3 days", type: "site_visit" as const, priority: "high" as const },
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

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New task form state
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id || "");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("Tomorrow");
  const [taskPriority, setTaskPriority] = useState<"urgent" | "high" | "normal" | "low">("normal");
  const [taskType, setTaskType] = useState<"call" | "tr_prep" | "lvm_followup" | "quote_revision" | "site_visit" | "general">("call");
  const [taskAssignedConsultant, setTaskAssignedConsultant] = useState<string>(
    leads[0]?.assignedConsultantId || "morgan_hales"
  );
  const [isDelegatedByAssistant, setIsDelegatedByAssistant] = useState(false);

  // Flatten and categorize all tasks
  const allTasks: EnrichedTask[] = [];
  const todayStr = new Date().toISOString().split("T")[0];

  leads.forEach((lead) => {
    if (
      selectedConsultantId !== "all" &&
      lead.assignedConsultantId !== selectedConsultantId
    ) {
      return;
    }

    (lead.tasks || []).forEach((t) => {
      let category: EnrichedTask["category"] = "upcoming";

      if (t.completed) {
        category = "completed";
      } else {
        const lowerDue = (t.dueDate || "").toLowerCase();
        if (
          lowerDue.includes("overdue") ||
          lowerDue.includes("yesterday") ||
          (t.dueDate && t.dueDate < todayStr && !t.completed)
        ) {
          category = "overdue";
        } else if (
          lowerDue.includes("today") ||
          t.dueDate === todayStr ||
          lowerDue.includes("urgent")
        ) {
          category = "today";
        } else {
          category = "upcoming";
        }
      }

      allTasks.push({ task: t, lead, category });
    });
  });

  const overdueTasks = allTasks.filter((t) => t.category === "overdue");
  const todayTasks = allTasks.filter((t) => t.category === "today");
  const upcomingTasks = allTasks.filter((t) => t.category === "upcoming");
  const completedTasks = allTasks.filter((t) => t.category === "completed");

  const handleToggleTask = async (leadId: string, taskId: string, completed: boolean) => {
    await updateLeadTask(leadId, taskId, completed);
    onTasksUpdated();
    toast.success(completed ? "Task marked as complete! ✓" : "Task restored to active.");
  };

  const handleSnoozeTask = async (leadId: string, taskId: string, newDue: string) => {
    await snoozeLeadTask(leadId, taskId, newDue);
    onTasksUpdated();
    toast.success(`Task rescheduled to ${newDue}`);
  };

  const handleDeleteTask = async (leadId: string, taskId: string) => {
    await deleteLeadTask(leadId, taskId);
    onTasksUpdated();
    toast.info("Task removed.");
  };

  const handleApplyPreset = (preset: typeof SMART_TASK_PRESETS[0]) => {
    setTaskTitle(preset.title);
    setTaskDueDate(preset.due);
    setTaskType(preset.type);
    setTaskPriority(preset.priority);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }
    if (!selectedLeadId) {
      toast.error("Please select a client for this task.");
      return;
    }

    const staffUser = getActiveStaffUser();
    const targetLead = leads.find((l) => l.id === selectedLeadId);
    const assigned =
      taskAssignedConsultant ||
      (selectedConsultantId !== "all" ? selectedConsultantId : targetLead?.assignedConsultantId) ||
      "morgan_hales";

    await addLeadTask(selectedLeadId, {
      title: taskTitle.trim(),
      dueDate: taskDueDate.trim() || "Tomorrow",
      completed: false,
      assignedTo: assigned,
      priority: taskPriority,
      type: taskType,
      delegatedBy: isDelegatedByAssistant ? staffUser?.name || "Assistant / Admin" : undefined,
    });

    toast.success(
      isDelegatedByAssistant
        ? `Task delegated to ${HUDSON_CONSULTANTS.find((c) => c.id === assigned)?.name || assigned}!`
        : "Follow-up task scheduled!"
    );
    setTaskTitle("");
    setIsDelegatedByAssistant(false);
    setIsAddModalOpen(false);
    onTasksUpdated();
  };

  const filteredTasks = allTasks.filter((item) => {
    const matchesSearch =
      item.task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lead.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lead.targetEstate.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      filterCategory === "all" || item.category === filterCategory;

    const matchesPriority =
      filterPriority === "all" || item.task.priority === filterPriority;

    return matchesSearch && matchesCategory && matchesPriority;
  });

  const renderTaskSection = (
    title: string,
    tasksList: EnrichedTask[],
    icon: React.ReactNode,
    badgeColor: string,
    borderColor: string
  ) => {
    if (tasksList.length === 0 && filterCategory !== "all") return null;

    return (
      <div className={`rounded-2xl border ${borderColor} ${
        isLight ? "bg-white shadow-xs" : "bg-slate-900/60"
      } p-4 sm:p-5 space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-900" : "text-white"}`}>
              {title}
            </h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
              {tasksList.length}
            </span>
          </div>
        </div>

        {tasksList.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 italic">
            No {title.toLowerCase()} right now.
          </p>
        ) : (
          <div className="space-y-2">
            {tasksList.map(({ task, lead }) => (
              <div
                key={task.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                  task.completed
                    ? isLight ? "bg-slate-50 border-slate-200 opacity-60" : "bg-slate-950/40 border-slate-800 opacity-60"
                    : task.priority === "urgent"
                    ? isLight ? "bg-rose-50/70 border-rose-200 hover:border-rose-400" : "bg-rose-950/20 border-rose-800/60 hover:border-rose-600"
                    : isLight ? "bg-white border-slate-200 hover:border-slate-300" : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => handleToggleTask(lead.id, task.id, e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {task.priority === "urgent" && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-rose-500 text-white flex items-center gap-0.5">
                          <Flame className="h-2.5 w-2.5" /> Urgent
                        </span>
                      )}
                      {lead.isTopTrTarget && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40">
                          #{lead.trPriorityRank || 1} TR Target
                        </span>
                      )}
                      <span
                        className={`text-xs font-semibold block ${
                          task.completed
                            ? "line-through text-slate-500"
                            : isLight ? "text-slate-900" : "text-slate-100"
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                      <button
                        type="button"
                        onClick={() => onOpenLead(lead)}
                        className="text-amber-500 hover:underline font-bold flex items-center gap-1"
                      >
                        <User className="h-3 w-3" />
                        {lead.clientName}
                      </button>
                      <span>•</span>
                      <span>Lot {lead.lotNumber || "TBA"}, {lead.targetEstate}</span>
                      <span>•</span>
                      <span className="text-slate-300 font-medium">{lead.preferredDesign}</span>
                      {task.assignedTo && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300 font-medium">
                            NHC: {HUDSON_CONSULTANTS.find((c) => c.id === task.assignedTo)?.name.split(" ")[0] || task.assignedTo}
                          </span>
                        </>
                      )}
                      {task.delegatedBy && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          🤝 Delegated by {task.delegatedBy}
                        </span>
                      )}
                      {task.dueDate && (
                        <>
                          <span>•</span>
                          <span
                            className={`font-mono font-bold ${
                              task.completed
                                ? "text-slate-500"
                                : task.dueDate.toLowerCase().includes("today")
                                ? "text-amber-400"
                                : task.dueDate.toLowerCase().includes("overdue")
                                ? "text-rose-400"
                                : "text-cyan-400"
                            }`}
                          >
                            Due: {task.dueDate}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Task Actions: Quick Call, Quick SMS, Quick Snooze, Delete */}
                <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                  {onQuickAction && lead.mobile && !task.completed && (
                    <>
                      <button
                        type="button"
                        title={`Quick Call ${lead.clientName}`}
                        onClick={() => onQuickAction(lead, "call")}
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-amber-500 hover:bg-amber-500/10"
                      >
                        <Phone className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title={`Quick SMS ${lead.clientName}`}
                        onClick={() => onQuickAction(lead, "sms")}
                        className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-cyan-400 hover:bg-cyan-500/10"
                      >
                        <MessageSquare className="h-3 w-3" />
                      </button>
                    </>
                  )}

                  {/* Snooze Presets */}
                  {!task.completed && (
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleSnoozeTask(lead.id, task.id, e.target.value);
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                      className={`h-7 text-[10px] rounded-md border px-1.5 font-medium ${
                        isLight ? "bg-slate-100 border-slate-300 text-slate-700" : "bg-slate-900 border-slate-700 text-slate-300"
                      }`}
                      title="Reschedule / Snooze Task"
                    >
                      <option value="" disabled>Snooze...</option>
                      <option value="Tomorrow 9am">Tomorrow 9am</option>
                      <option value="In 2 days">In 2 days</option>
                      <option value="This Friday">This Friday</option>
                      <option value="Next Monday">Next Monday</option>
                    </select>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenLead(lead)}
                    className="h-7 text-[11px] text-slate-400 hover:text-white px-2"
                  >
                    View <ArrowUpRight className="h-3 w-3 ml-0.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTask(lead.id, task.id)}
                    className="h-7 w-7 p-0 text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Due Notification Banner */}
      {(overdueTasks.length > 0 || todayTasks.length > 0) && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl ${
          isLight ? "bg-amber-50 border-amber-200" : "bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-slate-950 border-amber-500/40"
        }`}>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className={`font-bold text-xs uppercase tracking-wider block ${isLight ? "text-slate-900" : "text-white"}`}>
                NHC Follow-up Action Required
              </span>
              <p className={`text-xs mt-0.5 ${isLight ? "text-amber-900" : "text-amber-300/90"}`}>
                You have {overdueTasks.length > 0 && <strong className="text-rose-600 dark:text-rose-400">{overdueTasks.length} overdue</strong>}
                {overdueTasks.length > 0 && todayTasks.length > 0 && " and "}
                {todayTasks.length > 0 && <strong>{todayTasks.length} due today</strong>}.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {overdueTasks.length > 0 && (
              <Button
                size="sm"
                onClick={() => setFilterCategory("overdue")}
                className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 shadow-md"
              >
                View {overdueTasks.length} Overdue
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setFilterCategory("today")}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 shadow-md"
            >
              Focus Today&apos;s Tasks
            </Button>
          </div>
        </div>
      )}

      {/* Filter & Actions Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border ${
        isLight ? "bg-white border-slate-200" : "bg-slate-900/80 border-slate-800"
      }`}>
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks, clients, or estates..."
              className={`h-9 pl-9 text-xs ${
                isLight ? "bg-white border-slate-300" : "border-slate-800 bg-slate-950 text-white"
              }`}
            />
          </div>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className={`h-9 text-xs w-36 ${
              isLight ? "border-slate-300 bg-white" : "border-slate-800 bg-slate-950 text-slate-200"
            }`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={isLight ? "bg-white" : "border-slate-800 bg-slate-950 text-slate-100"}>
              <SelectItem value="all">All Tasks ({allTasks.length})</SelectItem>
              <SelectItem value="overdue">Overdue ({overdueTasks.length})</SelectItem>
              <SelectItem value="today">Due Today ({todayTasks.length})</SelectItem>
              <SelectItem value="upcoming">Upcoming ({upcomingTasks.length})</SelectItem>
              <SelectItem value="completed">Completed ({completedTasks.length})</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className={`h-9 text-xs w-32 ${
              isLight ? "border-slate-300 bg-white" : "border-slate-800 bg-slate-950 text-slate-200"
            }`}>
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className={isLight ? "bg-white" : "border-slate-800 bg-slate-950 text-slate-100"}>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">🔥 Urgent</SelectItem>
              <SelectItem value="high">⚡ High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs gap-1.5 shadow-md shadow-amber-500/20 shrink-0"
        >
          <Plus className="h-4 w-4" />
          Schedule Follow-up Task
        </Button>
      </div>

      {/* Task Sections Grid */}
      <div className="space-y-4">
        {filterCategory === "all" || filterCategory === "overdue" ? (
          renderTaskSection(
            "Overdue Tasks",
            filterCategory === "all" ? overdueTasks : filteredTasks,
            <AlertTriangle className="h-4 w-4 text-rose-500" />,
            "bg-rose-950/80 text-rose-300 border border-rose-800/80",
            "border-rose-500/30"
          )
        ) : null}

        {filterCategory === "all" || filterCategory === "today" ? (
          renderTaskSection(
            "Tasks Due Today",
            filterCategory === "all" ? todayTasks : filteredTasks,
            <Clock className="h-4 w-4 text-amber-500" />,
            "bg-amber-950/80 text-amber-300 border border-amber-800/80",
            "border-amber-500/30"
          )
        ) : null}

        {filterCategory === "all" || filterCategory === "upcoming" ? (
          renderTaskSection(
            "Upcoming Scheduled Tasks",
            filterCategory === "all" ? upcomingTasks : filteredTasks,
            <Calendar className="h-4 w-4 text-cyan-400" />,
            "bg-cyan-950/80 text-cyan-300 border border-cyan-800/80",
            "border-cyan-500/30"
          )
        ) : null}

        {filterCategory === "all" || filterCategory === "completed" ? (
          renderTaskSection(
            "Completed Follow-up History",
            filterCategory === "all" ? completedTasks : filteredTasks,
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
            "bg-emerald-950/80 text-emerald-300 border border-emerald-800/80",
            isLight ? "border-slate-200" : "border-slate-800"
          )
        ) : null}
      </div>

      {/* Add Task Modal with Smart Presets */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className={`w-[95vw] max-w-lg p-5 rounded-2xl ${
          isLight ? "bg-white text-slate-900 border-slate-200" : "bg-slate-950 text-slate-100 border-slate-800"
        }`}>
          <DialogHeader className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-500">
              <CheckSquare className="h-5 w-5" />
              Schedule Follow-up Task
            </DialogTitle>
          </DialogHeader>

          {/* Smart Presets */}
          <div className="pt-2">
            <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
              ⚡ Quick Fill Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SMART_TASK_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`text-[10px] font-medium px-2 py-1 rounded-md border transition-all ${
                    isLight
                      ? "bg-slate-100 border-slate-200 hover:border-amber-500 text-slate-800"
                      : "bg-slate-900 border-slate-800 hover:border-amber-400 text-slate-300"
                  }`}
                >
                  + {p.title}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateTask} className="space-y-3.5 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Assign To Client</Label>
              <select
                value={selectedLeadId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedLeadId(val);
                  const l = leads.find((x) => x.id === val);
                  if (l?.assignedConsultantId) setTaskAssignedConsultant(l.assignedConsultantId);
                }}
                className={`w-full h-9 rounded-lg border px-3 text-xs ${
                  isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                }`}
              >
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.clientName} — {l.preferredDesign} ({l.targetEstate})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Assign To NHC / Consultant</Label>
                <select
                  value={taskAssignedConsultant}
                  onChange={(e) => setTaskAssignedConsultant(e.target.value)}
                  className={`w-full h-9 rounded-lg border px-3 text-xs ${
                    isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                  }`}
                >
                  {HUDSON_CONSULTANTS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.title})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                  isDelegatedByAssistant
                    ? "bg-purple-950/40 border-purple-500/60 text-purple-200"
                    : isLight
                    ? "bg-slate-50 border-slate-200 text-slate-700"
                    : "bg-slate-900 border-slate-800 text-slate-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={isDelegatedByAssistant}
                    onChange={(e) => setIsDelegatedByAssistant(e.target.checked)}
                    className="h-3.5 w-3.5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-[11px] font-semibold">
                    🤝 Delegated by Assistant / Admin
                  </span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-slate-400">Task Title / Action Description</Label>
              <Input
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Call client regarding 2.6m ceiling variation"
                className={`h-9 text-xs ${
                  isLight ? "bg-white border-slate-300" : "border-slate-700 bg-slate-900 text-white"
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Due Date / Timing</Label>
                <Input
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  placeholder="e.g. Tomorrow 10am, Friday 4pm"
                  className={`h-9 text-xs ${
                    isLight ? "bg-white border-slate-300" : "border-slate-700 bg-slate-900 text-white"
                  }`}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-slate-400">Priority Level</Label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  className={`w-full h-9 rounded-lg border px-3 text-xs ${
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
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
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                <Plus className="h-4 w-4" /> Save Follow-up Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

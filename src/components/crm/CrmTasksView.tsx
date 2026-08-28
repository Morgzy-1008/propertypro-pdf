import React, { useState } from "react";
import {
  CrmLead,
  CrmTask,
  HUDSON_CONSULTANTS,
} from "@/lib/crm/crmTypes";
import { updateLeadTask, addLeadTask, deleteLeadTask } from "@/lib/crm/crmStorage";
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

interface CrmTasksViewProps {
  leads: CrmLead[];
  selectedConsultantId: string;
  onOpenLead: (lead: CrmLead) => void;
  onTasksUpdated: () => void;
}

interface EnrichedTask {
  task: CrmTask;
  lead: CrmLead;
  category: "overdue" | "today" | "upcoming" | "completed";
}

export function CrmTasksView({
  leads,
  selectedConsultantId,
  onOpenLead,
  onTasksUpdated,
}: CrmTasksViewProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New task form state
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id || "");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("Tomorrow");

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

  const handleDeleteTask = async (leadId: string, taskId: string) => {
    await deleteLeadTask(leadId, taskId);
    onTasksUpdated();
    toast.info("Task removed.");
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

    await addLeadTask(selectedLeadId, {
      title: taskTitle.trim(),
      dueDate: taskDueDate.trim() || "Tomorrow",
      completed: false,
      assignedTo: selectedConsultantId,
    });

    toast.success("Follow-up task scheduled!");
    setTaskTitle("");
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

    return matchesSearch && matchesCategory;
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
      <div className={`rounded-2xl border ${borderColor} ${isLight ? "bg-white shadow-xs" : "bg-slate-900/60"} p-4 sm:p-5 space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
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
                className={`flex items-start sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all ${
                  task.completed
                    ? isLight ? "bg-slate-50 border-slate-200 opacity-60" : "bg-slate-950/40 border-slate-850 opacity-60"
                    : isLight ? "bg-white border-slate-200 hover:border-slate-300" : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => handleToggleTask(lead.id, task.id, e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="space-y-0.5">
                    <span
                      className={`text-xs font-medium block ${
                        task.completed
                          ? "line-through text-slate-500"
                          : isLight ? "text-slate-900 font-semibold" : "text-slate-100"
                      }`}
                    >
                      {task.title}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-400">
                      <button
                        type="button"
                        onClick={() => onOpenLead(lead)}
                        className="text-amber-400 hover:underline font-semibold flex items-center gap-1"
                      >
                        <User className="h-3 w-3" />
                        {lead.clientName}
                      </button>
                      <span>&bull;</span>
                      <span className="text-slate-400">{lead.targetEstate}</span>
                      {task.dueDate && (
                        <>
                          <span>&bull;</span>
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

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenLead(lead)}
                    className="h-7 text-[11px] text-slate-400 hover:text-white px-2"
                  >
                    View Lead <ArrowUpRight className="h-3 w-3 ml-0.5" />
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
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-slate-950 border border-amber-500/40 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <span className="font-bold text-xs text-white uppercase tracking-wider block">
                NHC Follow-up Action Required
              </span>
              <p className="text-xs text-amber-300/90 mt-0.5">
                You have {overdueTasks.length > 0 && <strong>{overdueTasks.length} overdue</strong>}
                {overdueTasks.length > 0 && todayTasks.length > 0 && " and "}
                {todayTasks.length > 0 && <strong>{todayTasks.length} due today</strong>}.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => setFilterCategory("today")}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 shadow-md"
          >
            Focus Today&apos;s Tasks
          </Button>
        </div>
      )}

      {/* Filter & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks, clients, or estates..."
              className="h-9 pl-9 text-xs border-slate-800 bg-slate-950 text-white"
            />
          </div>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9 border-slate-800 bg-slate-950 text-xs text-slate-200 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-800 bg-slate-950 text-slate-100">
              <SelectItem value="all">All Tasks ({allTasks.length})</SelectItem>
              <SelectItem value="overdue">Overdue ({overdueTasks.length})</SelectItem>
              <SelectItem value="today">Due Today ({todayTasks.length})</SelectItem>
              <SelectItem value="upcoming">Upcoming ({upcomingTasks.length})</SelectItem>
              <SelectItem value="completed">Completed ({completedTasks.length})</SelectItem>
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
            <AlertTriangle className="h-4 w-4 text-rose-400" />,
            "bg-rose-950/80 text-rose-300 border border-rose-800/80",
            "border-rose-500/30"
          )
        ) : null}

        {filterCategory === "all" || filterCategory === "today" ? (
          renderTaskSection(
            "Tasks Due Today",
            filterCategory === "all" ? todayTasks : filteredTasks,
            <Clock className="h-4 w-4 text-amber-400" />,
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
            "border-slate-800"
          )
        ) : null}
      </div>

      {/* Add Task Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="w-[95vw] max-w-md bg-slate-950 text-slate-100 border border-slate-800 p-5 rounded-2xl">
          <DialogHeader className="border-b border-slate-800 pb-3">
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-amber-400" />
              Schedule Follow-up Task
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Assign To Client</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger className="border-slate-800 bg-slate-900 text-xs text-slate-200">
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent className="border-slate-800 bg-slate-950 text-slate-100 max-h-60">
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-xs">
                      {l.clientName} ({l.targetEstate})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Task Title / Action Required</Label>
              <Input
                required
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="e.g. Call Jordan to review revised siting plan"
                className="h-9 text-xs border-slate-800 bg-slate-900 text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300">Due Date / Reminder Timing</Label>
              <Input
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                placeholder="e.g. Today 2pm / Tomorrow / Friday / 2026-08-30"
                className="h-9 text-xs border-slate-800 bg-slate-900 text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                <Plus className="h-4 w-4" /> Save Task
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

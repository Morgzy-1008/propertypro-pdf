import React from "react";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  User,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Phone,
} from "lucide-react";
import {
  BrainDumpTask,
  TASK_TYPE_CONFIGS,
} from "@/lib/braindump/brainDumpTypes";
import {
  getDueUrgency,
  formatDueCountdown,
  smashTask,
  reopenTask,
} from "@/lib/braindump/brainDumpStorage";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface BrainDumpKanbanProps {
  tasks: BrainDumpTask[];
  isLight: boolean;
  currentUser: string;
  onAction?: () => void;
}

export function BrainDumpKanban({
  tasks,
  isLight,
  currentUser,
  onAction,
}: BrainDumpKanbanProps) {
  // Sort tasks into 4 kanban columns
  const overdueTasks: BrainDumpTask[] = [];
  const todayTasks: BrainDumpTask[] = [];
  const upcomingTasks: BrainDumpTask[] = [];
  const completedTasks: BrainDumpTask[] = [];

  for (const t of tasks) {
    if (t.status === "completed") {
      completedTasks.push(t);
      continue;
    }
    const urgency = getDueUrgency(t.dueAt, false);
    if (urgency === "overdue") {
      overdueTasks.push(t);
    } else if (urgency === "due_today") {
      todayTasks.push(t);
    } else {
      upcomingTasks.push(t);
    }
  }

  const handleSmash = (taskId: string) => {
    smashTask(taskId, currentUser);
    toast.success("💥 Task Smashed Out!");
    onAction?.();
  };

  const handleReopen = (taskId: string) => {
    reopenTask(taskId);
    toast.info("Task moved back to active");
    onAction?.();
  };

  const renderKanbanCard = (task: BrainDumpTask, isDoneCol: boolean = false) => {
    const typeConfig = TASK_TYPE_CONFIGS[task.type] || TASK_TYPE_CONFIGS.general_admin;
    const countdown = formatDueCountdown(task.dueAt, isDoneCol);

    return (
      <div
        key={task.id}
        className={`p-3.5 sm:p-4 rounded-2xl border transition-all text-left space-y-2.5 ${
          isDoneCol
            ? isLight
              ? "bg-slate-50 border-slate-200 opacity-60"
              : "bg-slate-950/40 border-slate-800/60 opacity-60"
            : isLight
            ? "bg-white border-slate-200 shadow-sm hover:shadow-md"
            : "bg-slate-900/90 border-slate-800 shadow-lg hover:border-slate-700"
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${typeConfig.badgeBg} ${typeConfig.badgeBorder} ${typeConfig.badgeText}`}
          >
            {typeConfig.shortLabel}
          </span>

          <span
            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
              task.assignee === "alyssa"
                ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                : task.assignee === "morgan"
                ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                : "bg-purple-500/15 border-purple-500/30 text-purple-400"
            }`}
          >
            {task.assignee === "alyssa" ? "Alyssa" : task.assignee === "morgan" ? "Morgan" : "Both"}
          </span>
        </div>

        <h5
          className={`text-sm font-bold leading-snug ${
            isDoneCol
              ? "line-through text-slate-400"
              : isLight
              ? "text-slate-900"
              : "text-slate-100"
          }`}
        >
          {task.title}
        </h5>

        {(task.clientName || task.designName) && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
            {task.clientName && <span className="font-semibold text-slate-300">👤 {task.clientName}</span>}
            {task.designName && <span className="font-mono">📐 {task.designName}</span>}
          </div>
        )}

        {/* Countdown */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-700/20 text-[11px]">
          <span
            className={`font-mono font-bold ${
              countdown.urgentLevel === "red"
                ? "text-rose-500 font-black animate-pulse"
                : countdown.urgentLevel === "amber"
                ? "text-amber-500"
                : "text-slate-400"
            }`}
          >
            {countdown.text}
          </span>

          {isDoneCol ? (
            <button
              type="button"
              onClick={() => handleReopen(task.id)}
              className="text-[11px] font-bold text-slate-400 hover:text-white"
            >
              Reopen
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSmash(task.id)}
              className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 cursor-pointer shadow-xs"
            >
              Smash ✓
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Column 1: Overdue */}
      <div
        className={`rounded-3xl border p-4 sm:p-5 flex flex-col ${
          isLight ? "bg-rose-50/40 border-rose-200" : "bg-rose-950/15 border-rose-900/40"
        }`}
      >
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <h4 className="text-xs font-black uppercase tracking-wider text-rose-500">
              🚨 Overdue Backlog
            </h4>
          </div>
          <Badge className="bg-rose-500 text-white font-mono font-bold">
            {overdueTasks.length}
          </Badge>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
          {overdueTasks.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-8">
              Zero overdue tasks! Outstanding job.
            </p>
          ) : (
            overdueTasks.map((t) => renderKanbanCard(t, false))
          )}
        </div>
      </div>

      {/* Column 2: Due Today */}
      <div
        className={`rounded-3xl border p-4 sm:p-5 flex flex-col ${
          isLight ? "bg-amber-50/40 border-amber-200" : "bg-amber-950/15 border-amber-900/40"
        }`}
      >
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-500">
              📋 Today's Hitlist
            </h4>
          </div>
          <Badge className="bg-amber-500 text-slate-950 font-mono font-bold">
            {todayTasks.length}
          </Badge>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
          {todayTasks.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-8">
              No more tasks due today!
            </p>
          ) : (
            todayTasks.map((t) => renderKanbanCard(t, false))
          )}
        </div>
      </div>

      {/* Column 3: Upcoming */}
      <div
        className={`rounded-3xl border p-4 sm:p-5 flex flex-col ${
          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/40 border-slate-800"
        }`}
      >
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">
              ⏳ In Progress (Upcoming)
            </h4>
          </div>
          <Badge className="bg-slate-700 text-slate-200 font-mono font-bold">
            {upcomingTasks.length}
          </Badge>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
          {upcomingTasks.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-8">
              No upcoming scheduled tasks.
            </p>
          ) : (
            upcomingTasks.map((t) => renderKanbanCard(t, false))
          )}
        </div>
      </div>

      {/* Column 4: Smashed Out */}
      <div
        className={`rounded-3xl border p-4 sm:p-5 flex flex-col ${
          isLight ? "bg-emerald-50/30 border-emerald-200" : "bg-emerald-950/10 border-emerald-900/30"
        }`}
      >
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-500">
              ✅ Smashed Out
            </h4>
          </div>
          <Badge className="bg-emerald-500 text-slate-950 font-mono font-bold">
            {completedTasks.length}
          </Badge>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px]">
          {completedTasks.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-8">
              Completed tasks will appear here.
            </p>
          ) : (
            completedTasks.map((t) => renderKanbanCard(t, true))
          )}
        </div>
      </div>
    </div>
  );
}

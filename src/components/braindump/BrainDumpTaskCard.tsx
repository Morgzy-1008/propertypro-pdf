import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  Home,
  FileText,
  User,
  Users,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  MoreVertical,
  Trash2,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Plus,
  PenTool,
  PhoneCall,
  Calculator,
  Send,
  FileCheck,
  CheckSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BrainDumpTask,
  TASK_TYPE_CONFIGS,
  BrainDumpAssignee,
} from "@/lib/braindump/brainDumpTypes";
import {
  formatDueCountdown,
  getDueUrgency,
  smashTask,
  reopenTask,
  deleteBrainDumpTask,
  snoozeTask,
  reassignTask,
  toggleChecklistItem,
  addNoteToTask,
} from "@/lib/braindump/brainDumpStorage";
import { toast } from "sonner";

interface BrainDumpTaskCardProps {
  task: BrainDumpTask;
  isLight: boolean;
  currentUser: string; // e.g. "Morgan Hales" or "Alyssa Hales"
  onAction?: () => void;
}

export function BrainDumpTaskCard({
  task,
  isLight,
  currentUser,
  onAction,
}: BrainDumpTaskCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  const isCompleted = task.status === "completed";
  const urgency = getDueUrgency(task.dueAt, isCompleted);
  const countdown = formatDueCountdown(task.dueAt, isCompleted);
  const typeConfig = TASK_TYPE_CONFIGS[task.type] || TASK_TYPE_CONFIGS.general_admin;

  const handleToggleComplete = () => {
    if (isCompleted) {
      reopenTask(task.id);
      toast.info("Task reopened");
    } else {
      smashTask(task.id, currentUser);
      toast.success("💥 Task Smashed Out!", {
        description: `Completed by ${currentUser}. One less thing on the plate!`,
      });
    }
    onAction?.();
  };

  const handleSnooze = (days: number) => {
    snoozeTask(task.id, days);
    toast.info(`Task snoozed by +${days} day(s)`);
    onAction?.();
  };

  const handleReassign = (assignee: BrainDumpAssignee) => {
    reassignTask(task.id, assignee);
    const label = assignee === "both" ? "Morgan & Alyssa" : assignee === "alyssa" ? "Alyssa" : "Morgan";
    toast.success(`Task reassigned to ${label}`);
    onAction?.();
  };

  const handleDelete = () => {
    deleteBrainDumpTask(task.id);
    toast.info("Task deleted");
    onAction?.();
  };

  const handleToggleChecklist = (itemId: string) => {
    toggleChecklistItem(task.id, itemId);
    onAction?.();
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    addNoteToTask(task.id, currentUser, newNoteText.trim());
    setNewNoteText("");
    setIsAddingNote(false);
    toast.success("Note added");
    onAction?.();
  };

  // Render Category Icon
  const renderCategoryIcon = () => {
    switch (task.type) {
      case "mark_up":
        return <PenTool className="h-4 w-4" />;
      case "call_followup":
        return <PhoneCall className="h-4 w-4" />;
      case "estimate":
        return <Calculator className="h-4 w-4" />;
      case "tender_submission":
        return <Send className="h-4 w-4" />;
      case "re_tender":
        return <RotateCcw className="h-4 w-4" />;
      case "contract":
        return <FileCheck className="h-4 w-4" />;
      default:
        return <CheckSquare className="h-4 w-4" />;
    }
  };

  return (
    <div
      className={`group relative rounded-2xl sm:rounded-3xl border transition-all overflow-hidden ${
        isCompleted
          ? isLight
            ? "bg-slate-50/70 border-slate-200 opacity-60 hover:opacity-100"
            : "bg-slate-950/40 border-slate-800/50 opacity-50 hover:opacity-90"
          : urgency === "overdue"
          ? isLight
            ? "bg-rose-50/50 border-rose-300 shadow-md shadow-rose-200/40 ring-1 ring-rose-400/50"
            : "bg-rose-950/20 border-rose-500/50 shadow-xl shadow-rose-950/30 ring-1 ring-rose-500/40"
          : urgency === "due_today"
          ? isLight
            ? "bg-amber-50/40 border-amber-300 shadow-md shadow-amber-200/30 ring-1 ring-amber-400/40"
            : "bg-amber-950/20 border-amber-500/40 shadow-xl shadow-amber-950/30 ring-1 ring-amber-400/30"
          : isLight
          ? "bg-white border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300"
          : "bg-slate-900/80 border-slate-800 hover:border-slate-700/80 shadow-lg"
      }`}
    >
      {/* Laser Top Accent Line */}
      {!isCompleted && (
        <div
          className={`h-1 w-full bg-gradient-to-r ${
            urgency === "overdue"
              ? "from-rose-500 via-red-500 to-rose-600 animate-pulse"
              : urgency === "due_today"
              ? "from-amber-400 via-orange-500 to-amber-500"
              : typeConfig.accentGradient
          }`}
        />
      )}

      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 sm:gap-4">
          {/* Quick Smash Checkbox (Large Target) */}
          <button
            type="button"
            onClick={handleToggleComplete}
            className={`mt-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer shrink-0 border ${
              isCompleted
                ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                : isLight
                ? "bg-white border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 text-transparent hover:text-emerald-600"
                : "bg-slate-950/70 border-slate-700 hover:border-emerald-400 hover:bg-emerald-950/40 text-transparent hover:text-emerald-400"
            }`}
            title={isCompleted ? "Mark incomplete" : "SMASH TASK (Mark Complete)"}
          >
            <Check className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3]" />
          </button>

          {/* Main Body */}
          <div className="flex-1 min-w-0">
            {/* Header Pills: Category Badge, Assignee Badge, Urgency Countdown Badge */}
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {/* Category Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wide border ${typeConfig.badgeBg} ${typeConfig.badgeBorder} ${typeConfig.badgeText}`}
              >
                {renderCategoryIcon()}
                <span>{typeConfig.shortLabel}</span>
              </span>

              {/* Assignee Badge */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                  task.assignee === "alyssa"
                    ? isLight
                      ? "bg-rose-50 border-rose-300 text-rose-700"
                      : "bg-rose-950/60 border-rose-500/40 text-rose-300"
                    : task.assignee === "morgan"
                    ? isLight
                      ? "bg-amber-50 border-amber-300 text-amber-800"
                      : "bg-amber-950/60 border-amber-500/40 text-amber-300"
                    : isLight
                    ? "bg-purple-50 border-purple-300 text-purple-800"
                    : "bg-purple-950/60 border-purple-500/40 text-purple-300"
                }`}
              >
                {task.assignee === "alyssa" ? (
                  <>
                    <User className="h-3 w-3 text-rose-500" />
                    <span>Alyssa</span>
                  </>
                ) : task.assignee === "morgan" ? (
                  <>
                    <User className="h-3 w-3 text-amber-500" />
                    <span>Morgan</span>
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3 text-purple-400" />
                    <span>Morgan &amp; Alyssa</span>
                  </>
                )}
              </span>

              {/* Urgency Countdown Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-extrabold border ${
                  countdown.urgentLevel === "red"
                    ? "bg-rose-500/20 text-rose-600 dark:text-rose-300 border-rose-500/40 animate-pulse"
                    : countdown.urgentLevel === "amber"
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40"
                    : countdown.urgentLevel === "yellow"
                    ? "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border-yellow-500/30"
                    : countdown.urgentLevel === "green"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                }`}
              >
                <Clock className="h-3 w-3 shrink-0" />
                <span>{countdown.text}</span>
              </span>

              {/* SLA Preset Badge */}
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                SLA: {task.slaDays === 0 ? "Today" : `${task.slaDays}d`} EOD
              </span>
            </div>

            {/* Task Title */}
            <h4
              className={`text-base sm:text-lg font-bold leading-snug transition-colors ${
                isCompleted
                  ? "line-through text-slate-400 dark:text-slate-500"
                  : isLight
                  ? "text-slate-900 group-hover:text-amber-900"
                  : "text-slate-100 group-hover:text-amber-200"
              }`}
            >
              {task.title}
            </h4>

            {/* Client Context Pill Bar */}
            {(task.clientName || task.siteAddress || task.designName) && (
              <div className="flex items-center gap-2 flex-wrap mt-2 text-xs">
                {task.clientName && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold border ${
                      isLight ? "bg-slate-100 border-slate-300 text-slate-800" : "bg-slate-800 border-slate-700 text-slate-200"
                    }`}
                  >
                    <User className="h-3 w-3 text-slate-400" />
                    <span>{task.clientName}</span>
                  </span>
                )}

                {task.clientPhone && (
                  <a
                    href={`tel:${task.clientPhone.replace(/\s+/g, "")}`}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-bold border transition-colors cursor-pointer ${
                      isLight
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
                        : "bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60"
                    }`}
                    title="Click to Call Client"
                  >
                    <Phone className="h-3 w-3 text-emerald-500" />
                    <span>{task.clientPhone}</span>
                  </a>
                )}

                {task.designName && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold border ${
                      isLight ? "bg-slate-100 border-slate-300 text-slate-700" : "bg-slate-800 border-slate-700 text-slate-300"
                    }`}
                  >
                    <Home className="h-3 w-3 text-slate-400" />
                    <span>{task.designName}</span>
                  </span>
                )}

                {task.quoteNumber && (
                  <span className="font-mono text-[11px] font-bold text-amber-500">
                    #{task.quoteNumber}
                  </span>
                )}
              </div>
            )}

            {/* Task Description */}
            {task.description && (
              <p className={`text-xs sm:text-sm mt-2 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                {task.description}
              </p>
            )}

            {/* Checklist Items (Preview 2 or all if expanded) */}
            {task.checklist && task.checklist.length > 0 && (
              <div className="mt-3 space-y-1.5 pt-2 border-t border-slate-700/20">
                {(isExpanded ? task.checklist : task.checklist.slice(0, 2)).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleToggleChecklist(item.id)}
                    className="flex items-center gap-2 text-xs cursor-pointer group/item select-none"
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${
                        item.completed
                          ? "bg-emerald-500 text-slate-950 border-emerald-400"
                          : isLight
                          ? "border-slate-300 group-hover/item:border-emerald-500 bg-white"
                          : "border-slate-700 group-hover/item:border-emerald-400 bg-slate-950"
                      }`}
                    >
                      {item.completed && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <span
                      className={`${
                        item.completed
                          ? "line-through text-slate-400"
                          : isLight
                          ? "text-slate-700"
                          : "text-slate-300"
                      }`}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}

                {task.checklist.length > 2 && !isExpanded && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="text-[11px] text-amber-500 font-bold hover:underline"
                  >
                    +{task.checklist.length - 2} more sub-tasks...
                  </button>
                )}
              </div>
            )}

            {/* Expanded Collaboration Notes & Add Note */}
            {isExpanded && (
              <div className="mt-4 pt-3 border-t border-slate-700/20 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Internal Collab Notes ({task.notes?.length || 0})
                </span>

                {task.notes && task.notes.length > 0 ? (
                  <div className="space-y-1.5">
                    {task.notes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-2.5 rounded-xl text-xs border ${
                          isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/60 border-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                          <span className="font-bold text-amber-500">{note.author}</span>
                          <span className="font-mono">
                            {new Date(note.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className={isLight ? "text-slate-700" : "text-slate-300"}>{note.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No notes yet. Add one below.</p>
                )}

                {/* Add Note Input */}
                {isAddingNote ? (
                  <form onSubmit={handleAddNote} className="flex gap-2 mt-2">
                    <Input
                      placeholder="Add a quick note for Morgan or Alyssa..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="h-8 text-xs rounded-lg"
                      autoFocus
                    />
                    <Button type="submit" size="sm" className="h-8 text-xs">
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingNote(false)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingNote(true)}
                    className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 mt-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add note
                  </button>
                )}
              </div>
            )}

            {/* Quick Action Toolbar */}
            <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-700/20 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Direct Action Link (e.g. Quote Builder, Floorplan Editor) */}
                {typeConfig.quickActionUrl && (
                  <Link
                    to={typeConfig.quickActionUrl as any}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                      isLight
                        ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800"
                        : "bg-slate-800 hover:bg-slate-750 border-slate-700 text-white hover:border-amber-400"
                    }`}
                  >
                    <span>Launch {typeConfig.quickActionLabel || "Portal"}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}

                {/* Snooze +1 Day */}
                <button
                  type="button"
                  onClick={() => handleSnooze(1)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isLight
                      ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                      : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                  title="Push deadline by +1 day"
                >
                  +1d Snooze
                </button>

                {/* Quick Reassign Switcher */}
                <button
                  type="button"
                  onClick={() =>
                    handleReassign(
                      task.assignee === "morgan" ? "alyssa" : task.assignee === "alyssa" ? "both" : "morgan"
                    )
                  }
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    isLight
                      ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                      : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                  title="Toggle assignee"
                >
                  Swap Assignee ⇄
                </button>
              </div>

              <div className="flex items-center gap-1">
                {/* Expand / Collapse Details Button */}
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                  title={isExpanded ? "Collapse" : "Expand details"}
                >
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {/* Delete Task */}
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                  title="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

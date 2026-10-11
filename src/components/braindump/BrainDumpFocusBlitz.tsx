import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Zap,
  CheckCircle2,
  X,
  Phone,
  Mail,
  Home,
  Clock,
  ArrowRight,
  RotateCcw,
  Sparkles,
  ExternalLink,
  User,
  Check,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BrainDumpTask,
  TASK_TYPE_CONFIGS,
} from "@/lib/braindump/brainDumpTypes";
import {
  formatDueCountdown,
  smashTask,
  snoozeTask,
} from "@/lib/braindump/brainDumpStorage";
import { toast } from "sonner";

interface BrainDumpFocusBlitzProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: BrainDumpTask[];
  isLight: boolean;
  currentUser: string;
  onTaskSmashed?: () => void;
}

export function BrainDumpFocusBlitz({
  isOpen,
  onClose,
  tasks,
  isLight,
  currentUser,
  onTaskSmashed,
}: BrainDumpFocusBlitzProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter only incomplete tasks, prioritizing overdue & due today
  const activeTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const currentTask: BrainDumpTask | undefined = activeTasks[currentIndex];

  const handleSmashCurrent = () => {
    if (!currentTask) return;
    smashTask(currentTask.id, currentUser);
    toast.success("💥 TASK SMASHED!", {
      description: `${currentTask.title} is done! Moving to next.`,
    });
    onTaskSmashed?.();

    if (currentIndex >= activeTasks.length - 1) {
      setCurrentIndex(0);
    }
  };

  const handleSnoozeCurrent = (days: number = 1) => {
    if (!currentTask) return;
    snoozeTask(currentTask.id, days);
    toast.info("Task snoozed by +1 day");
    onTaskSmashed?.();
  };

  const handleNext = () => {
    if (currentIndex < activeTasks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const typeConfig = currentTask ? TASK_TYPE_CONFIGS[currentTask.type] : null;
  const countdown = currentTask ? formatDueCountdown(currentTask.dueAt, false) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isLight
            ? "bg-white border-amber-500/40 text-slate-900 shadow-amber-500/10"
            : "bg-slate-950 border-amber-500/40 text-white shadow-black"
        }`}
      >
        {/* Blitz Top Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-4 flex items-center justify-between text-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950/20 flex items-center justify-center">
              <Zap className="h-5 w-5 fill-slate-950 stroke-none" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider leading-none">
                Morgan &amp; Alyssa's Daily Blitz Mode
              </h3>
              <p className="text-xs font-bold opacity-80 mt-0.5">
                Smashing out backlog tasks with zero distractions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-black font-mono bg-slate-950/20 px-3 py-1 rounded-full">
              {activeTasks.length > 0
                ? `Task ${currentIndex + 1} of ${activeTasks.length}`
                : "All Done!"}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Blitz"
              className="p-1.5 rounded-full hover:bg-slate-950/20 cursor-pointer transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
          {activeTasks.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Trophy className="h-10 w-10" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black">
                🎉 ALL TASKS SMASHED OUT!
              </h2>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Incredible momentum! You and Alyssa have knocked out every urgent task in the backlog.
              </p>
              <Button
                onClick={onClose}
                className="mt-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-8 rounded-xl cursor-pointer"
              >
                Back to Dashboard
              </Button>
            </div>
          ) : currentTask && typeConfig && countdown ? (
            <div className="space-y-6">
              {/* Urgency Badge & Category */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold uppercase border ${typeConfig.badgeBg} ${typeConfig.badgeBorder} ${typeConfig.badgeText}`}
                  >
                    <span>{typeConfig.label}</span>
                  </span>

                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold border ${
                      currentTask.assignee === "alyssa"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                        : currentTask.assignee === "morgan"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                        : "bg-purple-500/20 text-purple-300 border-purple-500/40"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>
                      {currentTask.assignee === "alyssa"
                        ? "Alyssa"
                        : currentTask.assignee === "morgan"
                        ? "Morgan"
                        : "Morgan & Alyssa"}
                    </span>
                  </span>
                </div>

                <div
                  className={`px-3 py-1 rounded-xl text-xs font-mono font-black border flex items-center gap-1.5 ${
                    countdown.urgentLevel === "red"
                      ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                      : countdown.urgentLevel === "amber"
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  }`}
                >
                  <Clock className="h-4 w-4" />
                  <span>{countdown.text}</span>
                </div>
              </div>

              {/* Task Title */}
              <h2 className="text-2xl sm:text-3xl font-extrabold leading-snug">
                {currentTask.title}
              </h2>

              {/* Client & House Details Box */}
              {(currentTask.clientName || currentTask.designName || currentTask.siteAddress) && (
                <div
                  className={`p-4 rounded-2xl border ${
                    isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/80 border-slate-800"
                  } space-y-2`}
                >
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Target Client &amp; Property
                  </span>
                  <div className="flex items-center gap-3 flex-wrap">
                    {currentTask.clientName && (
                      <span className="font-bold text-sm flex items-center gap-1.5">
                        <User className="h-4 w-4 text-amber-500" />
                        {currentTask.clientName}
                      </span>
                    )}

                    {currentTask.clientPhone && (
                      <a
                        href={`tel:${currentTask.clientPhone.replace(/\s+/g, "")}`}
                        className="px-3 py-1 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm hover:bg-emerald-400"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>Call {currentTask.clientPhone}</span>
                      </a>
                    )}

                    {currentTask.designName && (
                      <span className="text-xs text-slate-300 flex items-center gap-1 font-mono">
                        <Home className="h-3.5 w-3.5 text-slate-400" />
                        {currentTask.designName}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {currentTask.description && (
                <div className="p-4 rounded-2xl border border-slate-700/30 text-sm leading-relaxed text-slate-300">
                  {currentTask.description}
                </div>
              )}

              {/* Sub-Tasks Checklist */}
              {currentTask.checklist && currentTask.checklist.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400 block">
                    Action Checklist
                  </span>
                  <div className="space-y-2">
                    {currentTask.checklist.map((c) => (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl border flex items-center gap-3 text-sm ${
                          c.completed
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 line-through"
                            : "bg-slate-900 border-slate-800 text-slate-200"
                        }`}
                      >
                        <Check className={`h-4 w-4 ${c.completed ? "text-emerald-400" : "text-slate-600"}`} />
                        <span>{c.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Direct Portal Link */}
              {typeConfig.quickActionUrl && (
                <div>
                  <Link
                    to={typeConfig.quickActionUrl as any}
                    target="_blank"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm border border-slate-700"
                  >
                    <span>Launch {typeConfig.quickActionLabel} in New Tab</span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Blitz Bottom Action Controls */}
        {activeTasks.length > 0 && (
          <div
            className={`p-4 sm:p-6 border-t flex items-center justify-between gap-3 flex-wrap ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-slate-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSnoozeCurrent(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold cursor-pointer text-slate-300"
              >
                💤 Snooze +1 Day
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold cursor-pointer text-slate-300"
              >
                ⏭️ Skip to Next
              </button>
            </div>

            <Button
              onClick={handleSmashCurrent}
              className="h-14 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-xl shadow-emerald-500/20 gap-2.5 cursor-pointer"
            >
              <CheckCircle2 className="h-6 w-6 stroke-[2.5]" />
              <span>SMASH THIS TASK (DONE)</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

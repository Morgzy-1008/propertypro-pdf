import React, { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  Kanban,
  Search,
  Filter,
  User,
  Users,
  RotateCcw,
  ArrowLeft,
  Flame,
  Layers,
  PhoneCall,
  PenTool,
  Calculator,
  Send,
  FileCheck,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/lib/theme";
import {
  getActiveStaffUser,
  onStaffUserChanged,
  type StaffProfile,
} from "@/lib/authSession";
import { canAccessBrainDump, isAlyssaHales } from "@/lib/access";
import {
  BrainDumpTask,
  BrainDumpTaskType,
  BrainDumpAssignee,
  TASK_TYPE_CONFIGS,
} from "@/lib/braindump/brainDumpTypes";
import {
  loadBrainDumpTasks,
  subscribeBrainDump,
  getBrainDumpStats,
  getDueUrgency,
  resetBrainDumpTasksToSeed,
} from "@/lib/braindump/brainDumpStorage";
import { BrainDumpQuickAdd } from "./BrainDumpQuickAdd";
import { BrainDumpTaskCard } from "./BrainDumpTaskCard";
import { BrainDumpKanban } from "./BrainDumpKanban";
import { BrainDumpFocusBlitz } from "./BrainDumpFocusBlitz";
import { BrainDumpAccessGuard } from "./BrainDumpAccessGuard";
import { StaffHeaderProfile } from "@/components/auth/StaffHeaderProfile";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { toast } from "sonner";

export function BrainDumpPortal() {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [staffUser, setStaffUser] = useState<StaffProfile | null>(() => getActiveStaffUser());
  const [tasks, setTasks] = useState<BrainDumpTask[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<"all" | "morgan" | "alyssa" | "both">("all");
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "overdue" | "today" | "upcoming" | "completed">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | BrainDumpTaskType>("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isBlitzOpen, setIsBlitzOpen] = useState(false);

  // Load and subscribe to real-time storage updates
  useEffect(() => {
    const refreshTasks = () => {
      setTasks(loadBrainDumpTasks());
    };
    refreshTasks();

    const unsubBrainDump = subscribeBrainDump(refreshTasks);
    const unsubStaff = onStaffUserChanged((u) => setStaffUser(u));

    return () => {
      unsubBrainDump();
      unsubStaff();
    };
  }, []);

  const hasAccess = canAccessBrainDump(staffUser);
  const isAlyssa = isAlyssaHales(staffUser);
  const currentUserName = staffUser ? staffUser.name : "Morgan Hales";

  // Compute live stats
  const stats = useMemo(() => getBrainDumpStats(tasks), [tasks]);

  // Filter tasks based on search, assignee, urgency, and category
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = t.title.toLowerCase().includes(q);
        const matchesClient = t.clientName?.toLowerCase().includes(q);
        const matchesPhone = t.clientPhone?.includes(q);
        const matchesDesign = t.designName?.toLowerCase().includes(q);
        const matchesAddress = t.siteAddress?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesClient && !matchesPhone && !matchesDesign && !matchesAddress) {
          return false;
        }
      }

      // 2. Assignee filter
      if (assigneeFilter === "morgan" && t.assignee !== "morgan" && t.assignee !== "both") {
        return false;
      }
      if (assigneeFilter === "alyssa" && t.assignee !== "alyssa" && t.assignee !== "both") {
        return false;
      }
      if (assigneeFilter === "both" && t.assignee !== "both") {
        return false;
      }

      // 3. Category Type filter
      if (typeFilter !== "all" && t.type !== typeFilter) {
        return false;
      }

      // 4. Urgency filter
      if (urgencyFilter === "completed") {
        return t.status === "completed";
      }
      if (urgencyFilter === "overdue") {
        return t.status !== "completed" && getDueUrgency(t.dueAt, false) === "overdue";
      }
      if (urgencyFilter === "today") {
        return t.status !== "completed" && getDueUrgency(t.dueAt, false) === "due_today";
      }
      if (urgencyFilter === "upcoming") {
        const u = getDueUrgency(t.dueAt, false);
        return t.status !== "completed" && (u === "due_tomorrow" || u === "upcoming");
      }

      // Default: exclude completed unless requested
      if (urgencyFilter === "all" && t.status === "completed") {
        return false;
      }

      return true;
    });
  }, [tasks, searchQuery, assigneeFilter, urgencyFilter, typeFilter]);

  // Sort tasks by priority and urgency
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // If completed, sort by completion time descending
      if (a.status === "completed" && b.status === "completed") {
        return new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime();
      }
      if (a.status === "completed") return 1;
      if (b.status === "completed") return -1;

      // Overdue first (earliest dueAt first)
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    });
  }, [filteredTasks]);

  // Handle access guard
  if (!hasAccess) {
    return <BrainDumpAccessGuard currentStaff={staffUser} isLight={isLight} />;
  }

  return (
    <div className={`min-h-screen ${isLight ? "bg-slate-100 text-slate-900" : "bg-slate-950 text-slate-100"}`}>
      {/* Laser Top Glow Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-sm" />

      {/* Global Portal Header */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-all ${
          isLight ? "bg-white/95 border-slate-200 shadow-xs" : "bg-slate-950/95 border-slate-800"
        }`}
      >
        <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Brand & Portal Identity */}
          <div className="flex items-center gap-3">
            <Link
              to="/hub"
              className={`p-2 rounded-xl border transition-all ${
                isLight ? "bg-slate-100 hover:bg-slate-200 border-slate-300" : "bg-slate-900 hover:bg-slate-800 border-slate-800"
              }`}
              title="Return to Welcome Hub"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wider flex items-center gap-2">
                  <span>Morgan &amp; Alyssa's BrainDump</span>
                </h1>
                <Badge
                  variant="outline"
                  className="hidden sm:inline-flex text-[10px] font-mono font-bold bg-amber-500/10 text-amber-500 border-amber-500/30"
                >
                  LIVE PORTAL
                </Badge>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Rapid Backlog Blitz • Client Mark-ups • Calls • Estimates • Tenders &amp; Contracts
              </p>
            </div>
          </div>

          {/* Header Controls: Daily Blitz Button, Theme Toggle, Staff Profile */}
          <div className="flex items-center gap-3">
            {/* Daily Blitz Button */}
            <Button
              onClick={() => setIsBlitzOpen(true)}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm shadow-md shadow-amber-500/20 gap-2 cursor-pointer"
            >
              <Zap className="h-4 w-4 fill-slate-950 stroke-none" />
              <span>⚡ Start Daily Blitz</span>
            </Button>

            <ThemeToggle />
            <StaffHeaderProfile isLight={isLight} compact />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Top KPI Metrics HUD (The Smash Bar) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
          {/* Card 1: Overdue Backlog */}
          <div
            onClick={() => setUrgencyFilter(urgencyFilter === "overdue" ? "all" : "overdue")}
            className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
              urgencyFilter === "overdue"
                ? "ring-2 ring-rose-500 shadow-lg"
                : ""
            } ${
              isLight
                ? "bg-white border-slate-200 shadow-sm hover:border-rose-300"
                : "bg-slate-900/80 border-slate-800 shadow-xl hover:border-rose-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" /> Overdue Backlog
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-rose-500 font-mono">
                {stats.overdueCount}
              </span>
              <span className="text-xs text-slate-400 font-bold">Needs Immediate Action</span>
            </div>
          </div>

          {/* Card 2: Due Today */}
          <div
            onClick={() => setUrgencyFilter(urgencyFilter === "today" ? "all" : "today")}
            className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
              urgencyFilter === "today"
                ? "ring-2 ring-amber-500 shadow-lg"
                : ""
            } ${
              isLight
                ? "bg-white border-slate-200 shadow-sm hover:border-amber-300"
                : "bg-slate-900/80 border-slate-800 shadow-xl hover:border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Due Today (5:00 PM)
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-amber-500 font-mono">
                {stats.dueTodayCount}
              </span>
              <span className="text-xs text-slate-400 font-bold">Today's Hitlist</span>
            </div>
          </div>

          {/* Card 3: Due Next 48h */}
          <div
            onClick={() => setUrgencyFilter(urgencyFilter === "upcoming" ? "all" : "upcoming")}
            className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
              urgencyFilter === "upcoming"
                ? "ring-2 ring-blue-500 shadow-lg"
                : ""
            } ${
              isLight
                ? "bg-white border-slate-200 shadow-sm hover:border-blue-300"
                : "bg-slate-900/80 border-slate-800 shadow-xl hover:border-blue-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Flame className="h-4 w-4" /> Due Next 48 Hours
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-blue-400 font-mono">
                {stats.dueNext48HoursCount}
              </span>
              <span className="text-xs text-slate-400 font-bold">Upcoming Mark-ups</span>
            </div>
          </div>

          {/* Card 4: Smashed Out Today */}
          <div
            onClick={() => setUrgencyFilter(urgencyFilter === "completed" ? "all" : "completed")}
            className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer relative overflow-hidden ${
              urgencyFilter === "completed"
                ? "ring-2 ring-emerald-500 shadow-lg"
                : ""
            } ${
              isLight
                ? "bg-white border-slate-200 shadow-sm hover:border-emerald-300"
                : "bg-slate-900/80 border-slate-800 shadow-xl hover:border-emerald-500/40"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Smashed Today
              </span>
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-black text-emerald-500 font-mono">
                {stats.smashedTodayCount}
              </span>
              <span className="text-xs text-slate-400 font-bold">
                ({stats.totalCompleted} Total Smashed)
              </span>
            </div>
          </div>
        </div>

        {/* Quick Add Component */}
        <BrainDumpQuickAdd
          isLight={isLight}
          currentUserIsAlyssa={isAlyssa}
          onTaskCreated={() => setTasks(loadBrainDumpTasks())}
        />

        {/* Search, Filter Toolbar & View Mode Switcher */}
        <div
          className={`p-4 rounded-2xl sm:rounded-3xl border space-y-4 ${
            isLight ? "bg-white border-slate-200 shadow-xs" : "bg-slate-900/70 border-slate-800"
          }`}
        >
          {/* Row 1: Search + Assignee Tabs + View Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search by client, title, phone, design, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 h-10 text-xs sm:text-sm rounded-xl ${
                  isLight ? "bg-slate-50 border-slate-300" : "bg-slate-950 border-slate-800 text-white"
                }`}
              />
            </div>

            {/* Assignee Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-500/10 p-1 rounded-xl self-start md:self-center overflow-x-auto">
              <button
                type="button"
                onClick={() => setAssigneeFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  assigneeFilter === "all"
                    ? "bg-amber-500 text-slate-950 shadow-xs font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All ({stats.totalActive})
              </button>

              <button
                type="button"
                onClick={() => setAssigneeFilter("morgan")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  assigneeFilter === "morgan"
                    ? "bg-amber-500 text-slate-950 shadow-xs font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <User className="h-3 w-3" />
                <span>Morgan ({stats.morganActiveCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setAssigneeFilter("alyssa")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  assigneeFilter === "alyssa"
                    ? "bg-rose-500 text-white shadow-xs font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <User className="h-3 w-3" />
                <span>Alyssa ({stats.alyssaActiveCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setAssigneeFilter("both")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  assigneeFilter === "both"
                    ? "bg-purple-500 text-white shadow-xs font-black"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Users className="h-3 w-3" />
                <span>Shared ({stats.sharedActiveCount})</span>
              </button>
            </div>

            {/* View Mode Toggle: List vs Kanban */}
            <div className="flex items-center gap-1 bg-slate-500/10 p-1 rounded-xl shrink-0 self-end md:self-center">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "list"
                    ? isLight
                      ? "bg-white text-slate-900 shadow-xs font-black"
                      : "bg-slate-800 text-white shadow-xs font-black"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Priority List View"
              >
                <ListTodo className="h-4 w-4" />
                <span className="hidden sm:inline">Priority List</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  viewMode === "kanban"
                    ? isLight
                      ? "bg-white text-slate-900 shadow-xs font-black"
                      : "bg-slate-800 text-white shadow-xs font-black"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Kanban Board View"
              >
                <Kanban className="h-4 w-4" />
                <span className="hidden sm:inline">Kanban Board</span>
              </button>
            </div>
          </div>

          {/* Row 2: Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-700/20">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
              Category:
            </span>

            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                typeFilter === "all"
                  ? "bg-amber-500 text-slate-950 font-black"
                  : "bg-slate-500/10 text-slate-400 hover:text-white"
              }`}
            >
              All Categories
            </button>

            {(Object.keys(TASK_TYPE_CONFIGS) as BrainDumpTaskType[]).map((t) => {
              const cfg = TASK_TYPE_CONFIGS[t];
              const isSelected = typeFilter === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? `${cfg.badgeBg} ${cfg.badgeText} ring-1 ${cfg.badgeBorder} font-black`
                      : "bg-slate-500/10 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>{cfg.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Task List / Kanban Display Area */}
        {viewMode === "kanban" ? (
          <BrainDumpKanban
            tasks={filteredTasks}
            isLight={isLight}
            currentUser={currentUserName}
            onAction={() => setTasks(loadBrainDumpTasks())}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Showing <strong>{sortedTasks.length}</strong> tasks sorted by urgency
              </span>

              {urgencyFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setUrgencyFilter("all")}
                  className="text-amber-500 hover:underline font-bold"
                >
                  Clear "{urgencyFilter}" filter
                </button>
              )}
            </div>

            {sortedTasks.length === 0 ? (
              <div
                className={`py-16 text-center rounded-3xl border ${
                  isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
                } space-y-3`}
              >
                <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold">No tasks matching your active filters</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Try clearing search or filter pills above, or use the quick add bar to smash out something new!
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setAssigneeFilter("all");
                    setUrgencyFilter("all");
                    setTypeFilter("all");
                  }}
                  className="text-xs font-bold"
                >
                  Reset All Filters
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedTasks.map((task) => (
                  <BrainDumpTaskCard
                    key={task.id}
                    task={task}
                    isLight={isLight}
                    currentUser={currentUserName}
                    onAction={() => setTasks(loadBrainDumpTasks())}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Daily Blitz Mode Drawer / Modal */}
      <BrainDumpFocusBlitz
        isOpen={isBlitzOpen}
        onClose={() => setIsBlitzOpen(false)}
        tasks={tasks}
        isLight={isLight}
        currentUser={currentUserName}
        onTaskSmashed={() => setTasks(loadBrainDumpTasks())}
      />
    </div>
  );
}

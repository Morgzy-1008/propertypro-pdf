import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Plus,
  PenTool,
  PhoneCall,
  Calculator,
  Send,
  RotateCcw,
  FileCheck,
  CheckSquare,
  Clock,
  User,
  Users,
  ChevronDown,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BrainDumpTaskType,
  BrainDumpAssignee,
  BrainDumpPriority,
  TASK_TYPE_CONFIGS,
  SLA_PRESET_OPTIONS,
} from "@/lib/braindump/brainDumpTypes";
import { createQuickBrainDumpTask } from "@/lib/braindump/brainDumpStorage";
import { loadAllCrmLeads } from "@/lib/crm/crmStorage";
import { type CrmLead } from "@/lib/crm/crmTypes";
import { toast } from "sonner";

interface BrainDumpQuickAddProps {
  isLight: boolean;
  currentUserIsAlyssa: boolean;
  onTaskCreated?: () => void;
}

export function BrainDumpQuickAdd({
  isLight,
  currentUserIsAlyssa,
  onTaskCreated,
}: BrainDumpQuickAddProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [taskType, setTaskType] = useState<BrainDumpTaskType>("mark_up");
  const [slaDays, setSlaDays] = useState<number>(2); // Default 2 days for mark-ups
  const [assignee, setAssignee] = useState<BrainDumpAssignee>(
    currentUserIsAlyssa ? "alyssa" : "morgan"
  );
  const [priority, setPriority] = useState<BrainDumpPriority>("high");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [designName, setDesignName] = useState("");

  // CRM Leads for client autocomplete
  const [crmLeads, setCrmLeads] = useState<CrmLead[]>([]);
  const [leadSuggestions, setLeadSuggestions] = useState<CrmLead[]>([]);
  const [showLeadDropdown, setShowLeadDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAllCrmLeads()
      .then(setCrmLeads)
      .catch(() => {});
  }, []);

  // Update default SLA days when task type changes
  const handleSelectType = (type: BrainDumpTaskType) => {
    setTaskType(type);
    const config = TASK_TYPE_CONFIGS[type];
    setSlaDays(config.defaultDays);
    if (config.defaultAssignee) {
      setAssignee(config.defaultAssignee);
    }
  };

  // 1-Click Template Quick Action
  const handleQuickTemplate = (type: BrainDumpTaskType) => {
    setTaskType(type);
    const config = TASK_TYPE_CONFIGS[type];
    setSlaDays(config.defaultDays);
    setAssignee(config.defaultAssignee);
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Client search autocomplete
  const handleClientNameChange = (val: string) => {
    setClientName(val);
    if (!val || val.trim().length < 2) {
      setLeadSuggestions([]);
      setShowLeadDropdown(false);
      return;
    }
    const query = val.toLowerCase().trim();
    const matched = crmLeads.filter(
      (l) =>
        l.name?.toLowerCase().includes(query) ||
        l.phone?.includes(query) ||
        l.suburb?.toLowerCase().includes(query)
    );
    setLeadSuggestions(matched.slice(0, 6));
    setShowLeadDropdown(matched.length > 0);
  };

  const handleSelectLead = (lead: CrmLead) => {
    setClientName(lead.clientName || lead.name || "");
    setClientPhone(lead.mobile || lead.phone || "");
    if (lead.preferredDesign || lead.design) setDesignName(lead.preferredDesign || lead.design || "");
    setShowLeadDropdown(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a task title to add");
      return;
    }

    createQuickBrainDumpTask({
      title: title.trim(),
      type: taskType,
      slaDays,
      assignee,
      clientName: clientName.trim() || undefined,
      clientPhone: clientPhone.trim() || undefined,
      designName: designName.trim() || undefined,
      description: description.trim() || undefined,
      creator: currentUserIsAlyssa ? "alyssa" : "morgan",
    });

    const typeConfig = TASK_TYPE_CONFIGS[taskType];
    toast.success(`Added ${typeConfig.label}!`, {
      description: `Assigned to ${assignee === "both" ? "Morgan & Alyssa" : assignee === "alyssa" ? "Alyssa" : "Morgan"} • Due in ${slaDays} days EOD.`,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setClientName("");
    setClientPhone("");
    setDesignName("");
    setIsOpen(false);
    onTaskCreated?.();
  };

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border transition-all overflow-hidden ${
        isLight
          ? "bg-white border-slate-200 shadow-xl shadow-slate-200/50"
          : "bg-slate-900/90 border-slate-800/90 shadow-2xl shadow-black/80 backdrop-blur-xl"
      }`}
    >
      {/* 1-Click Fast Template Action Buttons */}
      <div
        className={`px-4 sm:px-6 py-3 border-b flex items-center gap-2 overflow-x-auto ${
          isLight ? "bg-slate-50/90 border-slate-200" : "bg-slate-950/60 border-slate-800/80"
        }`}
      >
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1.5 mr-1">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Rapid Presets:
        </span>

        {/* 1. Mark-up (2 Days EOD) */}
        <button
          type="button"
          onClick={() => handleQuickTemplate("mark_up")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
            taskType === "mark_up" && isOpen
              ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
              : isLight
              ? "bg-white border-slate-200 text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
              : "bg-slate-900 border-slate-800 text-slate-200 hover:border-emerald-500/50 hover:text-emerald-300"
          }`}
        >
          <PenTool className="h-3.5 w-3.5 text-emerald-500" />
          <span>+ Mark-up (2d EOD)</span>
        </button>

        {/* 2. Call Follow-up (Today EOD) */}
        <button
          type="button"
          onClick={() => handleQuickTemplate("call_followup")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
            taskType === "call_followup" && isOpen
              ? "bg-sky-500 text-slate-950 border-sky-400 shadow-sm"
              : isLight
              ? "bg-white border-slate-200 text-slate-700 hover:border-sky-400 hover:text-sky-700"
              : "bg-slate-900 border-slate-800 text-slate-200 hover:border-sky-500/50 hover:text-sky-300"
          }`}
        >
          <PhoneCall className="h-3.5 w-3.5 text-sky-500" />
          <span>+ Client Call (Today EOD)</span>
        </button>

        {/* 3. New Estimate (1d EOD) */}
        <button
          type="button"
          onClick={() => handleQuickTemplate("estimate")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
            taskType === "estimate" && isOpen
              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
              : isLight
              ? "bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:text-amber-700"
              : "bg-slate-900 border-slate-800 text-slate-200 hover:border-amber-500/50 hover:text-amber-300"
          }`}
        >
          <Calculator className="h-3.5 w-3.5 text-amber-500" />
          <span>+ Estimate (1d EOD)</span>
        </button>

        {/* 4. Tender Submission (3d EOD) */}
        <button
          type="button"
          onClick={() => handleQuickTemplate("tender_submission")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
            taskType === "tender_submission" && isOpen
              ? "bg-purple-500 text-slate-950 border-purple-400 shadow-sm"
              : isLight
              ? "bg-white border-slate-200 text-slate-700 hover:border-purple-400 hover:text-purple-700"
              : "bg-slate-900 border-slate-800 text-slate-200 hover:border-purple-500/50 hover:text-purple-300"
          }`}
        >
          <Send className="h-3.5 w-3.5 text-purple-500" />
          <span>+ Tender ATP (3d EOD)</span>
        </button>

        {/* 5. Re-Tender (2d EOD) */}
        <button
          type="button"
          onClick={() => handleQuickTemplate("re_tender")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
            taskType === "re_tender" && isOpen
              ? "bg-rose-500 text-slate-950 border-rose-400 shadow-sm"
              : isLight
              ? "bg-white border-slate-200 text-slate-700 hover:border-rose-400 hover:text-rose-700"
              : "bg-slate-900 border-slate-800 text-slate-200 hover:border-rose-500/50 hover:text-rose-300"
          }`}
        >
          <RotateCcw className="h-3.5 w-3.5 text-rose-500" />
          <span>+ Re-Tender (2d EOD)</span>
        </button>

        {/* 6. Contract (3d EOD) */}
        <button
          type="button"
          onClick={() => handleQuickTemplate("contract")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
            taskType === "contract" && isOpen
              ? "bg-indigo-500 text-slate-950 border-indigo-400 shadow-sm"
              : isLight
              ? "bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:text-indigo-700"
              : "bg-slate-900 border-slate-800 text-slate-200 hover:border-indigo-500/50 hover:text-indigo-300"
          }`}
        >
          <FileCheck className="h-3.5 w-3.5 text-indigo-500" />
          <span>+ Contract (3d EOD)</span>
        </button>
      </div>

      {/* Main Quick Input Form */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Input
              ref={inputRef}
              placeholder={
                taskType === "mark_up"
                  ? "e.g. Mark-up Jasper 26 - Extended Alfresco + Butler Pantry for Steve"
                  : taskType === "call_followup"
                  ? "e.g. Call David Miller re soil classification and foundation allowance"
                  : taskType === "estimate"
                  ? "e.g. Create new estimate for Lot 118 Bahrs Scrub - Jasper 24"
                  : taskType === "tender_submission"
                  ? "e.g. Submit tender package & ATP contract bundle for Robert Miller"
                  : taskType === "re_tender"
                  ? "e.g. Re-tender Amber 21 with Hampton Façade & Moreton Bay fee"
                  : "Type task title or what needs to be smashed out..."
              }
              value={title}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => setTitle(e.target.value)}
              className={`h-13 text-base rounded-2xl px-4 font-medium transition-all ${
                isLight
                  ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-amber-500"
                  : "bg-slate-950/80 border-slate-800 text-white focus:border-amber-400"
              }`}
            />
          </div>

          <Button
            type="submit"
            className="h-13 px-7 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black tracking-wide shadow-lg shadow-amber-500/20 gap-2 shrink-0 cursor-pointer"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
            <span>Add Task</span>
          </Button>
        </div>

        {/* Collapsible Quick Configuration Controls (Opens on focus) */}
        {isOpen && (
          <div className="pt-2 border-t border-slate-700/30 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Row 1: Task Type Selection & Assignee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Task Type Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  Task Category
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {(Object.keys(TASK_TYPE_CONFIGS) as BrainDumpTaskType[]).map((t) => {
                    const cfg = TASK_TYPE_CONFIGS[t];
                    const isSelected = taskType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleSelectType(t)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all border text-left flex items-center gap-2 cursor-pointer ${
                          isSelected
                            ? isLight
                              ? "bg-amber-50 border-amber-400 text-amber-950 shadow-xs ring-1 ring-amber-400/40"
                              : "bg-amber-500/20 border-amber-400 text-amber-300 shadow-xs ring-1 ring-amber-400/40"
                            : isLight
                            ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                            : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span className="truncate">{cfg.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Assignee Selector (Morgan, Alyssa, Both) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Assigned To
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Morgan */}
                  <button
                    type="button"
                    onClick={() => setAssignee("morgan")}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      assignee === "morgan"
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 border-amber-400 shadow-sm"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>👤 Morgan</span>
                  </button>

                  {/* Alyssa */}
                  <button
                    type="button"
                    onClick={() => setAssignee("alyssa")}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      assignee === "alyssa"
                        ? "bg-gradient-to-r from-rose-500 to-pink-600 text-white border-rose-400 shadow-sm"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>👩 Alyssa</span>
                  </button>

                  {/* Both */}
                  <button
                    type="button"
                    onClick={() => setAssignee("both")}
                    className={`py-2 px-3 rounded-xl text-xs font-black transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                      assignee === "both"
                        ? "bg-gradient-to-r from-purple-500 to-indigo-600 text-white border-purple-400 shadow-sm"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>👥 Both</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Row 2: SLA Preset (Days to EOD - ZERO DATE PICKERS!) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-400" /> Deadline SLA (Amount of Days to 5:00 PM EOD)
                </label>
                <span className="text-[11px] font-mono text-amber-500 font-bold">
                  {slaDays === 0
                    ? "⚡ Due Today by 5:00 PM"
                    : slaDays === 1
                    ? "🔥 Due Tomorrow by 5:00 PM"
                    : `⭐ Due in ${slaDays} Days by 5:00 PM`}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {SLA_PRESET_OPTIONS.map((opt) => {
                  const isSelected = slaDays === opt.days;
                  return (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => setSlaDays(opt.days)}
                      className={`p-2 rounded-xl text-center transition-all border cursor-pointer ${
                        isSelected
                          ? isLight
                            ? "bg-amber-50 border-amber-400 text-amber-950 shadow-xs ring-2 ring-amber-400/40"
                            : "bg-amber-500/25 border-amber-400 text-amber-300 shadow-xs ring-1 ring-amber-400/50"
                          : isLight
                          ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <span className="text-xs font-black block truncate">{opt.label}</span>
                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                        {opt.days === 0 ? "Today 5pm" : opt.days === 1 ? "Tomorrow" : `${opt.days}d EOD`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Row 3: Client & Floorplan Context (Optional Autocomplete) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="relative">
                <Input
                  placeholder="Client Name (e.g. Steve from NSW)"
                  value={clientName}
                  onChange={(e) => handleClientNameChange(e.target.value)}
                  className={`h-10 text-xs rounded-xl ${
                    isLight ? "bg-slate-50 border-slate-300" : "bg-slate-950 border-slate-800 text-white"
                  }`}
                />
                {showLeadDropdown && leadSuggestions.length > 0 && (
                  <div
                    className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border shadow-xl max-h-48 overflow-y-auto divide-y ${
                      isLight ? "bg-white border-slate-300 divide-slate-100" : "bg-slate-950 border-slate-800 divide-slate-800"
                    }`}
                  >
                    {leadSuggestions.map((lead) => (
                      <div
                        key={lead.id}
                        onClick={() => handleSelectLead(lead)}
                        className={`p-2.5 text-xs cursor-pointer flex items-center justify-between ${
                          isLight ? "hover:bg-slate-100" : "hover:bg-slate-900"
                        }`}
                      >
                        <div>
                          <span className="font-bold block">{lead.name}</span>
                          <span className="text-[11px] text-slate-400">{lead.phone || lead.suburb}</span>
                        </div>
                        {lead.design && (
                          <Badge variant="outline" className="text-[10px]">
                            {lead.design}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Input
                  placeholder="Client Phone (e.g. 0411 222 333)"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className={`h-10 text-xs rounded-xl ${
                    isLight ? "bg-slate-50 border-slate-300" : "bg-slate-950 border-slate-800 text-white"
                  }`}
                />
              </div>

              <div>
                <Input
                  placeholder="Floor Plan (e.g. Jasper 26)"
                  value={designName}
                  onChange={(e) => setDesignName(e.target.value)}
                  className={`h-10 text-xs rounded-xl ${
                    isLight ? "bg-slate-50 border-slate-300" : "bg-slate-950 border-slate-800 text-white"
                  }`}
                />
              </div>
            </div>

            {/* Quick Description / Extra Notes */}
            <div>
              <Input
                placeholder="Optional notes or instructions for this task..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`h-10 text-xs rounded-xl ${
                  isLight ? "bg-slate-50 border-slate-300" : "bg-slate-950 border-slate-800 text-white"
                }`}
              />
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

import React, { useState } from "react";
import {
  CrmLead,
  CrmStageId,
  CRM_PIPELINE_STAGES,
  HUDSON_CONSULTANTS,
  CrmTask,
  CrmNote,
  CrmActivityItem,
  CrmMessage,
} from "@/lib/crm/crmTypes";
import {
  X,
  Phone,
  Mail,
  MapPin,
  Home,
  DollarSign,
  FileText,
  Layers,
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  Calendar,
  User,
  ShieldCheck,
  Building2,
  Trash2,
  ExternalLink,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatAud } from "@/lib/pricing";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useTheme } from "@/lib/theme";

interface CrmClientDetailPageProps {
  lead: CrmLead;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLead: CrmLead) => void;
  onSendMessage?: (msg: Partial<CrmMessage>) => void;
  clientMessages?: CrmMessage[];
}

export function CrmClientDetailPage({
  lead,
  isOpen,
  onClose,
  onSave,
  onSendMessage,
  clientMessages = [],
}: CrmClientDetailPageProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [currentLead, setCurrentLead] = useState<CrmLead>(lead);
  const [newNoteText, setNewNoteText] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("Tomorrow");
  const [newMessageText, setNewMessageText] = useState("");
  const [msgChannel, setMsgChannel] = useState<"sms" | "email" | "call_note">("sms");

  if (!isOpen) return null;

  const currentStageDef = CRM_PIPELINE_STAGES.find((s) => s.id === currentLead.stage) || CRM_PIPELINE_STAGES[0];

  const handleStageChange = (newStageId: CrmStageId) => {
    const updated = {
      ...currentLead,
      stage: newStageId,
      activities: [
        {
          id: `act_${Date.now()}`,
          type: "status_change" as const,
          title: `Stage Changed to ${CRM_PIPELINE_STAGES.find((s) => s.id === newStageId)?.shortLabel}`,
          description: `Lead moved to ${newStageId} by sales consultant.`,
          timestamp: new Date().toISOString(),
        },
        ...(currentLead.activities || []),
      ],
      updatedAt: new Date().toISOString(),
    };
    setCurrentLead(updated);
    onSave(updated);
    toast.success(`Client stage updated to ${CRM_PIPELINE_STAGES.find((s) => s.id === newStageId)?.shortLabel}`);
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const newNote: CrmNote = {
      id: `note_${Date.now()}`,
      author: "Morgan Hales",
      content: newNoteText.trim(),
      createdAt: new Date().toISOString(),
    };
    const updated = {
      ...currentLead,
      clientNotes: [newNote, ...(currentLead.clientNotes || [])],
      activities: [
        {
          id: `act_${Date.now()}`,
          type: "note" as const,
          title: "Consultant Note Added",
          description: newNoteText.trim().substring(0, 80),
          timestamp: new Date().toISOString(),
        },
        ...(currentLead.activities || []),
      ],
      updatedAt: new Date().toISOString(),
    };
    setCurrentLead(updated);
    onSave(updated);
    setNewNoteText("");
    toast.success("Note saved to client record!");
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    const newTask: CrmTask = {
      id: `task_${Date.now()}`,
      title: newTaskTitle.trim(),
      dueDate: newTaskDueDate,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    const updated = {
      ...currentLead,
      tasks: [...(currentLead.tasks || []), newTask],
      updatedAt: new Date().toISOString(),
    };
    setCurrentLead(updated);
    onSave(updated);
    setNewTaskTitle("");
    toast.success("Task added to client schedule!");
  };

  const handleToggleTask = (taskId: string) => {
    const updatedTasks = (currentLead.tasks || []).map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    const updated = {
      ...currentLead,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    };
    setCurrentLead(updated);
    onSave(updated);
  };

  const handleSendQuickMessage = () => {
    if (!newMessageText.trim()) return;
    const newMsg: CrmMessage = {
      id: `msg_${Date.now()}`,
      clientEmail: currentLead.email,
      clientMobile: currentLead.mobile,
      direction: "outbound",
      channel: msgChannel,
      senderName: "Morgan Hales",
      recipientName: currentLead.clientName,
      subject: msgChannel === "email" ? `Hudson Homes — ${currentLead.preferredDesign} Update` : undefined,
      body: newMessageText.trim(),
      timestamp: new Date().toISOString(),
      isRead: true,
      outlookSynced: msgChannel === "email",
    };
    onSendMessage?.(newMsg);
    setNewMessageText("");
    toast.success(`${msgChannel.toUpperCase()} sent to ${currentLead.clientName}!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div
        className={`relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-2xl border ${
          isLight ? "bg-white border-slate-200 text-slate-900" : "bg-slate-950 border-slate-800 text-slate-100"
        } shadow-2xl overflow-hidden`}
      >
        {/* Top Header Banner */}
        <div className={`flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b ${
          isLight ? "bg-slate-50/90 border-slate-200" : "bg-slate-900/90 border-slate-800"
        }`}>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-md">
              {currentLead.clientName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{currentLead.clientName}</h2>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentStageDef.badgeBg} ${currentStageDef.badgeText}`}>
                  {currentStageDef.shortLabel}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 text-amber-500" /> {currentLead.mobile}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 text-cyan-500" /> {currentLead.email}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-emerald-500" /> Lot {currentLead.lotNumber || "TBA"}, {currentLead.targetEstate}
                </span>
              </div>
            </div>
          </div>

          {/* Current Stage Switcher & Close */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-medium">Pipeline Stage:</span>
              <select
                value={currentLead.stage}
                onChange={(e) => handleStageChange(e.target.value as CrmStageId)}
                className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border ${
                  isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-amber-400"
                } focus:outline-hidden`}
              >
                {CRM_PIPELINE_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg ${isLight ? "hover:bg-slate-200 text-slate-600" : "hover:bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Action Bridge Bar */}
        <div className={`flex flex-wrap items-center justify-between gap-2 px-6 py-2.5 border-b ${
          isLight ? "bg-amber-50/50 border-amber-200/60" : "bg-slate-900/40 border-slate-800/60"
        }`}>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Direct System Portals:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/flyer">
              <Button size="sm" variant="outline" className="h-7 text-xs border-amber-500/30 text-amber-600 dark:text-amber-300 hover:bg-amber-500/10 gap-1 font-semibold">
                <FileText className="h-3.5 w-3.5 text-amber-500" />
                Flyer Builder
              </Button>
            </Link>
            <Link to="/quote-builder">
              <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-300 hover:bg-emerald-500/10 gap-1 font-semibold">
                <Layers className="h-3.5 w-3.5 text-emerald-500" />
                Quoting Estimate
              </Button>
            </Link>
            <Link to="/tender-request">
              <Button size="sm" variant="outline" className="h-7 text-xs border-cyan-500/30 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/10 gap-1 font-semibold">
                <Send className="h-3.5 w-3.5 text-cyan-500" />
                Tender Request
              </Button>
            </Link>
            <a href={`tel:${currentLead.mobile}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs border-slate-700 text-slate-300 hover:text-white gap-1 font-semibold">
                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                Call
              </Button>
            </a>
            <a href={`mailto:${currentLead.email}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs border-slate-700 text-slate-300 hover:text-white gap-1 font-semibold">
                <Mail className="h-3.5 w-3.5 text-cyan-400" />
                Outlook Email
              </Button>
            </a>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Client Details, Notes & Tasks (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Build & Property Specifications */}
            <div className={`rounded-xl border p-4 ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"} space-y-3`}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <Home className="h-4 w-4" /> House &amp; Land Package Specification
                </h3>
                {currentLead.secondaryCustomerName && (
                  <span className="text-[10px] bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-full font-semibold">
                    Co-Buyer: {currentLead.secondaryCustomerName} ({currentLead.secondaryCustomerMobile || "No Phone"})
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Preferred Design</span>
                  <span className="font-bold text-white">{currentLead.preferredDesign}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Facade</span>
                  <span className="font-bold text-white">{currentLead.facadeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Housing Type</span>
                  <span className="font-bold text-white">{currentLead.housingType}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Land Status</span>
                  <span className="font-bold text-cyan-400">{currentLead.landStatus}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Estimated Deal Value</span>
                  <span className="font-bold text-emerald-400 font-mono">{formatAud(currentLead.totalEstimatedDealValue)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Official Tender Price</span>
                  {currentLead.tenderPrice ? (
                    <span className="font-bold text-amber-400 font-mono">{formatAud(currentLead.tenderPrice)}</span>
                  ) : (
                    <span className="text-slate-500 italic text-[11px]">Pending Tender Received</span>
                  )}
                </div>
              </div>
            </div>

            {/* Follow-up Tasks */}
            <div className={`rounded-xl border p-4 ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-500 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" /> Follow-up Tasks &amp; Action Items
                </span>
                <span className="text-[10px] text-slate-400">{(currentLead.tasks || []).filter(t => !t.completed).length} Pending</span>
              </h3>

              {/* Task List */}
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {(currentLead.tasks || []).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleToggleTask(t.id)}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                      t.completed
                        ? isLight ? "bg-slate-100 border-slate-200 text-slate-400 line-through" : "bg-slate-900/40 border-slate-800/40 text-slate-500 line-through"
                        : isLight ? "bg-white border-slate-200 text-slate-800 hover:border-cyan-400" : "bg-slate-900 border-slate-700 text-slate-200 hover:border-cyan-500"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`h-4 w-4 rounded border flex items-center justify-center ${t.completed ? "bg-emerald-500 border-emerald-500 text-slate-950" : "border-slate-600"}`}>
                        {t.completed && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <span>{t.title}</span>
                    </div>
                    <span className="text-[10px] text-amber-500 font-semibold">{t.dueDate}</span>
                  </div>
                ))}
              </div>

              {/* Add Task Input */}
              <div className="flex items-center gap-2">
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="New follow-up task description..."
                  className="h-8 text-xs bg-slate-950/60 border-slate-700"
                />
                <select
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="h-8 text-xs rounded-md bg-slate-900 border border-slate-700 text-slate-200 px-2"
                >
                  <option value="Today">Today</option>
                  <option value="Tomorrow">Tomorrow</option>
                  <option value="Next Week">Next Week</option>
                  <option value="After Soil Test">After Soil Test</option>
                </select>
                <Button size="sm" onClick={handleAddTask} className="h-8 text-xs bg-cyan-600 hover:bg-cyan-500 text-white gap-1">
                  <Plus className="h-3 w-3" /> Add
                </Button>
              </div>
            </div>

            {/* Consultant Notes */}
            <div className={`rounded-xl border p-4 ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4" /> Consultant Meeting &amp; Interaction Notes
              </h3>

              {/* Add Note Area */}
              <div className="space-y-2 mb-4">
                <Textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Add timestamped consultation notes, client feedback, or special site conditions..."
                  rows={2}
                  className="text-xs bg-slate-950/60 border-slate-700"
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleAddNote} className="h-7 text-xs bg-purple-600 hover:bg-purple-500 text-white gap-1">
                    <Plus className="h-3 w-3" /> Save Note
                  </Button>
                </div>
              </div>

              {/* Note Stream */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(currentLead.clientNotes || []).map((n) => (
                  <div key={n.id} className={`p-2.5 rounded-lg border text-xs ${isLight ? "bg-white border-slate-200" : "bg-slate-900/70 border-slate-800"}`}>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-bold text-purple-400">{n.author}</span>
                      <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-slate-300">{n.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Synced Activity Timeline & Messages (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Live Synced Activity Feed */}
            <div className={`rounded-xl border p-4 ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" /> Live Synced Activity Feed
                </span>
                <span className="text-[10px] text-slate-400">All Portals Synced</span>
              </h3>

              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {(currentLead.activities || []).map((act) => (
                  <div key={act.id} className="flex gap-2.5 items-start text-xs">
                    <div className="h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-none mt-0.5">
                      <CheckCircle2 className="h-3 w-3" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-200 block">{act.title}</span>
                      <p className="text-slate-400 text-[11px] leading-tight">{act.description}</p>
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Client Communication & Outlook Stream */}
            <div className={`rounded-xl border p-4 ${isLight ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-slate-800"}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Mail className="h-4 w-4" /> Client Communications
                </h3>
                <span className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Outlook Synced
                </span>
              </div>

              {/* Message Timeline */}
              <div className="space-y-2 max-h-48 overflow-y-auto mb-3 pr-1">
                {clientMessages.filter(m => m.clientEmail === currentLead.email).length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No recent messages recorded for this client.</p>
                ) : (
                  clientMessages
                    .filter(m => m.clientEmail === currentLead.email)
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-2.5 rounded-lg border text-xs ${
                          msg.direction === "outbound"
                            ? "bg-amber-950/20 border-amber-800/40 ml-4"
                            : "bg-blue-950/20 border-blue-800/40 mr-4"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-bold text-slate-200">
                            {msg.senderName} ({msg.channel.toUpperCase()})
                          </span>
                          <span>{new Date(msg.timestamp).toLocaleDateString()}</span>
                        </div>
                        {msg.subject && <div className="font-semibold text-cyan-300 text-[11px] mb-0.5">{msg.subject}</div>}
                        <p className="text-slate-300 leading-snug">{msg.body}</p>
                      </div>
                    ))
                )}
              </div>

              {/* Quick Reply Bar */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  {(["sms", "email", "call_note"] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setMsgChannel(ch)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase transition-colors ${
                        msgChannel === ch
                          ? "bg-amber-500 text-slate-950 border-amber-400"
                          : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                      }`}
                    >
                      {ch.replace("_", " ")}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    placeholder={`Send quick ${msgChannel.toUpperCase()} to ${currentLead.clientName}...`}
                    className="h-8 text-xs bg-slate-950/60 border-slate-700"
                  />
                  <Button size="sm" onClick={handleSendQuickMessage} className="h-8 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold gap-1">
                    <Send className="h-3 w-3" /> Send
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

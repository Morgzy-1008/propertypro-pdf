import React, { useState, useEffect, useRef } from "react";
import {
  CrmLead,
  CrmTeamMessage,
  HUDSON_CONSULTANTS,
} from "@/lib/crm/crmTypes";
import {
  loadAllTeamMessages,
  saveTeamMessage,
} from "@/lib/crm/crmStorage";
import {
  MessageSquare,
  Send,
  Users,
  Hash,
  Sparkles,
  AlertTriangle,
  UserCheck,
  Search,
  Plus,
  Flame,
  FileCheck2,
  Clock,
  Shield,
  HelpCircle,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";
import { getActiveStaffUser } from "@/lib/authSession";

interface CrmTeamChatViewProps {
  leads: CrmLead[];
  onOpenLead: (lead: CrmLead) => void;
}

type ChannelId = "general-sales" | "tender-dispatch" | "admin-assistance" | "hot-deals";

const CHANNELS: { id: ChannelId; name: string; icon: string; description: string }[] = [
  {
    id: "general-sales",
    name: "general-sales",
    icon: "💬",
    description: "Team chat, display home traffic, and sales updates",
  },
  {
    id: "tender-dispatch",
    name: "tender-dispatch",
    icon: "📋",
    description: "Handoffs with Head Office Estimating & Tender preparation",
  },
  {
    id: "admin-assistance",
    name: "admin-assistance",
    icon: "🤝",
    description: "Assistants helping NHCs: surveys, soil tests, covenants & sitings",
  },
  {
    id: "hot-deals",
    name: "hot-deals",
    icon: "🔥",
    description: "Top 10 TR Targets, closing countdowns, and ATP celebrations",
  },
];

export function CrmTeamChatView({ leads, onOpenLead }: CrmTeamChatViewProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const staffUser = getActiveStaffUser();

  const [activeChannelId, setActiveChannelId] = useState<ChannelId>("general-sales");
  const [messages, setMessages] = useState<CrmTeamMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const chatBottomRef = useRef<HTMLDivElement>(null);

  const refreshMessages = async () => {
    const list = await loadAllTeamMessages();
    setMessages(list);
  };

  useEffect(() => {
    refreshMessages();

    const handleNewMsg = () => {
      refreshMessages();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("hudson_team_chat_message", handleNewMsg);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("hudson_team_chat_message", handleNewMsg);
      }
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeChannelId]);

  const channelMessages = messages.filter((m) => m.channelId === activeChannelId);

  const filteredMessages = channelMessages.filter((m) => {
    if (!searchTerm) return true;
    return (
      m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.linkedLeadName && m.linkedLeadName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const linkedLead = leads.find((l) => l.id === selectedLeadId);

    const newMsg: CrmTeamMessage = {
      id: `tm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      channelId: activeChannelId,
      authorId: staffUser?.id || "morgan-hales",
      authorName: staffUser?.name || "Morgan Hales",
      authorRole: staffUser?.title || "Senior NHC & Admin",
      content: messageText.trim(),
      timestamp: new Date().toISOString(),
      linkedLeadId: linkedLead?.id,
      linkedLeadName: linkedLead ? `${linkedLead.clientName} (${linkedLead.preferredDesign})` : undefined,
      isUrgent,
    };

    const updated = await saveTeamMessage(newMsg);
    setMessages(updated);
    setMessageText("");
    setSelectedLeadId("");
    setIsUrgent(false);
    toast.success("Message posted to team channel! ✓");
  };

  const handleInsertMention = (name: string) => {
    setMessageText((prev) => `${prev} @${name} `);
  };

  const activeChannelDef = CHANNELS.find((c) => c.id === activeChannelId) || CHANNELS[0];

  return (
    <div className={`rounded-2xl border ${
      isLight ? "bg-white border-slate-200" : "bg-slate-900/70 border-slate-800"
    } shadow-2xl overflow-hidden flex flex-col h-[580px] sm:h-[600px]`}>
      {/* Top Header Banner */}
      <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b ${
        isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-slate-800"
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{activeChannelDef.icon}</span>
          <div>
            <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>#{activeChannelDef.name}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Hudson Internal Hub
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">{activeChannelDef.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3 w-3 text-slate-500" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search team chat..."
              className={`h-7.5 pl-7.5 text-xs w-44 sm:w-56 ${
                isLight ? "bg-white border-slate-300" : "bg-slate-900 border-slate-700"
              }`}
            />
          </div>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full font-semibold hidden sm:inline-block">
            ● Teams Alternative Active
          </span>
        </div>
      </div>

      {/* Main Grid: Channels Sidebar (4 cols) + Message Stream (8 cols) */}
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0">
        {/* Left Column: Channels & Online Staff */}
        <div className={`md:col-span-4 border-r flex flex-col justify-between p-3 space-y-4 ${
          isLight ? "border-slate-200 bg-slate-50/50" : "border-slate-800 bg-slate-950/40"
        }`}>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 block mb-2">
              Internal Channels
            </span>
            <div className="space-y-1">
              {CHANNELS.map((ch) => {
                const count = messages.filter((m) => m.channelId === ch.id).length;
                const isActive = activeChannelId === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActiveChannelId(ch.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-left ${
                      isActive
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                        : isLight
                        ? "text-slate-700 hover:bg-slate-200"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{ch.icon}</span>
                      <span className="truncate">#{ch.name}</span>
                    </div>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-slate-950 text-amber-400" : "bg-slate-800 text-slate-400"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Assistant / Admin Delegation Hint */}
            <div className={`mt-5 p-3 rounded-xl border text-xs ${
              isLight ? "bg-amber-50/70 border-amber-200 text-amber-900" : "bg-amber-950/20 border-amber-800/40 text-amber-200"
            }`}>
              <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px] text-amber-600 dark:text-amber-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Assistant &amp; NHC Collaboration:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Use <strong>#admin-assistance</strong> for assistants to update soil tests, contour surveys, and siting covenants. Tag deals directly so consultants can jump to the 360° record with 1 click!
              </p>
            </div>
          </div>

          {/* Online Staff Pill List */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2 px-1">
              Active Team ({HUDSON_CONSULTANTS.length})
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {HUDSON_CONSULTANTS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleInsertMention(c.name)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-700 hover:border-amber-500"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-amber-400"
                  }`}
                  title={`Click to mention ${c.name}`}
                >
                  @{c.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Message Stream & Rich Composer */}
        <div className="md:col-span-8 flex flex-col justify-between min-h-0 bg-transparent overflow-hidden">
          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {filteredMessages.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-xs text-slate-400">
                <span className="text-3xl mb-2">{activeChannelDef.icon}</span>
                <p className="font-semibold text-slate-200">No messages in #{activeChannelDef.name} yet</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Post an update, delegate a task, or tag a colleague below.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelf = msg.authorId === staffUser?.id || msg.authorName === staffUser?.name;
                const authorInitial = msg.authorName.charAt(0);

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 text-xs ${
                      msg.isUrgent ? "p-3 rounded-xl border border-rose-500/40 bg-rose-950/10" : ""
                    }`}
                  >
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-black text-xs shrink-0 shadow-sm mt-0.5">
                      {authorInitial}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-white text-[12px]">{msg.authorName}</span>
                        <span className="text-[10px] text-slate-400">({msg.authorRole})</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {msg.isUrgent && (
                          <span className="text-[9px] font-bold px-1.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            ACTION REQUIRED
                          </span>
                        )}
                      </div>

                      {/* Tagged Client Record Chip */}
                      {msg.linkedLeadName && (
                        <div className="mb-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              const found = leads.find((l) => l.id === msg.linkedLeadId);
                              if (found) onOpenLead(found);
                              else toast.info("Linked client record not loaded in current filter.");
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            <span>Client: {msg.linkedLeadName}</span>
                          </button>
                        </div>
                      )}

                      <p className={`text-slate-200 leading-relaxed text-xs whitespace-pre-wrap ${
                        isLight ? "text-slate-800" : "text-slate-200"
                      }`}>
                        {msg.content}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Composer Box */}
          <form onSubmit={handleSendMessage} className={`shrink-0 p-3 sm:p-4 border-t ${
            isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-slate-950/70"
          } space-y-2`}>
            {/* Quick Toolbar: Tag Client, Tag Teammates, Urgent Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Link Client:</span>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
                  className={`h-7 text-[11px] rounded-md border px-2 font-medium ${
                    isLight ? "bg-white border-slate-300" : "bg-slate-900 border-slate-700 text-slate-200"
                  }`}
                >
                  <option value="">No Client Linked</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.clientName} ({l.preferredDesign})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUrgent}
                    onChange={(e) => setIsUrgent(e.target.checked)}
                    className="h-3 w-3 rounded text-rose-500 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className={isUrgent ? "text-rose-400 font-bold" : "text-slate-400"}>
                    🚨 Mark Urgent
                  </span>
                </label>
              </div>
            </div>

            {/* Input + Send */}
            <div className="flex gap-2">
              <Textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder={`Message #${activeChannelDef.name}... (Press Enter to post)`}
                rows={2}
                className={`text-xs ${
                  isLight ? "bg-white border-slate-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"
                }`}
              />
              <Button
                type="submit"
                className="h-auto px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-1.5"
              >
                <Send className="h-3.5 w-3.5" />
                Post
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

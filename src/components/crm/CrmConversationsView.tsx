import React, { useState } from "react";
import { CrmLead, CrmMessage } from "@/lib/crm/crmTypes";
import {
  MessageSquare,
  Mail,
  Phone,
  Search,
  Send,
  RefreshCw,
  Sparkles,
  User,
  ExternalLink,
  CheckCircle2,
  Inbox,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useTheme } from "@/lib/theme";

interface CrmConversationsViewProps {
  leads: CrmLead[];
  messages: CrmMessage[];
  onSendMessage: (msg: CrmMessage) => void;
  onOpenClientProfile: (lead: CrmLead) => void;
  onTriggerOutlookSync: () => void;
  outlookSyncState: { synced: boolean; count: number; lastSync: string };
}

export function CrmConversationsView({
  leads,
  messages,
  onSendMessage,
  onOpenClientProfile,
  onTriggerOutlookSync,
  outlookSyncState,
}: CrmConversationsViewProps) {
  const { mode } = useTheme();
  const isLight = mode === "normal";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClientEmail, setSelectedClientEmail] = useState<string>(
    leads[0]?.email || "jordan.hales@gmail.com"
  );
  const [replyText, setReplyText] = useState("");
  const [replyChannel, setReplyChannel] = useState<"email" | "sms" | "call_note">("email");

  // Group threads by client
  const clientThreads = leads.map((lead) => {
    const threadMsgs = messages.filter((m) => m.clientEmail.toLowerCase() === lead.email.toLowerCase());
    const latestMsg = threadMsgs[0] || null;
    const unreadCount = threadMsgs.filter((m) => !m.isRead && m.direction === "inbound").length;
    return {
      lead,
      latestMsg,
      unreadCount,
    };
  });

  const filteredThreads = clientThreads.filter((t) => {
    return (
      t.lead.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.lead.targetEstate.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const activeLead = leads.find((l) => l.email.toLowerCase() === selectedClientEmail.toLowerCase()) || leads[0];
  const activeMessages = messages.filter(
    (m) => activeLead && m.clientEmail.toLowerCase() === activeLead.email.toLowerCase()
  );

  const handleSendReply = () => {
    if (!replyText.trim() || !activeLead) return;

    const newMsg: CrmMessage = {
      id: `msg_${Date.now()}`,
      clientEmail: activeLead.email,
      clientMobile: activeLead.mobile,
      direction: "outbound",
      channel: replyChannel,
      senderName: "Morgan Hales",
      recipientName: activeLead.clientName,
      subject: replyChannel === "email" ? `Re: ${activeLead.preferredDesign} — Hudson Homes Update` : undefined,
      body: replyText.trim(),
      timestamp: new Date().toISOString(),
      isRead: true,
      outlookSynced: replyChannel === "email",
    };

    onSendMessage(newMsg);
    setReplyText("");
    toast.success(`${replyChannel.toUpperCase()} message sent to ${activeLead.clientName}!`);
  };

  return (
    <div className={`rounded-2xl border ${
      isLight ? "bg-white border-slate-200" : "bg-slate-900/70 border-slate-800"
    } shadow-2xl overflow-hidden flex flex-col h-[750px]`}>
      {/* Top Bar with Outlook Sync Status */}
      <div className={`flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b ${
        isLight ? "bg-slate-50 border-slate-200" : "bg-slate-950/80 border-slate-800"
      }`}>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-amber-500" />
          <h2 className="text-sm font-bold text-white tracking-wide uppercase">
            Client Communications &amp; Outlook Inbox
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-3 py-1 rounded-full font-medium">
            <Mail className="h-3.5 w-3.5" />
            <span>Outlook 365 Connected ({outlookSyncState.count} emails captured)</span>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onTriggerOutlookSync}
            className="h-7 text-xs border-slate-700 text-slate-300 hover:text-white gap-1"
          >
            <RefreshCw className="h-3 w-3 text-cyan-400" />
            Sync Outlook Now
          </Button>
        </div>
      </div>

      {/* Main Grid: Thread List (Left) + Message Feed (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 flex-1 min-h-0">
        {/* Left Column: Client Threads List */}
        <div className={`md:col-span-4 border-r flex flex-col ${
          isLight ? "border-slate-200 bg-slate-50/50" : "border-slate-800 bg-slate-950/40"
        }`}>
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-800/60">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search conversations..."
                className="h-8 pl-8 text-xs bg-slate-900 border-slate-700"
              />
            </div>
          </div>

          {/* Threads Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
            {filteredThreads.map(({ lead, latestMsg, unreadCount }) => {
              const isSelected = activeLead && lead.id === activeLead.id;
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedClientEmail(lead.email)}
                  className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 ${
                    isSelected
                      ? isLight ? "bg-amber-100/60 border-l-4 border-amber-500" : "bg-amber-500/10 border-l-4 border-amber-500"
                      : isLight ? "hover:bg-slate-100" : "hover:bg-slate-900/60"
                  }`}
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold text-sm flex-none shadow-xs">
                    {lead.clientName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold truncate ${isSelected ? "text-amber-400" : "text-slate-200"}`}>
                        {lead.clientName}
                      </span>
                      {latestMsg && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(latestMsg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {latestMsg ? latestMsg.body : "No conversation history yet."}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-cyan-400 font-medium">{lead.targetEstate}</span>
                      {unreadCount > 0 && (
                        <span className="bg-amber-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full">
                          {unreadCount} NEW
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Conversation Stream */}
        <div className="md:col-span-8 flex flex-col h-full bg-slate-950/20">
          {activeLead ? (
            <>
              {/* Conversation Top Header */}
              <div className={`p-4 border-b flex items-center justify-between ${
                isLight ? "bg-white border-slate-200" : "bg-slate-900/60 border-slate-800"
              }`}>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {activeLead.clientName}
                    <span className="text-xs font-mono text-amber-400">({activeLead.preferredDesign})</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    {activeLead.email} • {activeLead.mobile} • Lot {activeLead.lotNumber || "TBA"} {activeLead.targetEstate}
                  </span>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenClientProfile(activeLead)}
                  className="text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10 gap-1.5 font-semibold"
                >
                  <User className="h-3.5 w-3.5" />
                  View 360° Profile
                </Button>
              </div>

              {/* Message Stream */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeMessages.length === 0 ? (
                  <div className="text-center py-16 text-slate-500 text-xs">
                    <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No previous messages with {activeLead.clientName}. Send an email or SMS below!
                  </div>
                ) : (
                  activeMessages.map((msg) => {
                    const isOut = msg.direction === "outbound";
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[80%] ${isOut ? "ml-auto items-end" : "mr-auto items-start"}`}
                      >
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                          <span className="font-bold text-slate-300">{msg.senderName}</span>
                          <span>•</span>
                          <span className="uppercase font-mono text-cyan-400">{msg.channel}</span>
                          <span>•</span>
                          <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-md ${
                            isOut
                              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-medium rounded-tr-none"
                              : isLight
                              ? "bg-slate-100 border border-slate-200 text-slate-900 rounded-tl-none"
                              : "bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-none"
                          }`}
                        >
                          {msg.subject && (
                            <div className={`font-bold pb-1 mb-1 border-b ${isOut ? "border-slate-950/20 text-slate-950" : "border-slate-700 text-cyan-300"}`}>
                              {msg.subject}
                            </div>
                          )}
                          {msg.body}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Reply Box */}
              <div className={`p-4 border-t ${isLight ? "bg-white border-slate-200" : "bg-slate-900/80 border-slate-800"}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {(["email", "sms", "call_note"] as const).map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setReplyChannel(ch)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase transition-colors ${
                          replyChannel === ch
                            ? "bg-amber-500 text-slate-950 border-amber-400 shadow-xs"
                            : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"
                        }`}
                      >
                        {ch.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-500">Press Send to dispatch</span>
                </div>

                <div className="flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Write a ${replyChannel.toUpperCase()} to ${activeLead.clientName}...`}
                    rows={2}
                    className="text-xs bg-slate-950/80 border-slate-700"
                  />
                  <Button
                    size="sm"
                    onClick={handleSendReply}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 flex flex-col items-center justify-center gap-1 shrink-0"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send</span>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
              Select a client thread on the left to view conversation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

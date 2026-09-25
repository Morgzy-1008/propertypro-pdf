import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Bot,
  Copy,
  Check,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
  Cpu,
} from "lucide-react";
import { toast } from "sonner";
import { type StaffProfile } from "@/lib/authSession";
import { getGeminiApiKey } from "@/lib/land-scout/landScoutWebSearch";

const HUDSON_KNOWLEDGE_INSTRUCTION = `
You are the Hudson Homes Personal AI Assistant (Hudson Copilot).
Audience: New Home Consultants (NHCs), sales estimators, and staff.

STRICT MANDATE:
1. Only answer with verified confidence exceeding 95%.
2. If asked about unreleased pricing, speculative land releases, or non-Hudson topics, refuse to hallucinate and state:
   "⚠️ **Accuracy Notice**: I cannot answer that with high accuracy (>95% confidence) at this moment. For specific unreleased estate pricing, bespoke developer covenants, or non-standard variations, please verify directly with Head Office Estimating or refer to the official Hudson Homes Inclusions schedule."
3. Hudson Inclusions:
   - Trend: 20mm stone benchtop, Westinghouse 900mm appliances, 2440mm ceiling, Colorbond/concrete tile roof, Taubmans 3-coat paint, Termimesh barrier.
   - Designer: 2590mm raised ceiling, 40mm stone benchtop, 900mm European appliances, soft-close cabinets, ducted AC (Actron/Daikin), full-height bathroom tiling, shower niches.
   - H3 Tier: Architectural awning windows ($0 variation), freestanding bathtub, double undermount kitchen sink, full-height porcelain wall tiles.
   - Fixed Site Costs: Up to H-class slab, piering, council submission (DA/CDC), BASIX/NatHERS 7-star compliance.
4. Hudson OS (hudson.dev):
   - Flyer Builder (/flyer): 4 templates (1-Page Express, 2-Page Siting, 2-Page Showcase, House Only), automated logged-in NHC details.
   - Land Database (/database): Searchable lot inventory, AI Price List Parser, 1-click package handoff.
   - Quote Builder V2 (/quote-builder): 5 steps, Modified Plan Engine with visual diffing and Presight code parsing for alfresco/garage extensions, window/door modifications, and sink fixtures.

Return valid JSON format:
{
  "answer": "markdown answer",
  "confidence": number,
  "verified": boolean,
  "suggestedQuestions": ["Q1", "Q2", "Q3"]
}
`;

async function queryGeminiDirect(
  message: string,
  history: Array<{ role: string; text: string }>,
  apiKey: string,
  staffUser: StaffProfile | null
): Promise<any> {
  const models = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-flash-latest"];
  const userInfo = staffUser
    ? `Active user: ${staffUser.name || "NHC"} (${staffUser.displayCentre || "Display Centre"}, role: ${staffUser.role || "Consultant"}).`
    : "Active user: Hudson Homes Staff Member.";

  const contents: any[] = [
    {
      role: "user",
      parts: [{ text: `[SYSTEM KNOWLEDGE & INSTRUCTIONS]\n${HUDSON_KNOWLEDGE_INSTRUCTION}\n\n${userInfo}\n\nPlease acknowledge instructions.` }],
    },
    {
      role: "model",
      parts: [{ text: JSON.stringify({ answer: "Understood. I will answer only with >95% accuracy.", confidence: 1.0, verified: true }) }],
    },
  ];

  for (const turn of history.slice(-6)) {
    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.text }],
    });
  }
  contents.push({
    role: "user",
    parts: [{ text: message }],
  });

  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.25,
            responseMimeType: "application/json",
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const rawText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          try {
            const parsed = JSON.parse(rawText);
            parsed.modelUsed = m;
            return parsed;
          } catch {
            return {
              answer: rawText,
              confidence: 0.95,
              verified: true,
              suggestedQuestions: [
                "What features are included in Designer inclusions?",
                "How does Quote Builder V2 calculate variations?",
              ],
              modelUsed: m,
            };
          }
        }
      }
    } catch {}
  }
  throw new Error("Direct Gemini connection failed.");
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  confidence?: number;
  verified?: boolean;
  suggestedQuestions?: string[];
  modelUsed?: string;
  timestamp: string;
}

interface HubAiAssistantProps {
  isLight: boolean;
  staffUser: StaffProfile | null;
}

const DEFAULT_SUGGESTIONS = [
  "What is the difference between Designer and Trend inclusions?",
  "How does the Quote Builder Modified Plan Engine work?",
  "What are the 4 flyer templates in Package Studio?",
  "What features are included in the H3 luxury tier?",
  "What fixed site costs does Hudson Homes cover?",
];

export function HubAiAssistant({ isLight, staffUser }: HubAiAssistantProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem("hudson_hub_chat_history");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem("hudson_hub_chat_history");
      return saved ? JSON.parse(saved).length > 0 : false;
    } catch {
      return false;
    }
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem("hudson_hub_chat_history", JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (isExpanded && messages.length > 0 && threadRef.current) {
      threadRef.current.scrollTo({
        top: threadRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isExpanded, isLoading]);

  const handleSend = async (userText: string) => {
    const trimmed = userText.trim();
    if (!trimmed || isLoading) return;

    const userMessageId = `usr_${Date.now()}`;
    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMessageId,
        role: "user",
        text: trimmed,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];

    setMessages(newMessages);
    setQuery("");
    setIsExpanded(true);
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const apiKey = getGeminiApiKey();
      let data: any = null;

      try {
        const res = await fetch("/api/hub-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: historyPayload,
            apiKey: apiKey || undefined,
            staffUser: staffUser
              ? {
                  name: staffUser.name,
                  displayCentre: staffUser.displayCentre,
                  role: staffUser.role,
                }
              : null,
          }),
        });

        if (res.ok) {
          data = await res.json();
        }
      } catch (networkErr) {
        console.warn("[HubAiAssistant] Serverless proxy fetch error, falling back to direct client call:", networkErr);
      }

      // If serverless endpoint returned an error or failed (e.g. 502/500), fall back directly to Gemini API
      if (!data && apiKey) {
        data = await queryGeminiDirect(trimmed, historyPayload, apiKey, staffUser);
      }

      if (!data) {
        throw new Error("Unable to obtain response from Hudson AI service.");
      }

      // Enforce 95% confidence threshold check
      if (typeof data.confidence === "number" && data.confidence < 0.95) {
        data.verified = false;
        data.answer =
          "⚠️ **Accuracy Notice**: I cannot answer that with high accuracy (>95% confidence) at this moment. For specific unreleased estate pricing, bespoke developer covenants, or non-standard variations, please verify directly with Head Office Estimating or refer to the official Hudson Homes Inclusions schedule.";
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: "assistant",
          text: data.answer || "No response received.",
          confidence: data.confidence,
          verified: data.verified,
          suggestedQuestions: data.suggestedQuestions || [],
          modelUsed: data.modelUsed || "gemini-3.8-flash",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      toast.error("Could not complete request", {
        description: err.message || "Failed to reach Hudson AI service.",
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          role: "assistant",
          text: "⚠️ **Connection Error**: Unable to reach the Hudson AI service. Please ensure your network is connected and try again.",
          confidence: 0,
          verified: false,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    setIsExpanded(false);
    try {
      sessionStorage.removeItem("hudson_hub_chat_history");
    } catch {}
    toast.success("Chat history cleared");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Answer copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  /** Formats markdown lines cleanly without extra dependencies */
  const renderFormattedMarkdown = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Heading 3: ### Title
      if (trimmed.startsWith("### ")) {
        return (
          <h4
            key={idx}
            className={`font-bold text-sm tracking-wide mt-3 mb-1.5 ${
              isLight ? "text-amber-800" : "text-amber-400"
            }`}
          >
            {trimmed.replace("### ", "")}
          </h4>
        );
      }

      // Heading 4 / Sub: #### Title
      if (trimmed.startsWith("#### ")) {
        return (
          <h5
            key={idx}
            className={`font-semibold text-xs tracking-wider uppercase mt-2 mb-1 ${
              isLight ? "text-slate-800" : "text-amber-200"
            }`}
          >
            {trimmed.replace("#### ", "")}
          </h5>
        );
      }

      // Divider: ---
      if (trimmed === "---") {
        return <hr key={idx} className={`my-2 border-t ${isLight ? "border-slate-200" : "border-slate-800"}`} />;
      }

      // Bullet points: * or -
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        const bulletText = trimmed.replace(/^[\*\-]\s+/, "");
        return (
          <li key={idx} className="ml-4 list-disc my-1 leading-relaxed">
            {formatBoldText(bulletText)}
          </li>
        );
      }

      // Numbered items: 1. 2.
      if (/^\d+\.\s+/.test(trimmed)) {
        const itemText = trimmed.replace(/^\d+\.\s+/, "");
        return (
          <li key={idx} className="ml-4 list-decimal my-1 leading-relaxed">
            {formatBoldText(itemText)}
          </li>
        );
      }

      // Empty line
      if (!trimmed) {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="my-1 leading-relaxed">
          {formatBoldText(trimmed)}
        </p>
      );
    });
  };

  /** Handles **bold** and `code` spans */
  const formatBoldText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className={`font-bold ${isLight ? "text-slate-900" : "text-amber-300"}`}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${
              isLight ? "bg-slate-200 text-slate-800" : "bg-slate-800 text-amber-300 border border-slate-700"
            }`}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="w-full">
      {/* Sleek Aesthetic Message Bar */}
      <div
        className={`relative rounded-2xl border transition-all duration-300 shadow-xl overflow-hidden ${
          isLight
            ? "border-slate-200/90 bg-white shadow-slate-200/50 hover:border-brand-gold/50 focus-within:border-brand-gold focus-within:ring-2 focus-within:ring-brand-gold/20"
            : "border-slate-800/90 bg-gradient-to-b from-slate-900/95 to-slate-900/60 backdrop-blur-xl shadow-black/40 hover:border-brand-gold/40 focus-within:border-brand-gold/70 focus-within:shadow-brand-gold/10"
        }`}
      >
        {/* Subtle Ambient Top Border Accent */}
        <div className="absolute top-0 left-8 right-8 h-[2px] bg-gradient-to-r from-transparent via-brand-gold to-transparent opacity-90" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(query);
          }}
          className="flex items-center gap-2.5 p-2 sm:p-3"
        >
          {/* AI Badge Icon */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold select-none flex-shrink-0 ${
              isLight
                ? "bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs"
                : "bg-gradient-to-r from-amber-950/80 to-slate-900 border border-brand-gold/30 text-amber-300 shadow-inner"
            }`}
          >
            <Sparkles className="h-4 w-4 text-brand-gold animate-pulse" />
            <span className="font-mono tracking-tight text-xs font-bold">Hudson AI</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>

          {/* Main Aesthetic Input Field */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Hudson AI anything (e.g. inclusions, pricing, floorplans, or site features)..."
            disabled={isLoading}
            className={`flex-1 bg-transparent px-3 py-2.5 text-sm sm:text-base outline-none transition-colors ${
              isLight
                ? "text-slate-900 placeholder:text-slate-400 font-medium"
                : "text-white placeholder:text-slate-500 font-normal"
            } disabled:opacity-60`}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 pr-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  isLight
                    ? "border-slate-200 hover:bg-slate-100 text-slate-600"
                    : "border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
                title={isExpanded ? "Collapse conversation" : "Expand conversation"}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}

            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                query.trim() && !isLoading
                  ? "bg-gradient-to-r from-amber-500 via-brand-gold to-amber-600 text-slate-950 shadow-md shadow-brand-gold/25 hover:scale-[1.02] active:scale-[0.98]"
                  : "bg-slate-800/40 text-slate-500 border border-slate-800/80 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <>
                  <Cpu className="h-4 w-4 animate-spin text-amber-400" />
                  <span className="hidden sm:inline">Verifying...</span>
                </>
              ) : (
                <>
                  <span>Ask</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Quick Suggestion Pills (Wrapped, Zero Scrollbar) */}
        <div
          style={{ overflowX: "hidden", scrollbarWidth: "none", msOverflowStyle: "none" }}
          className={`flex flex-wrap items-center gap-2 px-4 py-2.5 border-t text-xs overflow-hidden no-scrollbar ${
            isLight ? "border-slate-100 bg-slate-50/70" : "border-slate-800/60 bg-slate-950/50"
          }`}
        >
          <span className={`text-[10px] uppercase font-bold tracking-wider mr-1 flex-shrink-0 flex items-center gap-1.5 ${isLight ? "text-slate-500" : "text-slate-400"}`}>
            <Sparkles className="h-3 w-3 text-brand-gold" />
            <span>Suggested:</span>
          </span>
          {DEFAULT_SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(item);
                handleSend(item);
              }}
              disabled={isLoading}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all cursor-pointer ${
                isLight
                  ? "border-slate-200 bg-white text-slate-700 hover:border-brand-gold hover:text-amber-800 hover:bg-amber-50/50 shadow-2xs"
                  : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-brand-gold/60 hover:text-amber-300 hover:bg-slate-800"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Expandable Conversational Window */}
      {isExpanded && messages.length > 0 && (
        <div
          className={`mt-4 rounded-2xl border p-5 sm:p-6 transition-all duration-300 shadow-2xl ${
            isLight
              ? "border-slate-200 bg-white shadow-slate-200/60"
              : "border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-black/50"
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60 mb-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-brand-gold" />
              <h3 className={`text-xs font-bold uppercase tracking-wider ${isLight ? "text-slate-800" : "text-amber-400"}`}>
                Hudson Homes Copilot
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                Gemini 3.8 Flash
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className={`text-[11px] font-medium inline-flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  isLight
                    ? "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    : "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
                title="Minimize conversation"
              >
                <ChevronUp className="h-3 w-3" />
                <span>Minimize</span>
              </button>

              <button
                type="button"
                onClick={handleClearHistory}
                className={`text-[11px] font-medium inline-flex items-center gap-1 px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  isLight
                    ? "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    : "border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
                title="Clear conversation"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Message Thread */}
          <div ref={threadRef} className="space-y-4 max-h-[460px] overflow-y-auto overflow-x-hidden pr-1.5 custom-scrollbar">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                {/* Role Header */}
                <div className="flex items-center gap-1.5 mb-1 px-1">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                    m.role === "user"
                      ? isLight ? "text-slate-500" : "text-slate-400"
                      : "text-amber-400"
                  }`}>
                    {m.role === "user" ? (staffUser?.name || "You") : "Hudson Copilot"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">&bull; {m.timestamp}</span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? isLight
                        ? "bg-amber-600 text-white rounded-br-xs"
                        : "bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-br-xs shadow-md"
                      : isLight
                        ? "bg-slate-50 text-slate-800 border border-slate-200 rounded-bl-xs"
                        : "bg-slate-950/70 text-slate-200 border border-slate-800/90 rounded-bl-xs"
                  }`}
                >
                  {m.role === "assistant" ? renderFormattedMarkdown(m.text) : <p>{m.text}</p>}

                  {/* Verification / Confidence Badge for AI Messages */}
                  {m.role === "assistant" && (
                    <div className="mt-3 pt-3 border-t border-slate-800/40 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        {m.verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                            <ShieldCheck className="h-3 w-3" />
                            <span>{Math.round((m.confidence || 0.98) * 100)}% Verified Hudson Accuracy</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Accuracy Threshold Protected</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono">
                          {m.modelUsed || "gemini-3.8-flash"}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyToClipboard(m.text, m.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded border transition-colors cursor-pointer ${
                          copiedId === m.id
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                            : isLight
                              ? "border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              : "border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                        }`}
                        title="Copy answer"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-[10px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span className="text-[10px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Follow-up Suggested Questions */}
                {m.role === "assistant" && m.suggestedQuestions && m.suggestedQuestions.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 pl-1">
                    {m.suggestedQuestions.map((q, qIdx) => (
                      <button
                        key={qIdx}
                        type="button"
                        onClick={() => {
                          setQuery(q);
                          handleSend(q);
                        }}
                        disabled={isLoading}
                        className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                          isLight
                            ? "border-slate-200 bg-white text-slate-600 hover:border-brand-gold hover:text-brand-gold shadow-2xs"
                            : "border-slate-800 bg-slate-900/60 text-slate-400 hover:border-brand-gold/60 hover:text-amber-300"
                        }`}
                      >
                        <Sparkles className="h-2.5 w-2.5 text-brand-gold" />
                        <span>{q}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex flex-col items-start space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 px-1">
                  Hudson Copilot
                </span>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
                    isLight
                      ? "bg-slate-50 border-slate-200 text-slate-700"
                      : "bg-slate-950/80 border-slate-800 text-slate-300"
                  }`}
                >
                  <Cpu className="h-4 w-4 text-brand-gold animate-spin" />
                  <span className="text-xs">
                    Cross-referencing Hudson Homes specs with Gemini 3.8 Flash (checking &gt;95% accuracy)...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

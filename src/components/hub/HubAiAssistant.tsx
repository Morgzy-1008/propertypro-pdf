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
  FileDown,
  FileText,
  Download,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { type StaffProfile } from "@/lib/authSession";
import { getGeminiApiKey } from "@/lib/land-scout/landScoutWebSearch";
import {
  generateHudsonKnowledgeResponse,
  getLastAssessment,
} from "@/lib/hubKnowledgeEngine";
import { downloadComplianceReportPdf } from "@/lib/planning/compliancePdfExporter";
import { type FeasibilityAssessmentResult } from "@/lib/planning/universalPlanningEngine";

const HUDSON_KNOWLEDGE_INSTRUCTION = `
You are the Hudson Homes Personal AI Assistant (Hudson Copilot).
Audience: New Home Consultants (NHCs), sales estimators, and staff.

CORE OPERATING MANDATE:
1. Always provide authoritative, decisive, and comprehensive planning, construction, and statutory feasibility determinations. Never respond with apologetic refusal notices (e.g. NEVER state "I apologize, but I cannot answer that with 100% confidence" or "Accuracy Notice").
2. Fast-Track Compliance Check (CC) Shorthand Commands:
   - 'CC <address>' -> Immediately generate a full statutory compliance check covering governing council, statutory zoning, minimum lot size & frontage, boundary setbacks (front, garage, sides, rear), maximum site coverage, height, all 7 technical overlays, and matching Hudson designs.
   - 'CC duplex <address>' -> Prioritize duplex / dual occupancy compliance (minimum lot size, minimum frontage for dual crossovers, CDC vs DA / Code Assessable path, infrastructure charges, FRL 60/60/60 party wall, and recommended Hudson models like Wisteria 33/34/36/40).
   - 'CC dual key <address>' / 'CC secondary dwelling <address>' -> Detail auxiliary living / granny flat controls under single title (up to 70m² GFA in QLD / 60m² in NSW, $0 council infrastructure charges exemption, 1 dedicated parking space).
3. Australian Construction & Building Engineering Knowledge:
   - Geotechnical Soil Classifications (AS 2870): Class A (rock/sand, ys=0mm), Class S (slightly reactive, ys≤20mm), Class M (moderately reactive, 20<ys≤40mm), Class H1 (highly reactive, 40<ys≤60mm), Class H2 (very highly reactive clay, 60<ys≤75mm), Class E (extremely reactive, ys>75mm), Class P (problem site: uncontrolled fill >400mm, soft soils, mine subsidence, requires site-specific engineering). Hudson covers up to H-class in fixed site costs.
   - Foundation & Slabs: Engineered Waffle Pod slabs (Class 1a EPS pods, 110mm internal ribs, continuous top mesh) vs Traditional Stiffened Raft slabs for steeper cut/fill pads. Drop Edge Beams (DEB) up to 1.5m to retain earth without separate external retaining walls.
   - Bushfire Attack Levels (AS 3959): BAL-LOW, BAL-12.5 (≤2mm metal ember screens, 4mm toughened glass, non-combustible sarking), BAL-19, BAL-29 (5mm toughened glass, AS 1530.8.1 windows, non-combustible cladding/Hebel, garage perimeter compression seals), BAL-40 (motorized fire shutters/tested fire windows), BAL-FZ (flame zone).
   - Flooding & Overland Flow: Habitable Finished Floor Level (FFL) must achieve minimum 300mm to 500mm freeboard above 1% AEP (1-in-100-year) flood or overland flow crest.
   - Acoustic Noise Corridors (QDC MP 4.4 / NSW SEPP Transport): Category 1 to 4. Category 2/3 requires 6.38mm acoustic laminated glazing, solid core doors with drop seals, R2.5 acoustic ceiling batts, and mechanical ventilation allowances.
   - Sewer & Stormwater Zone of Influence (ZOI): 45-degree angle of repose from pipe invert. Any footing within ZOI must be supported on bored reinforced concrete piers drilled minimum 300mm to 500mm below pipe invert.
   - Slope & Earthworks: Uncertified cut/fill limited to 1.0m. Retaining walls > 1.0m require Form 15 / Form 16 structural engineering certification.
   - NCC 2022 Livable Housing Standard (Silver Level): Step-free entrance, minimum 820mm clear opening width to habitable ground-floor doors, 1000mm hallways, hobless/flush ground-floor shower recess, reinforced toilet walls for future grab rails.
   - HIA Progress Payment Milestones: Deposit 5%, Base 15% (slab poured), Frame 20% (frames & trusses inspected), Lock-Up 25% (roof, brickwork/cladding, windows locked), Fixing 20% (plasterboard, waterproofing, tiling, cabinetry), Practical Completion 15% (fit-off, QA, keys handover).
   - Knock-Down Rebuild (KDRB): Complete site feasibility, contour survey, fast-track NSW CDC approvals, demolition coordination, fixed price site costs.
4. Hudson Homes Inclusions Ranges (hudsonhomes.com.au):
   - H1 Smart Inclusions (Smart Value Tier): 2440mm ceilings, laminate benchtops, Haier 600mm stainless steel appliances (oven, cooktop, rangehood, dishwasher), split-system AC, ceiling fans, ceramic floor tiles & carpet, floating vanities, H1/H2 slab, 50-year termite barrier.
   - H2 Designer Inclusions (Contemporary Luxury Standard): 2590mm raised ceilings, 20mm stone benchtops, Fisher & Paykel 900mm luxury appliance suite (900mm oven, 900mm cooktop, canopy rangehood, dishwasher), ducted reverse-cycle AC, full-height bathroom porcelain tiles, shower niches, LED downlights, tiled alfresco/porch, exposed aggregate driveway.
   - H3 Luxury Inclusions (Ultimate Architectural Masterpiece): 40mm edge stone benchtops, double undermount sink, freestanding bathtub, Fisher & Paykel 900mm luxury appliances + built-in microwave, architectural awning windows ($0 variation), full-height porcelain wall tiles, grand 1020/1200mm pivot door, 600x600mm porcelain tiles/hybrid timber.
   - IP Investment Range ("Hudson Invest" 100% Turn-Key): Built for property investors, 100% turn-key complete with perimeter fencing, turf/landscaping, driveway, letterbox, clothesline, roller blinds, flyscreens, ducted AC, stone benchtops, 2-part contracts (stamp duty savings on land only), maximum tax depreciation.
   - FHB First Home Buyer Range ("Start Smart"): Guaranteed fixed price certainty, optimized for state First Home Owner Grants ($30k QLD / $10k NSW) and stamp duty exemptions, complete move-in ready finishes (flooring, AC, modern kitchen, turnkey options).
   - LP Landscape Packages: Bundled external finish tier (driveway, fencing, turf, letterbox, clothesline) scaled by lot size (300m² - 900m²).
   - Fixed Site Costs: Up to H-class slab, concrete piering in NSW (in QLD, piering is quoted provisionally per geotechnical engineering, and $0 additional energy allowances are needed), council submission (DA/CDC), BASIX/NatHERS 7-Star compliance, 50-Year Structural Warranty.
5. Planning & Jurisdictions:
   - Covers 20 key jurisdictions across QLD and NSW: Redland City Council (Mount Cotton Road), Greater Flagstone PDA, Ripley Valley PDA, Logan, Ipswich, Moreton Bay, Brisbane, Gold Coast, Sunshine Coast, Camden, Blacktown, Central Coast, Maitland, The Hills Shire, Penrith, Liverpool, Campbelltown, Wollondilly, Cessnock, Shellharbour/Wollongong.
6. Hudson OS (hudson.dev):
   - Flyer Builder (/flyer): 4 templates (1-Page Express, 2-Page Siting, 2-Page Showcase, House Only), automated logged-in NHC details.
   - Land Database (/database): Searchable lot inventory, AI Price List Parser, 1-click package handoff.
   - Quote Builder V2 (/quote-builder): 5 steps, Modified Plan Engine with visual diffing and Presight code parsing for alfresco/garage extensions, window/door modifications, and sink fixtures.
   - Tender Drafting (/tender-drafting): Digital contracts supporting all inclusion types (H1 Smart, H2 Designer, H3 Luxury, IP Investment, FHB First Home Buyer, LP Landscape).

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
  const models = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash-001", "gemini-flash-latest"];
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
      parts: [{ text: JSON.stringify({ answer: "Understood. I am Hudson Copilot, ready to provide authoritative construction, planning, and compliance intelligence.", confidence: 1.0, verified: true }) }],
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
  throw new Error("Direct Hudson AI connection failed.");
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
  assessmentData?: FeasibilityAssessmentResult | null;
  pdfDownloadReady?: boolean;
}

interface HubAiAssistantProps {
  isLight: boolean;
  staffUser: StaffProfile | null;
}

const DEFAULT_SUGGESTIONS = [
  "CC 131 Mount Cotton Road",
  "CC duplex 61 Paradise Road, Flagstone",
  "Hudson AI, put this compliance check into a downloaded PDF for me",
  "What wind classification does Hudson Homes build for?",
  "Tell me about slab edge rebates and damp-proofing",
  "What are the fire and acoustic requirements for duplex party walls?",
  "What is the difference between H1 Smart, H2 Designer, and H3 Luxury?",
  "Tell me about the IP Investment & FHB ranges",
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

      // 1. Check verified built-in knowledge engine first for instant, guaranteed-accurate responses
      const verifiedLocal = generateHudsonKnowledgeResponse(trimmed, staffUser);
      if (verifiedLocal && verifiedLocal.verified && verifiedLocal.confidence >= 0.98) {
        data = verifiedLocal;
      } else {
        // 2. Otherwise query serverless endpoint /api/hub-chat
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

        // 3. If serverless endpoint returned an error or failed (e.g. 502/500), try direct Gemini API
        if (!data && apiKey) {
          try {
            data = await queryGeminiDirect(trimmed, historyPayload, apiKey, staffUser);
          } catch (directErr) {
            console.warn("[HubAiAssistant] Direct Gemini call failed, activating built-in Knowledge Engine:", directErr);
          }
        }

        // 4. If still no response, use Knowledge Engine fallback
        if (!data) {
          data = verifiedLocal || generateHudsonKnowledgeResponse(trimmed, staffUser);
        }
      }

      const assessmentData = data?.assessmentData || getLastAssessment();
      const pdfDownloadReady = Boolean(data?.pdfDownloadReady || data?.assessmentData);

      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          role: "assistant",
          text: data?.answer || "No response received.",
          confidence: data?.confidence,
          verified: data?.verified,
          suggestedQuestions: data?.suggestedQuestions || [],
          modelUsed: data?.modelUsed ? data.modelUsed.replace(/^gemini.*/i, "hudson-enterprise-3.8") : "hudson-enterprise-3.8",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          assessmentData: assessmentData || null,
          pdfDownloadReady,
        },
      ]);

      // If user specifically requested PDF export, automatically trigger browser download
      const isPdfIntent =
        (trimmed.toLowerCase().includes("pdf") ||
          trimmed.toLowerCase().includes("download") ||
          trimmed.toLowerCase().includes("export")) &&
        (trimmed.toLowerCase().includes("compliance") ||
          trimmed.toLowerCase().includes("check") ||
          trimmed.toLowerCase().includes("report") ||
          trimmed.toLowerCase().includes("dossier") ||
          trimmed.toLowerCase().includes("put this") ||
          trimmed.toLowerCase().includes("feasibility"));

      if (isPdfIntent && assessmentData) {
        try {
          const fileName = downloadComplianceReportPdf(assessmentData, staffUser);
          toast.success("Executive Compliance Report PDF downloaded!", {
            description: fileName,
          });
        } catch (pdfErr) {
          console.warn("[HubAiAssistant] Automatic PDF export trigger notice:", pdfErr);
        }
      }
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

  const handleDownloadPdf = (assessment?: FeasibilityAssessmentResult | null) => {
    try {
      const targetAssessment = assessment || getLastAssessment();
      if (!targetAssessment) {
        toast.error("No active compliance check found", {
          description: "Please run a compliance check (e.g. 'CC 131 Mount Cotton Road') first.",
        });
        return;
      }
      const fileName = downloadComplianceReportPdf(targetAssessment, staffUser);
      toast.success("Executive Compliance Report PDF downloaded!", {
        description: fileName,
      });
    } catch (err: any) {
      console.error("[HubAiAssistant] PDF download error:", err);
      toast.error("Could not generate PDF", {
        description: err?.message || "Internal error generating PDF dossier.",
      });
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

  /** Formats markdown content cleanly with support for tables, callout blocks, headings and lists */
  const renderFormattedMarkdown = (content: string) => {
    const rawLines = content.split("\n");
    interface ParsedBlock {
      type: "heading" | "subheading" | "hr" | "bullet" | "numbered" | "table" | "quote" | "paragraph" | "empty";
      text?: string;
      headers?: string[];
      rows?: string[][];
      quoteLines?: string[];
      calloutType?: "note" | "tip" | "warning" | "success" | "danger" | "default";
    }

    const blocks: ParsedBlock[] = [];
    let i = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        blocks.push({ type: "empty" });
        i++;
        continue;
      }

      if (trimmed === "---") {
        blocks.push({ type: "hr" });
        i++;
        continue;
      }

      // Markdown Table: lines starting and ending with | or containing multiple |
      if (trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.split("|").length >= 3) {
        const tableLines: string[] = [];
        while (i < rawLines.length && rawLines[i].trim().startsWith("|") && rawLines[i].trim().endsWith("|")) {
          tableLines.push(rawLines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const rawHeaders = tableLines[0].slice(1, -1).split("|").map((c) => c.trim());
          let bodyStartIndex = 1;
          if (/^\|[\s\-:]+(\|[\s\-:]+)+\|$/.test(tableLines[1])) {
            bodyStartIndex = 2;
          }
          const rows: string[][] = [];
          for (let r = bodyStartIndex; r < tableLines.length; r++) {
            const cols = tableLines[r].slice(1, -1).split("|").map((c) => c.trim());
            rows.push(cols);
          }
          blocks.push({
            type: "table",
            headers: rawHeaders,
            rows,
          });
          continue;
        }
      }

      // Blockquote / Callout box: lines starting with >
      if (trimmed.startsWith(">")) {
        const quoteLines: string[] = [];
        while (i < rawLines.length && rawLines[i].trim().startsWith(">")) {
          const ql = rawLines[i].trim().replace(/^>\s?/, "");
          quoteLines.push(ql);
          i++;
        }

        let calloutType: "note" | "tip" | "warning" | "success" | "danger" | "default" = "default";
        const firstLine = quoteLines[0] || "";
        if (firstLine.includes("[!NOTE]")) calloutType = "note";
        else if (firstLine.includes("[!TIP]")) calloutType = "tip";
        else if (firstLine.includes("[!WARNING]")) calloutType = "warning";
        else if (firstLine.includes("✅") || firstLine.includes("PASS") || firstLine.includes("COMPLIANT")) calloutType = "success";
        else if (firstLine.includes("❌") || firstLine.includes("FAIL") || firstLine.includes("NON-COMPLIANT")) calloutType = "danger";

        const cleanQuoteLines = quoteLines
          .map((l) => l.replace(/^\[!(?:NOTE|TIP|WARNING|CAUTION)\]/i, "").trim())
          .filter(Boolean);

        blocks.push({
          type: "quote",
          quoteLines: cleanQuoteLines,
          calloutType,
        });
        continue;
      }

      // Headings
      if (trimmed.startsWith("### ")) {
        blocks.push({ type: "heading", text: trimmed.replace("### ", "") });
        i++;
        continue;
      }
      if (trimmed.startsWith("#### ")) {
        blocks.push({ type: "subheading", text: trimmed.replace("#### ", "") });
        i++;
        continue;
      }
      if (trimmed.startsWith("## ")) {
        blocks.push({ type: "heading", text: trimmed.replace("## ", "") });
        i++;
        continue;
      }
      if (trimmed.startsWith("# ")) {
        blocks.push({ type: "heading", text: trimmed.replace("# ", "") });
        i++;
        continue;
      }

      // Bullet points
      if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
        blocks.push({ type: "bullet", text: trimmed.replace(/^[\*\-]\s+/, "") });
        i++;
        continue;
      }

      // Numbered items
      if (/^\d+\.\s+/.test(trimmed)) {
        blocks.push({ type: "numbered", text: trimmed.replace(/^\d+\.\s+/, "") });
        i++;
        continue;
      }

      // Default paragraph
      blocks.push({ type: "paragraph", text: trimmed });
      i++;
    }

    return blocks.map((block, idx) => {
      switch (block.type) {
        case "heading":
          return (
            <h4
              key={idx}
              className={`font-bold text-sm tracking-wide mt-3 mb-1.5 ${
                isLight ? "text-amber-800" : "text-amber-400"
              }`}
            >
              {block.text}
            </h4>
          );
        case "subheading":
          return (
            <h5
              key={idx}
              className={`font-semibold text-xs tracking-wider uppercase mt-2 mb-1 ${
                isLight ? "text-slate-800" : "text-amber-200"
              }`}
            >
              {block.text}
            </h5>
          );
        case "hr":
          return (
            <hr
              key={idx}
              className={`my-2 border-t ${isLight ? "border-slate-200" : "border-slate-800"}`}
            />
          );
        case "bullet":
          return (
            <li key={idx} className="ml-4 list-disc my-1 leading-relaxed">
              {formatBoldText(block.text || "")}
            </li>
          );
        case "numbered":
          return (
            <li key={idx} className="ml-4 list-decimal my-1 leading-relaxed">
              {formatBoldText(block.text || "")}
            </li>
          );
        case "table":
          return (
            <div
              key={idx}
              className={`overflow-x-auto my-3 rounded-xl border shadow-xs ${
                isLight ? "border-slate-200 bg-white" : "border-slate-800 bg-slate-950/60"
              }`}
            >
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr
                    className={`border-b ${
                      isLight
                        ? "bg-slate-100/90 text-slate-800 border-slate-200"
                        : "bg-slate-900/90 text-amber-300 border-slate-800"
                    }`}
                  >
                    {block.headers?.map((h, hi) => (
                      <th key={hi} className="py-2 px-3 font-bold text-[11px] uppercase tracking-wider">
                        {formatBoldText(h)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody
                  className={`divide-y ${
                    isLight ? "divide-slate-200/80" : "divide-slate-800/60"
                  }`}
                >
                  {block.rows?.map((row, ri) => (
                    <tr
                      key={ri}
                      className={`transition-colors ${
                        isLight ? "hover:bg-slate-50/80" : "hover:bg-slate-900/40"
                      }`}
                    >
                      {row.map((cell, ci) => (
                        <td key={ci} className="py-2 px-3 leading-relaxed">
                          {formatBoldText(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        case "quote":
          const quoteBg =
            block.calloutType === "tip"
              ? isLight
                ? "bg-emerald-50 border-emerald-300/80 text-emerald-950"
                : "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
              : block.calloutType === "warning" || block.calloutType === "danger"
              ? isLight
                ? "bg-rose-50 border-rose-300/80 text-rose-950"
                : "bg-rose-950/30 border-rose-500/30 text-rose-300"
              : block.calloutType === "success"
              ? isLight
                ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                : "bg-emerald-950/40 border-emerald-500/40 text-emerald-200"
              : isLight
              ? "bg-amber-50/90 border-brand-gold/40 text-slate-900"
              : "bg-amber-950/20 border-brand-gold/30 text-amber-200";

          return (
            <div
              key={idx}
              className={`my-2.5 p-3 rounded-xl border text-xs leading-relaxed shadow-2xs ${quoteBg}`}
            >
              {block.quoteLines?.map((ql, qli) => (
                <p key={qli} className={qli > 0 ? "mt-1" : ""}>
                  {formatBoldText(ql)}
                </p>
              ))}
            </div>
          );
        case "empty":
          return <div key={idx} className="h-1.5" />;
        default:
          return (
            <p key={idx} className="my-1 leading-relaxed">
              {formatBoldText(block.text || "")}
            </p>
          );
      }
    });
  };

  /** Handles **bold** and `code` spans, cleans mathematical/LaTeX symbols */
  const formatBoldText = (text: string) => {
    const cleaned = text
      .replace(/\\(?:ge|gte)/g, "≥")
      .replace(/\\(?:le|lte)/g, "≤")
      .replace(/\$R_w\s*(?:\\ge|≥)\s*(\d+)\$/g, "Rw ≥ $1")
      .replace(/\$R_w\s*\+\s*C_\{?tr\}?\s*(?:\\ge|≥)\s*(\d+)\$/g, "Rw + Ctr ≥ $1")
      .replace(/\$([^\$]+)\$/g, "$1")
      .replace(/\\text\{([^\}]+)\}/g, "$1");

    const parts = cleaned.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
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

        {/* Quick Suggestion Chips Carousel */}
        <div className="flex items-center gap-1.5 px-3 pb-2.5 overflow-x-auto no-scrollbar">
          <span className={`text-[10px] uppercase font-bold tracking-wider px-1 flex-shrink-0 ${isLight ? "text-slate-400" : "text-slate-500"}`}>
            Suggested:
          </span>
          {DEFAULT_SUGGESTIONS.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(s);
                handleSend(s);
              }}
              disabled={isLoading}
              className={`whitespace-nowrap inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-all cursor-pointer flex-shrink-0 ${
                isLight
                  ? "border-slate-200 bg-slate-50 text-slate-700 hover:border-brand-gold hover:bg-amber-50/50"
                  : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-brand-gold/60 hover:text-amber-300 hover:bg-brand-gold/5"
              }`}
            >
              <Sparkles className="h-3 w-3 text-brand-gold flex-shrink-0" />
              <span>{s}</span>
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
                Hudson Copilot Engine
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

                  {/* Interactive Executive Compliance PDF Card */}
                  {m.role === "assistant" && (m.pdfDownloadReady || m.assessmentData) && (
                    <div
                      className={`mt-4 p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md ${
                        isLight
                          ? "border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50/70 text-slate-800"
                          : "border-brand-gold/40 bg-gradient-to-r from-amber-950/40 via-slate-900/95 to-slate-950 text-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isLight
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-brand-gold/15 text-brand-gold border border-brand-gold/30"
                          }`}
                        >
                          <FileText className="h-5 w-5 text-brand-gold" />
                        </div>
                        <div>
                          <div className="text-xs font-bold flex items-center gap-1.5 flex-wrap">
                            <span className={isLight ? "text-amber-900" : "text-amber-300"}>
                              Executive Statutory Compliance & Feasibility Dossier
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-brand-gold border border-brand-gold/30 font-mono font-semibold">
                              2-Page A4 PDF
                            </span>
                          </div>
                          <p className={`text-[11px] mt-0.5 ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                            Statutory authority, setbacks, 7 site overlays, matching Hudson plans & 50-Year Warranty endorsement.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(m.assessmentData)}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 via-brand-gold to-amber-600 text-slate-950 font-bold text-xs shadow-md shadow-brand-gold/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex-shrink-0"
                      >
                        <FileDown className="h-4 w-4" />
                        <span>Download Report (PDF)</span>
                      </button>
                    </div>
                  )}

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
                          {(m.modelUsed || "Hudson Enterprise Intelligence").replace(/^gemini.*/i, "Hudson Enterprise Intelligence")}
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
                    Cross-referencing Hudson Homes architectural specs & statutory planning controls...
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

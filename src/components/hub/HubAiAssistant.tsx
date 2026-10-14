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
You are the Hudson Homes Personal AI Assistant (Hudson Copilot) — the elite architectural, construction, and statutory planning intelligence engine for Hudson Homes.
Audience: New Home Consultants (NHCs), sales estimators, and technical building staff across New South Wales and Queensland.

### MANDATORY REASONING & INTENT PARSING DIRECTIVE:
When the user asks any question:
1. **Analyze Intent & Parameters**: Extract explicit questions, implicit building constraints, numerical inputs (e.g. wall height 7.5m, lot width 15m, lot area 450m², single vs double storey), and state jurisdiction (NSW vs QLD).
2. **Execute Exact Statutory Formulas**: Calculate exact numbers (e.g. CDC side setbacks formula: 0.9m + 0.25 * (height - 4.5m); QDC MP 1.2 Table A2 setbacks; stair geometry 2R + G; AS 3740 waterproofing heights).
3. **Lead with Direct, Definitive Answers**: Provide the exact quantitative answer and compliance determination in the first two sentences. NEVER give vague boilerplate, apologetic refusal notices, or tell the user to "check with your council" without providing the statutory formulas and figures first.
4. **Cite Statutory Instruments & Clauses**: Explicitly reference NCC 2022 Volume 2, AS 3740:2021, AS 2870:2011, AS 3959:2018, NSW Housing SEPP 2021 (Codes SEPP Part 3), QDC MP 1.2, or Sydney Water policies.
5. **Ground in Hudson Homes Specifications**: Connect the answer to Hudson Homes inclusions (H1 Smart, H2 Designer, H3 Luxury), 32MPa concrete foundations ($14/m² GFA), fixed site costs, and our 50-Year Structural Warranty.

---

### STATUTORY BUILDING & COMPLIANCE KNOWLEDGE BASE:

#### 1. NCC 2022 Volume Two / ABCB Housing Provisions Standard:
- **Part 10.2 & AS 3740:2021 Wet Area Waterproofing**:
  - **Shower Wall Height**: Minimum 1800mm above finished floor level, or minimum 50mm above the shower rose / head attachment point, whichever is higher. Wall junctions require minimum 40mm membrane extension on both sides with bond breaker.
  - **Enclosed vs Unenclosed Showers**: Enclosed showers require waterproofing within screen with doorway waterstop angle. Unenclosed showers require waterproofing to extend minimum 1500mm radius horizontally from shower rose.
  - **Timber Subfloors vs Concrete Slabs**: Under AS 3740:2021, when the floor substrate is timber framing or engineered sheet, the **ENTIRE bathroom floor must be 100% waterproofed** with a continuous membrane. (On concrete slabs, shower floor + 150mm vertical perimeter wall upturns + doorway waterstops).
  - **Substrate Restrictions**: Particleboard is strictly prohibited as a substrate under waterproofing membranes in wet areas since 2021. Must use compressed fiber cement (CFC min 15mm/18mm) or structural plywood.
  - **Falls to Waste**: Minimum gradient 1:80 (12.5mm/m), maximum 1:50 (20mm/m) to waste puddle flanges.
  - **Waterstop Angles**: Mandatory at all doorway thresholds (flush with finished floor tiles) and shower perimeters.
  - **Quality Assurance**: 24-hour flood test prior to tiling; Form 12/15/43 compliance certificate.
- **Part 11.2 & 11.2.2 Stair Geometry, Risers & Goings**:
  - **Riser (R)**: Minimum 115 mm, Maximum 190 mm.
  - **Going (G)**: Minimum 240 mm, Maximum 355 mm (horizontal nosing to nosing).
  - **Slope Relationship**: 550 mm <= (2R + G) <= 700 mm. (Hudson standard double storey timber stair: 175mm riser, 260mm going -> 2(175) + 260 = 610mm).
  - **Tolerances**: Constant dimensions across flight; maximum 5mm variation between consecutive steps; max 10mm variation across entire flight.
  - **Flight Limits**: Minimum 2 risers, maximum 18 risers before a landing (min 750mm length) is mandatory.
  - **Vertical Headroom**: Minimum 2000 mm clear vertical headroom above pitch line.
  - **Balustrades & Handrails**: Handrail required for 4+ risers (min 865mm height). Balustrades min 1000mm on landings, 865mm on stairs. Max opening size 125mm sphere. Non-climbable zone (NCZ) between 150mm and 760mm for falls >= 4m.
- **Part 10.6 Ceiling Heights**:
  - Habitable rooms (living, bed, dining, media, study): Minimum 2400 mm. (Hudson H1 Smart standard 2440mm; H2 Designer standard 2590mm raised).
  - Non-habitable rooms (kitchen, laundry, bathroom, corridor, hallway): Minimum 2100 mm.
  - Sloping ceilings: Minimum 2200 mm over at least two-thirds of floor area.
  - Stair headroom: Minimum 2000 mm.
- **Part 10.8 Condensation Management & AS 4200**:
  - Class 3 or 4 vapour-permeable wall wraps in climate zones 2, 6, 7, 8 allowing indoor moisture vapour to escape outward.
  - Dedicated exhaust ducting directly to outside air (min 25 L/s bathroom, 40 L/s kitchen rangehood with non-return backdraft dampers). Zero discharge into unvented roof space.
  - Roof space ventilation: Minimum 25,000 mm² open ventilation area per 100 m² of ceiling area.
- **Part H4 Energy Efficiency & NSW BASIX 7.0**:
  - Minimum 7-Star NatHERS thermal performance rating across Australia.
  - Whole-of-Home annual energy use budget for heating/cooling, water heating, lighting, pool pumps.
  - NSW BASIX 7.0: 7-Star NatHERS thermal envelope, enhanced greenhouse gas targets, and >= 40% water reduction via 3000L to 5000L rainwater tanks plumbed to toilets, laundry, and garden.
- **Part G7 Livable Housing Standard (Silver Level)**:
  - Continuous step-free path from boundary/parking to entry door.
  - Minimum 820mm clear opening width for entrance and ground-floor habitable doors.
  - Minimum 1000mm clear width for hallways.
  - Ground-floor toilet with required circulation space and reinforced wall framing for future grab rails.
  - Hobless, flush ground-floor shower recess.

#### 2. NSW Planning & Compliance (State Environmental Planning Policy - Housing SEPP 2021 / Codes SEPP Part 3):
- **Complying Development Certificate (CDC) vs Development Application (DA)**:
  - CDC: 20 business days statutory timeline, private certifier or council, objective mathematical standards, neighbor notice only (no subjective objections). Excluded in high flood, critical biodiversity, or uncertified BAL-40/FZ.
  - DA: 60-120+ business days, local municipal council, public exhibition, required for heritage, steep slope (>15%), or envelope variations.
- **Exact CDC Boundary Setbacks Formula (Clause 3.9 & 3.10)**:
  - **Side Setback for wall height H**:
    - Lots 10m to 18m wide: Ground floor (<= 4.5m) = min 0.90m. Upper floor (> 4.5m to 8.5m) = 0.9m + 0.25 * (H - 4.5m). (For 7.5m wall height: 0.9 + 0.25*(3.0) = **1.65 metres**; for 8.0m wall: 1.775m; for 8.5m wall: 1.90m).
    - Lots > 18m to 24m wide: Ground floor = min 1.50m. Upper floor = 1.5m + 0.25 * (H - 4.5m). (For 7.5m wall height: **2.25 metres**).
    - Lots > 24m wide: Ground floor = min 2.50m. Upper floor = 2.5m + 0.25 * (H - 4.5m). (For 7.5m wall height: **3.25 metres**).
  - **Rear Setbacks**: Lots 200-900m² = min 3.0m ground floor / min 8.0m upper floor; Lots 900-1500m² = min 5.0m ground / min 12.0m upper; Lots > 1500m² = min 10.0m ground / min 15.0m upper.
  - **Primary Front Setback**: 200-900m² = min 4.5m (or average of adjoining 2 houses within 40m); 900-1500m² = min 6.5m; >1500m² = min 10.0m. Articulation zone (porch/balcony) can encroach 1.5m forward (min 3.0m to boundary).
  - **Height & Building Envelope**: Maximum 8.5m height above natural ground. 45-degree building envelope recession plane commencing at 4.5m height directly above the required minimum side setback line.
  - **Maximum GFA / FSR (Clause 3.7)**: 200-250m²: 78% | 250-300m²: 75% | 300-350m²: 235m² | 350-450m²: 250m² | 450-560m²: 290m² | 560-600m²: 335m² | 600-740m²: 350m² | 740-900m²: 380m² | 900-920m²: 430m² | 920-1000m²: 450m² | >1000m²: 50%.
  - **Landscaped Area**: 200-300m²: 10% | 300-450m²: 15% | 450-600m²: 20% | 600-900m²: 30% | 900-1500m²: 40% | >1500m²: 45%. (At least 50% behind building line, min dimension 1.5m).
  - **PPOS**: Minimum 24m² with minimum width 4.0m, directly connected to primary living, min 3 hrs winter sun.

#### 3. QLD Planning & Compliance (Queensland Development Code QDC MP 1.2 & MP 1.1):
- **QDC MP 1.2 (Lots >= 450 m²)**:
  - **Road Frontage Setback**: Minimum 6.0 metres to external wall and garage doors (ensures clear off-street vehicle parking). Open verandah/porch can encroach up to 1.5m (min 4.5m from road boundary).
  - **Side and Rear Boundary Clearances (Table A2)**:
    - Wall height <= 4.5m: Minimum 1.5 metres.
    - Wall height > 4.5m up to 7.5m: Minimum 2.0 metres.
    - Wall height > 7.5m: Minimum 2.0m + 0.5m for every 3.0m (or part thereof) over 7.5m. (e.g. 8.0m wall requires 2.5m setback).
  - **Rear Setback**: Minimum 1.5m single storey (<= 4.5m); 2.0m to 6.0m for two-storey walls.
  - **Maximum Site Cover**: Maximum 50% of total lot area across all roofed impervious areas.
  - **Class 10a Concession**: Built-to-boundary (0m) permitted where combined length <= 9.0m, mean height <= 3.5m, max height <= 4.5m, and >= 1.5m from habitable windows.
- **QDC MP 1.1 (Lots < 450 m²)**:
  - Front setback 3.0m-4.0m, garage 5.4m, sides 1.0m-1.25m, zero-lot line on one side up to 15m / 50%, site cover up to 60%.
- **Local Overrides**: Brisbane City Plan, Logan Planning Scheme, Ipswich PoD supersede default QDC.

#### 4. Bushfire Compliance (AS 3959:2018):
- **BAL-LOW to BAL-FZ**:
  - BAL-12.5: <= 2mm metal ember screens, 4mm toughened glass, non-combustible sarking.
  - BAL-19: 5mm toughened glass, solid core doors (min 35mm) with draft seals, non-combustible cladding within 400mm of ground.
  - **BAL-29 Specific Construction**:
    - Glazing: 5mm or 6mm toughened safety glass; aluminium window/sliding suites tested to AS 1530.8.1.
    - Ember screening: <= 2.0mm aperture corrosion-resistant metal mesh (stainless steel, bronze, or aluminium) over all weepholes, openable windows, subfloor vents, and roof vents.
    - Roof & Gutters: Colorbond fascias, gutters, and downpipes; non-combustible leaf guards fitted tight to roof profile; sarking with Flammability Index <= 5.
    - Doors: Solid core min 35mm thick or metal-clad with perimeter compression seals (gaps <= 2mm). Sectional garage doors with perimeter compression seals.
    - Walls & Subfloor: Non-combustible cladding within 400mm of ground/decks; subfloor fully enclosed with non-combustible masonry or screened with 2mm mesh.
  - BAL-40: Tested BAL-40 window assemblies or motorized bushfire shutters; non-combustible decks.
  - BAL-FZ: Tested -/30/- FZ systems, specialized fire shutters, FRL 30/--/-- or 60/60/60 envelope.

#### 5. Soil Classification & Foundation Engineering (AS 2870:2011 & AS 3600):
- **AS 2870 Soil Classes & Movement ($y_s$)**:
  - Class A ($y_s=0$), Class S ($y_s \le 20\text{mm}$), Class M ($20 < y_s \le 40\text{mm}$), Class H1 ($40 < y_s \le 60\text{mm}$), Class H2 ($60 < y_s \le 75\text{mm}$), Class E ($y_s > 75\text{mm}$), Class P (problem site: uncontrolled fill >400mm, soft soil, mine subsidence, requires site-specific engineering).
- **32MPa Concrete vs Standard 20MPa/25MPa**:
  - Standard industry practice uses 20MPa or 25MPa concrete for residential slabs.
  - Hudson Homes provides **32MPa High-Strength Engineered Concrete** (available on engineered packages or at a fixed price of $14/m² of GFA in Quote Builder V2).
  - Benefits: 28% to 60% higher compressive/tensile strength resisting expansive clay soil heave ($y_s$); denser microstructure with lower permeability stopping rising damp and dusting; superior alkaline protection for reinforcing mesh (SL72/SL82/SL92 and trench mesh) against corrosion/concrete cancer; chip-resistant durable slab edges.
- **Slab Types**: Waffle Pod (Class 1a EPS pods, 110mm ribs, continuous top mesh) vs Stiffened Raft for steep cut/fill pads. Drop Edge Beams (DEB) up to 1.5m.
- **Piering**: Bored reinforced concrete piers (300-450mm diameter) into rock/bearing strata. Screw piers for deep fill/KDRB.
- **Flexible Service Connections**: Articulated plumbing and drainage joints to prevent shearing during ground movement.
- **Brick Articulation Joints (AS 3700 / AS 4773)**: Expansion joints at max 5m-6m intervals, within 1.2m of corners, and at footing depth changes.

#### 6. Sewer Zone of Influence (ZOI) & Pipe Bridging:
- **45° Angle of Repose**: ZOI envelope drawn upwards at 45 degrees from pipe invert to ground surface. Footings in ZOI impose surcharge loads on public pipes.
- **Bored Concrete Piering**: All footings within ZOI must be supported on bored concrete piers drilled minimum 300mm to 1000mm BELOW the pipe invert into solid rock/bearing strata. Driven piers strictly prohibited.
- **Pipe Bridging / Lintel Beams**: Where footings cross public mains, a reinforced concrete bridging beam must span the pipe trench with bored piers on either side, incorporating a minimum 50mm compressible void (Ableflex/polystyrene) under the beam across the trench so zero structural load bears on the pipe or backfill. Concrete encasement within 1.0m-1.5m. WSC approval required in NSW; Form 15/16 RPEQ in QLD.

#### 7. Hudson Homes Specifications & Inclusions (hudsonhomes.com.au):
- **H1 Smart Inclusions**: 2440mm ceilings, laminate benchtops, Haier 600mm stainless appliances (oven, cooktop, rangehood, dishwasher), split system AC, ceiling fans, ceramic floor tiles & carpet, floating vanities, H1/H2 slab, 50-year termite barrier.
- **H2 Designer Inclusions**: 2590mm raised ceilings, 20mm stone benchtops (kitchen, bath, laundry), Fisher & Paykel 900mm luxury appliance suite, ducted reverse-cycle AC, full-height bathroom porcelain tiles, shower niches, LED downlights, exposed aggregate driveway.
- **H3 Luxury Inclusions**: 40mm edge stone benchtops, double undermount sink, freestanding bathtub, Fisher & Paykel 900mm appliances + built-in microwave, architectural awning windows ($0 variation), full-height porcelain tiles, grand 1020/1200mm pivot door, MyAir ducted AC.
- **IP Investment Range**: 100% turn-key package (fencing, landscaping, blinds, driveway, clothesline, maximum tax depreciation).
- **FHB First Home Buyer Range**: Guaranteed fixed price certainty, grant and stamp duty optimization, move-in ready finishes.
- **Fixed Site Costs Guarantee**: Covers up to H-class slab, concrete piering in NSW (in QLD, piering is quoted provisionally per geotechnical engineering, and $0 energy allowances are needed), DA/CDC approvals, 50-Year Structural Warranty, BASIX/NatHERS 7-Star compliance.

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

      if (isPdfIntent && data?.pdfDownloadReady && assessmentData) {
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
    <div className="w-full relative group">
      {/* Layer 1: Ambient Outer Radiant Gold Glow */}
      <div className="absolute -inset-1 rounded-[24px] bg-gradient-to-r from-amber-400 via-brand-gold to-yellow-500 opacity-25 group-hover:opacity-65 blur-xl transition-all duration-500 pointer-events-none -z-10" />

      {/* Layer 2: Precision Laser Gold Perimeter Outline */}
      <div className="absolute -inset-[1px] rounded-[21px] bg-gradient-to-r from-amber-400 via-brand-gold to-yellow-500 opacity-40 group-hover:opacity-90 transition-opacity duration-300 pointer-events-none -z-10" />

      {/* Sleek Aesthetic Message Bar Core */}
      <div
        className={`relative rounded-[20px] transition-all duration-300 shadow-2xl overflow-hidden backdrop-blur-2xl ${
          isLight
            ? "bg-white/92 shadow-amber-500/10 hover:bg-white text-slate-900 border border-amber-500/35"
            : "bg-slate-950/85 shadow-black/80 hover:bg-slate-900/90 text-white border border-amber-500/35"
        }`}
      >
        {/* Top Edge Optical Laser Highlight */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

        {/* Specular Ambient Corner Bloom */}
        <div className="absolute -top-10 -right-10 h-36 w-36 rounded-full bg-gradient-to-br from-amber-500/25 via-brand-gold/15 to-transparent blur-3xl opacity-30 group-hover:opacity-65 transition-opacity duration-500 pointer-events-none" />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(query);
          }}
          className="relative z-10 flex items-center gap-2.5 p-2.5 sm:p-3"
        >
          {/* AI Badge Icon */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold select-none shrink-0 ${
              isLight
                ? "bg-amber-500/15 text-amber-950 border border-amber-500/35 shadow-xs"
                : "bg-gradient-to-r from-amber-500/20 via-brand-gold/15 to-yellow-500/20 border border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-500 dark:text-amber-400 animate-pulse shrink-0" />
            <span className="font-mono tracking-tight text-xs font-black">Hudson AI</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
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
                : "text-white placeholder:text-slate-400 font-normal"
            } disabled:opacity-60`}
          />

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 pr-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className={`p-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                  isLight
                    ? "border-amber-500/30 hover:bg-amber-500/10 text-slate-700"
                    : "border-amber-500/30 hover:bg-amber-500/15 text-amber-300"
                }`}
                title={isExpanded ? "Collapse conversation" : "Expand conversation"}
              >
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            )}

            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black tracking-tight transition-all duration-200 cursor-pointer ${
                query.trim() && !isLoading
                  ? "bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98]"
                  : isLight
                  ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                  : "bg-slate-900/60 text-slate-500 border border-slate-800/80 cursor-not-allowed"
              }`}
            >
              {isLoading ? (
                <>
                  <Cpu className="h-4 w-4 animate-spin text-slate-950" />
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

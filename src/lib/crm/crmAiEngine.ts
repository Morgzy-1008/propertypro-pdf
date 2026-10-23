import { CrmLead, CrmTask, CrmTaskType, CrmCallRecord } from "./crmTypes";
import { getLocalLots, getLocalPackages, type Lot, type Pkg } from "@/lib/databaseStorage";
import { loadAllQuotes } from "@/lib/quoting/quoteStorage";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { formatAud } from "@/lib/pricing";

export interface LeadHeatAnalysis {
  score: number; // 0 - 100
  tier: "blazing" | "hot" | "warm" | "cooling";
  reasons: string[];
  isSpeedToLead: boolean;
  isStaleLead: boolean;
  daysSinceLastContact: number;
  hoursSinceCreated: number;
  nextRecommendedAction: string;
  nextActionType: "call" | "lvm_followup" | "mark_up" | "estimate" | "tender_submission";
}

export function calculateLeadHeatScore(lead: CrmLead): LeadHeatAnalysis {
  const now = Date.now();
  const createdMs = lead.createdAt ? new Date(lead.createdAt).getTime() : now - 86400000 * 5;
  const lastContactMs = lead.lastContactedAt
    ? new Date(lead.lastContactedAt).getTime()
    : createdMs;

  const hoursSinceCreated = Math.max(0, (now - createdMs) / (1000 * 3600));
  const daysSinceLastContact = Math.max(0, (now - lastContactMs) / (1000 * 3600 * 24));

  let score = 45;
  const reasons: string[] = [];

  // 1. VIP Pinning
  if (lead.isVipPinned) {
    score += 25;
    reasons.push("📌 VIP Pinned Priority");
  }

  // 2. Speed-to-Lead (<48h new inquiry)
  const isSpeedToLead =
    hoursSinceCreated <= 48 &&
    (lead.stage === "new_lead" || lead.stage === "walk_ins") &&
    (lead.lvmCount || 0) === 0;
  if (isSpeedToLead) {
    score += 24;
    reasons.push(`⚡ Speed-to-Lead (${Math.max(1, Math.round(hoursSinceCreated))}h ago)`);
  }

  // 3. Land Status
  if (lead.landStatus === "Have Land (Registered)") {
    score += 22;
    reasons.push("🏡 Registered Titled Land Ready");
  } else if (lead.landStatus === "Land Under Contract (Unregistered)") {
    score += 12;
    reasons.push("📝 Land Under Contract");
  } else if (lead.landStatus === "Knockdown Rebuild (KDRB)") {
    score += 15;
    reasons.push("🔨 KDRB Own Land");
  }

  // 4. Finance Status
  if (
    lead.financeStatus === "Pre-Approved" ||
    lead.financeStatus === "Cash Buyer" ||
    (lead.notes || "").toLowerCase().includes("pre-approv")
  ) {
    score += 14;
    reasons.push("💳 Finance Pre-Approved");
  }

  // 5. Pipeline Stage momentum
  if (lead.stage === "estimate_presented" || lead.stage === "tender_requested" || lead.stage === "tender_received") {
    score += 16;
    reasons.push("💰 Active Estimate / Tender Stage");
  } else if (lead.stage === "concept_plan" || lead.stage === "meeting_booked") {
    score += 12;
    reasons.push("📐 Active Concept / Siting Stage");
  } else if (lead.stage === "sale_not_proceeding" || lead.stage === "no_contact") {
    score -= 30;
  }

  // 6. Top TR Target boost
  if (lead.isTopTrTarget) {
    score += 10;
    reasons.push("🔥 Top TR Target");
  }

  // 7. Stale Lead detection (>7 days since last contact on active pipeline stage)
  const activePipelineStages = [
    "new_lead",
    "walk_ins",
    "meeting_booked",
    "concept_plan",
    "estimate_presented",
    "tender_requested",
    "tender_received",
  ];
  const isStaleLead =
    daysSinceLastContact >= 7 && activePipelineStages.includes(lead.stage);

  if (isStaleLead) {
    reasons.push(`⚠️ Stale (${Math.floor(daysSinceLastContact)}d no contact — Rescue Needed)`);
    score += 8; // Boost visibility so consultant rescues high-value lead
  }

  // 8. LVM cadence awareness
  if ((lead.lvmCount || 0) > 0) {
    reasons.push(`📞 LVM #${lead.lvmCount} Follow-Up`);
  }

  const clampedScore = Math.min(99, Math.max(15, Math.round(score)));
  const tier: LeadHeatAnalysis["tier"] =
    clampedScore >= 85
      ? "blazing"
      : clampedScore >= 70
      ? "hot"
      : clampedScore >= 52
      ? "warm"
      : "cooling";

  // Determine recommended next action
  let nextRecommendedAction = "Call client to qualify land & design";
  let nextActionType: LeadHeatAnalysis["nextActionType"] = "call";

  const openTasks = (lead.tasks || []).filter((t) => !t.completed);
  const hasMarkUpTask = openTasks.some((t) => t.type === "mark_up" || t.title.toLowerCase().includes("mark-up") || t.title.toLowerCase().includes("floorplan"));
  const hasEstimateTask = openTasks.some((t) => t.type === "estimate" || t.title.toLowerCase().includes("estimate") || t.title.toLowerCase().includes("quote"));

  if (isSpeedToLead) {
    nextRecommendedAction = "Speed-to-Lead First Call (<5 min SLA)";
    nextActionType = "call";
  } else if (hasMarkUpTask) {
    nextRecommendedAction = `Complete Floorplan Mark-Up (${lead.preferredDesign || "Design"})`;
    nextActionType = "mark_up";
  } else if (hasEstimateTask) {
    nextRecommendedAction = `Prepare Builders Estimate (${lead.targetEstate || "Site"})`;
    nextActionType = "estimate";
  } else if ((lead.lvmCount || 0) >= 1) {
    nextRecommendedAction = `LVM #${(lead.lvmCount || 0) + 1} Follow-Up Callback`;
    nextActionType = "lvm_followup";
  } else if (lead.stage === "concept_plan") {
    nextRecommendedAction = "Generate Itemised Builders Estimate in Quoting Tool";
    nextActionType = "estimate";
  } else if (lead.stage === "estimate_presented") {
    nextRecommendedAction = "Close for ATP Sign-Off & Submit Tender Request";
    nextActionType = "tender_submission";
  } else if (isStaleLead) {
    nextRecommendedAction = `Stale Lead Rescue Call (${Math.floor(daysSinceLastContact)}d since last touch)`;
    nextActionType = "call";
  }

  return {
    score: clampedScore,
    tier,
    reasons: reasons.slice(0, 4),
    isSpeedToLead,
    isStaleLead,
    daysSinceLastContact: Math.round(daysSinceLastContact * 10) / 10,
    hoursSinceCreated: Math.round(hoursSinceCreated),
    nextRecommendedAction,
    nextActionType,
  };
}

export interface AskHoneyQueryResult {
  query: string;
  filterDescriptor: string;
  answerMarkdown: string;
  matchedLeads: CrmLead[];
  matchedTasks: CrmTask[];
  totalPipelineValue: number;
  suggestedBulkSms: string;
  suggestedTaskTitle: string;
  suggestedTaskType: CrmTaskType;
}

/**
 * "Ask Honey AI" Natural Language Lead & Pipeline Query Agent.
 * Understands queries about Estates (e.g. "Flagstone"), Timeframes ("last month", "last 7 days", "today"),
 * Stages ("estimate", "concept", "mark-up", "new leads"), Call status ("LVM", "voicemail", "stale", "no contact"),
 * Land status ("registered land", "titled"), Budget ("over $500k"), and House Designs.
 */
export function runAskHoneyQuery(
  rawQuery: string,
  allLeads: CrmLead[],
  allTasks: CrmTask[] = []
): AskHoneyQueryResult {
  const q = rawQuery.trim();
  const lower = q.toLowerCase();
  const now = Date.now();

  const filterParts: string[] = [];

  // 1. Detect Estate / Suburb keywords
  const knownEstatesAndSuburbs = [
    "flagstone",
    "bahrs scrub",
    "spring mountain",
    "yarrabilba",
    "park ridge",
    "greenbank",
    "ripley",
    "morayfield",
    "burpengary",
    "caboolture",
    "caloundra",
    "palmview",
    "watagan park",
    "warnervale",
    "oran park",
    "box hill",
    "leppington",
    "austral",
    "thornton",
    "lochinvars",
    "maitland",
  ];
  const matchedEstateKeywords = knownEstatesAndSuburbs.filter((e) => lower.includes(e));
  if (matchedEstateKeywords.length > 0) {
    filterParts.push(
      `Estate/Suburb: ${matchedEstateKeywords.map((s) => s.toUpperCase()).join(", ")}`
    );
  }

  // 2. Detect Timeframe keywords ("last month", "30 days", "this week", "today", "24 hours")
  let maxAgeDays: number | null = null;
  if (
    lower.includes("last month") ||
    lower.includes("past month") ||
    lower.includes("30 days") ||
    lower.includes("this month")
  ) {
    maxAgeDays = 35;
    filterParts.push("Enquired in Last 30 Days");
  } else if (lower.includes("last week") || lower.includes("7 days") || lower.includes("this week")) {
    maxAgeDays = 7;
    filterParts.push("Enquired in Last 7 Days");
  } else if (lower.includes("today") || lower.includes("24 hours") || lower.includes("overnight")) {
    maxAgeDays = 2;
    filterParts.push("Last 24–48 Hours");
  }

  // 3. Detect Stale / No Contact
  const wantStale =
    lower.includes("stale") ||
    lower.includes("haven't called") ||
    lower.includes("no contact") ||
    lower.includes("not contacted") ||
    lower.includes("neglected") ||
    lower.includes("overdue");
  if (wantStale) {
    filterParts.push("Stale / Needs Follow-Up");
  }

  // 4. Detect LVM / Voicemail
  const wantLvm =
    lower.includes("lvm") ||
    lower.includes("voicemail") ||
    lower.includes("left message") ||
    lower.includes("callback");
  if (wantLvm) {
    filterParts.push("LVM (Left Voicemail) Queue");
  }

  // 5. Detect Hot Leads / Top TR
  const wantHot =
    lower.includes("hot") ||
    lower.includes("priority") ||
    lower.includes("best") ||
    lower.includes("top") ||
    lower.includes("ready to sign") ||
    lower.includes("tr ");
  if (wantHot) {
    filterParts.push("Hot Priority Leads");
  }

  // 6. Detect Registered / Titled Land
  const wantRegisteredLand =
    lower.includes("registered") ||
    lower.includes("titled") ||
    lower.includes("have land") ||
    lower.includes("own land");
  if (wantRegisteredLand) {
    filterParts.push("Registered / Titled Land");
  }

  // 7. Detect Mark-up / Floorplan or Estimate / Quote
  const wantMarkUp =
    lower.includes("mark up") ||
    lower.includes("markup") ||
    lower.includes("mark-up") ||
    lower.includes("floorplan") ||
    lower.includes("concept");
  const wantEstimate =
    lower.includes("estimate") || lower.includes("quote") || lower.includes("pricing");

  if (wantMarkUp) filterParts.push("Concept / Floorplan Mark-Up");
  if (wantEstimate) filterParts.push("Builders Estimate Stage/Task");

  // 8. Detect Unassigned Pool
  const wantUnassigned = lower.includes("unassigned") || lower.includes("inbound pool");
  if (wantUnassigned) filterParts.push("Unassigned Inbound Pool");

  // Filter leads
  let results = allLeads.filter((lead) => {
    const heat = calculateLeadHeatScore(lead);

    // Estate filter
    if (matchedEstateKeywords.length > 0) {
      const hay = `${lead.targetEstate} ${lead.suburb} ${lead.notes} ${(lead.ghlTags || []).join(" ")}`.toLowerCase();
      if (!matchedEstateKeywords.some((kw) => hay.includes(kw))) {
        return false;
      }
    }

    // Timeframe filter
    if (maxAgeDays !== null) {
      const createdMs = lead.createdAt ? new Date(lead.createdAt).getTime() : now;
      const ageDays = (now - createdMs) / 86400000;
      if (ageDays > maxAgeDays) return false;
    }

    // Stale filter
    if (wantStale && !heat.isStaleLead && heat.daysSinceLastContact < 5) {
      return false;
    }

    // LVM filter
    if (wantLvm) {
      const hasLvm =
        (lead.lvmCount || 0) > 0 ||
        (lead.notes || "").toLowerCase().includes("voicemail") ||
        (lead.notes || "").toLowerCase().includes("lvm") ||
        (lead.tasks || []).some((t) => t.type === "lvm_followup" || t.title.toLowerCase().includes("lvm"));
      if (!hasLvm) return false;
    }

    // Registered land filter
    if (wantRegisteredLand && lead.landStatus !== "Have Land (Registered)") {
      return false;
    }

    // Mark-up filter
    if (wantMarkUp && !wantEstimate) {
      const inMarkup =
        lead.stage === "concept_plan" ||
        (lead.tasks || []).some((t) => t.type === "mark_up" || t.title.toLowerCase().includes("mark-up") || t.title.toLowerCase().includes("floorplan")) ||
        (lead.notes || "").toLowerCase().includes("mark-up") ||
        (lead.notes || "").toLowerCase().includes("floorplan");
      if (!inMarkup) return false;
    }

    // Estimate filter
    if (wantEstimate && !wantMarkUp) {
      const inEst =
        lead.stage === "estimate_presented" ||
        Boolean(lead.linkedQuoteNumber) ||
        (lead.tasks || []).some((t) => t.type === "estimate" || t.title.toLowerCase().includes("estimate"));
      if (!inEst) return false;
    }

    // Unassigned filter
    if (wantUnassigned && !lead.isUnassignedPool) {
      return false;
    }

    // Hot filter (when no specific estate is asked)
    if (wantHot && matchedEstateKeywords.length === 0) {
      if (heat.score < 70 && !lead.isTopTrTarget && !lead.isVipPinned) return false;
    }

    // Generic keyword fallback if none of the structured intents matched
    if (
      matchedEstateKeywords.length === 0 &&
      maxAgeDays === null &&
      !wantStale &&
      !wantLvm &&
      !wantHot &&
      !wantRegisteredLand &&
      !wantMarkUp &&
      !wantEstimate &&
      !wantUnassigned &&
      q.length > 2
    ) {
      const words = lower
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !["give", "list", "all", "the", "leads", "who", "have", "about", "for", "from", "show", "with", "what", "are", "enquired", "inquired", "last", "month"].includes(w));
      if (words.length > 0) {
        const hay = `${lead.clientName} ${lead.targetEstate} ${lead.suburb} ${lead.preferredDesign} ${lead.notes} ${lead.stage} ${(lead.ghlTags || []).join(" ")}`.toLowerCase();
        return words.some((w) => hay.includes(w));
      }
    }

    return true;
  });

  // Sort results by AI Heat Score descending
  results = results.sort(
    (a, b) => calculateLeadHeatScore(b).score - calculateLeadHeatScore(a).score
  );

  const totalPipelineValue = results.reduce(
    (sum, l) => sum + (l.totalEstimatedDealValue || 0),
    0
  );

  const matchedLeadIds = new Set(results.map((l) => l.id));
  const matchedTasks = allTasks.filter((t) => t.leadId && matchedLeadIds.has(t.leadId) && !t.completed);

  const estateLabel =
    matchedEstateKeywords.length > 0
      ? matchedEstateKeywords.map((e) => e.charAt(0).toUpperCase() + e.slice(1)).join(" / ")
      : "Hudson Pipeline";

  const filterDescriptor =
    filterParts.length > 0 ? filterParts.join(" • ") : `Query: "${q}"`;

  const topLeadNames = results
    .slice(0, 4)
    .map(
      (l) =>
        `**${l.clientName}** (${l.targetEstate}${l.lotNumber && l.lotNumber !== "TBA" ? ` Lot ${l.lotNumber}` : ""} — *${l.preferredDesign}*, ${formatAud(l.totalEstimatedDealValue || 0)})`
    )
    .join(", ");

  const answerMarkdown =
    results.length > 0
      ? `Found **${results.length} matching lead${results.length === 1 ? "" : "s"}** (${formatAud(
          totalPipelineValue
        )} combined pipeline value) for **${filterDescriptor}**. Top priority matches include ${topLeadNames}.${
          matchedTasks.length > 0
            ? ` There are **${matchedTasks.length} open follow-up/mark-up/estimate tasks** across these leads.`
            : ""
        }`
      : `No leads matched "${q}" with strict filters. Try asking about **Flagstone**, **Bahrs Scrub**, **Hot Leads**, **LVM callbacks**, **Mark-up plans**, or **Stale leads**.`;

  const suggestedBulkSms =
    matchedEstateKeywords.includes("flagstone")
      ? `Hi {firstName}, Morgan here from Hudson Homes Flagstone Display. We have just released our updated ${new Date().toLocaleString("en-AU", { month: "long" })} House & Land pricing and siting packs for Flagstone. Would you like me to text through your custom {design} estimate today?`
      : `Hi {firstName}, Morgan here from Hudson Homes. Following up on your {design} enquiry at {estate} — I have availability today to walk through your floorplan mark-up and itemised Builders Estimate. Does 2:00pm or 4:30pm suit for a quick call?`;

  const suggestedTaskTitle = wantMarkUp
    ? `Complete Floorplan Mark-Up & Siting Review (${estateLabel})`
    : wantEstimate
    ? `Prepare & Send Itemised Builders Estimate (${estateLabel})`
    : `Priority Follow-Up Call & Package Update (${estateLabel})`;

  const suggestedTaskType: CrmTaskType = wantMarkUp
    ? "mark_up"
    : wantEstimate
    ? "estimate"
    : wantLvm
    ? "lvm_followup"
    : "call";

  return {
    query: q,
    filterDescriptor,
    answerMarkdown,
    matchedLeads: results,
    matchedTasks,
    totalPipelineValue,
    suggestedBulkSms,
    suggestedTaskTitle,
    suggestedTaskType,
  };
}

export interface AiCallAnalysisResult {
  summary: string;
  sentiment: CrmCallRecord["aiSentiment"];
  extractedFields: CrmCallRecord["extractedFields"];
  suggestedStage?: CrmLead["stage"];
  autoTasks: Array<{
    title: string;
    description: string;
    type: CrmTaskType;
    priority: "urgent" | "high" | "normal";
    slaDays: number;
    dueDateLabel: string;
    quickActionUrl?: string;
  }>;
  followUpSmsDraft: string;
}

/**
 * Gong.io-Style AI Call Transcript & Voice Debrief Analyzer:
 * Extracts structured client specifications (Estate, Lot #, Design, Budget, Land & Finance status),
 * determines call sentiment, drafts a tailored follow-up SMS, and generates categorised SLA tasks!
 */
export function analyzeCallTranscriptWithAi(
  transcriptOrNotes: string,
  lead: CrmLead
): AiCallAnalysisResult {
  const text = (transcriptOrNotes || "").trim();
  const lower = text.toLowerCase();
  const firstName = lead.clientName.split(" ")[0] || "Client";

  const extractedFields: NonNullable<CrmCallRecord["extractedFields"]> = {};
  const summaryLines: string[] = [];
  const autoTasks: AiCallAnalysisResult["autoTasks"] = [];
  let sentiment: CrmCallRecord["aiSentiment"] = "positive";
  let suggestedStage: CrmLead["stage"] | undefined = undefined;

  // 1. Detect Estate / Suburb
  const estateMatches: Array<[string, string, string]> = [
    ["flagstone", "Flagstone Rise", "Flagstone"],
    ["bahrs scrub", "Bahrs Scrub Vista", "Bahrs Scrub"],
    ["spring mountain", "Spring Mountain", "Spring Mountain"],
    ["yarrabilba", "Yarrabilba", "Yarrabilba"],
    ["watagan", "Watagan Park", "Cooranbong"],
    ["oran park", "Oran Park", "Oran Park"],
    ["warnervale", "HomeWorld Warnervale", "Warnervale"],
  ];
  for (const [kw, est, sub] of estateMatches) {
    if (lower.includes(kw)) {
      extractedFields.targetEstate = est;
      extractedFields.suburb = sub;
      break;
    }
  }

  // 2. Detect Lot Number
  const lotMatch = text.match(/\blot\s*#?\s*(\d{1,5}[a-zA-Z]?)\b/i);
  if (lotMatch) {
    extractedFields.lotNumber = lotMatch[1];
  }

  // 3. Detect House Design
  const designCatalog = [
    "Burgundy 27",
    "Alabaster 21",
    "Amber 21",
    "Aspen 25",
    "Kosciuszko 29",
    "Rutherford 27",
    "Rutherford 25",
    "Daintree 25",
    "Lennox 23",
    "Lennox 24",
    "Bellingen 26",
    "Esperance 22",
    "Allure 32",
    "Cambridge 28",
  ];
  for (const d of designCatalog) {
    const baseName = d.split(" ")[0].toLowerCase();
    if (lower.includes(baseName)) {
      extractedFields.preferredDesign = d;
      break;
    }
  }

  // 4. Detect Budget ($550k, $620,000, etc.)
  const kMatch = text.match(/\$\s*(\d{3})\s*k\b/i);
  const fullDollarMatch = text.match(/\$\s*(\d{3},\d{3})\b/);
  if (kMatch) {
    extractedFields.budget = parseInt(kMatch[1], 10) * 1000;
  } else if (fullDollarMatch) {
    extractedFields.budget = parseInt(fullDollarMatch[1].replace(/,/g, ""), 10);
  }

  // 5. Detect Land Status
  if (lower.includes("registered") || lower.includes("titled")) {
    extractedFields.landStatus = "Have Land (Registered)";
  } else if (lower.includes("unregistered") || lower.includes("under contract")) {
    extractedFields.landStatus = "Land Under Contract (Unregistered)";
  } else if (lower.includes("knockdown") || lower.includes("kdrb")) {
    extractedFields.landStatus = "Knockdown Rebuild (KDRB)";
  }

  // 6. Detect Finance Status
  if (lower.includes("pre-approv") || lower.includes("preapprov") || lower.includes("finance approved")) {
    extractedFields.financeStatus = "Pre-Approved";
  } else if (lower.includes("cash buyer") || lower.includes("paying cash")) {
    extractedFields.financeStatus = "Cash Buyer";
  } else if (lower.includes("broker") || lower.includes("bank")) {
    extractedFields.financeStatus = "Broker In Progress";
  }

  const activeDesign = extractedFields.preferredDesign || lead.preferredDesign || "Burgundy 27";
  const activeEstate = extractedFields.targetEstate || lead.targetEstate || "Flagstone Rise";
  const activeLot = extractedFields.lotNumber || lead.lotNumber || "TBA";

  summaryLines.push(
    `• Spoke with ${lead.clientName} regarding ${activeDesign} on Lot ${activeLot} (${activeEstate}).`
  );

  if (extractedFields.landStatus) {
    summaryLines.push(`• Land Status confirmed as: ${extractedFields.landStatus}.`);
  }
  if (extractedFields.financeStatus) {
    summaryLines.push(`• Finance Readiness: ${extractedFields.financeStatus}.`);
  }
  if (extractedFields.budget) {
    summaryLines.push(`• Target Build/Package Budget: ${formatAud(extractedFields.budget)}.`);
  }

  // 7. Detect Action Items -> Auto-Tasks!
  if (
    lower.includes("mark up") ||
    lower.includes("markup") ||
    lower.includes("mark-up") ||
    lower.includes("floorplan") ||
    lower.includes("floor plan") ||
    lower.includes("move wall") ||
    lower.includes("alfresco") ||
    lower.includes("media room") ||
    lower.includes("redline") ||
    lower.includes("modify")
  ) {
    summaryLines.push(
      `• Architectural Variation Requested: Client wants custom floorplan mark-up on ${activeDesign}.`
    );
    autoTasks.push({
      title: `📐 Floorplan Mark-Up: Modify ${activeDesign} layout for ${lead.clientName}`,
      description: `Client requested floorplan adjustments during call (${activeEstate} Lot ${activeLot}).`,
      type: "mark_up",
      priority: "urgent",
      slaDays: 1,
      dueDateLabel: "Tomorrow EOD",
      quickActionUrl: "/floorplan-editor",
    });
    suggestedStage = "concept_plan";
  }

  if (
    lower.includes("estimate") ||
    lower.includes("quote") ||
    lower.includes("price") ||
    lower.includes("pricing") ||
    lower.includes("site costs") ||
    lower.includes("h2") ||
    lower.includes("ceiling") ||
    lower.includes("inclusions")
  ) {
    summaryLines.push(
      `• Pricing & Estimate Action: Client requested itemised Builders Estimate for ${activeDesign} (${activeEstate}).`
    );
    autoTasks.push({
      title: `🧮 Prepare Builders Estimate: ${activeDesign} on Lot ${activeLot} ${activeEstate}`,
      description: `Generate itemised Builders Estimate PDF in Quoting Tool for ${lead.clientName}.`,
      type: "estimate",
      priority: "urgent",
      slaDays: 1,
      dueDateLabel: "Tomorrow EOD",
      quickActionUrl: "/quote-builder",
    });
    if (!suggestedStage) suggestedStage = "estimate_presented";
  }

  if (
    lower.includes("tender") ||
    lower.includes("atp") ||
    lower.includes("deposit") ||
    lower.includes("ready to proceed") ||
    lower.includes("sign")
  ) {
    summaryLines.push(
      `• High Closing Intent: Client ready to review Acceptance of Tender Proposal (ATP) & initial deposit.`
    );
    sentiment = "hot_ready";
    autoTasks.push({
      title: `🚀 Prepare ATP / Tender Submission Pack for ${lead.clientName}`,
      description: `Client expressed strong closing intent on call. Prepare Tender Request for Lot ${activeLot} ${activeEstate}.`,
      type: "tender_submission",
      priority: "urgent",
      slaDays: 1,
      dueDateLabel: "Tomorrow EOD",
      quickActionUrl: "/tender-request",
    });
    suggestedStage = "tender_requested";
  }

  if (
    lower.includes("voicemail") ||
    lower.includes("lvm") ||
    lower.includes("no answer") ||
    lower.includes("left a message")
  ) {
    sentiment = "voicemail";
    const nextLvm = (lead.lvmCount || 0) + 1;
    summaryLines.push(`• Left Voicemail (LVM #${nextLvm}) and queued automated SMS follow-up.`);
    autoTasks.push({
      title: `📞 LVM #${nextLvm} Callback: ${lead.clientName} (${activeEstate})`,
      description: `Follow-up call after leaving voicemail #${nextLvm}.`,
      type: "lvm_followup",
      priority: "high",
      slaDays: 1,
      dueDateLabel: "Tomorrow",
    });
  }

  // Always ensure at least one concrete follow-up task if none matched above
  if (autoTasks.length === 0) {
    summaryLines.push(
      `• Next Step: Send ${activeDesign} brochure & follow up with ${firstName} to book display consultation.`
    );
    autoTasks.push({
      title: `📞 Follow-Up Call & Send ${activeDesign} Package Pack to ${lead.clientName}`,
      description: `Post-call follow-up for ${activeEstate} enquiry.`,
      type: "call",
      priority: "high",
      slaDays: 1,
      dueDateLabel: "Tomorrow",
      quickActionUrl: "/quote-builder",
    });
  }

  const followUpSmsDraft =
    sentiment === "voicemail"
      ? `Hi ${firstName}, Morgan here from Hudson Homes. Just tried giving you a quick buzz regarding your ${activeDesign} enquiry at ${activeEstate} ( left a quick voicemail!). Let me know when suits for a 5-min chat today or tomorrow.`
      : `Hi ${firstName}, great speaking with you just now! As promised, I'm putting together your ${activeDesign} floorplan mark-up and itemised Builders Estimate for Lot ${activeLot} ${activeEstate}. I'll send that through shortly! — Morgan, Hudson Homes`;

  return {
    summary: summaryLines.join("\n"),
    sentiment,
    extractedFields,
    suggestedStage,
    autoTasks,
    followUpSmsDraft,
  };
}

/**
 * Matches a CRM Lead against the live Hudson Land & Package Database (`getLocalLots()` & `getLocalPackages()`)
 * and Saved Quotes (`loadAllQuotes()`) so the consultant can see matching lots, house packages,
 * and linked Builders Estimates right inside the Lead Cockpit!
 */
export function getLeadConnectedAssets(lead: CrmLead): {
  matchingLots: Lot[];
  matchingPackages: Pkg[];
  linkedQuotes: FullQuote[];
} {
  const lots = getLocalLots();
  const packages = getLocalPackages();
  const quotes = loadAllQuotes();

  const estateKey = (lead.targetEstate || "").toLowerCase().trim();
  const suburbKey = (lead.suburb || "").toLowerCase().trim();
  const clientNameKey = (lead.clientName || "").toLowerCase().trim();
  const firstToken = clientNameKey.split(/[\s&]+/)[0] || "";

  const matchingLots = lots
    .filter((lot) => {
      const lEst = (lot.estate || "").toLowerCase();
      const lSub = (lot.suburb || "").toLowerCase();
      if (estateKey && (lEst.includes(estateKey) || estateKey.includes(lEst))) return true;
      if (suburbKey && (lSub.includes(suburbKey) || suburbKey.includes(lSub))) return true;
      return false;
    })
    .slice(0, 6);

  const matchingPackages = packages
    .filter((pkg) => {
      const pSub = (pkg.suburb || "").toLowerCase();
      const pEst = (pkg.estate || "").toLowerCase();
      const pDes = (pkg.house_name || "").toLowerCase();
      if (suburbKey && pSub.includes(suburbKey)) return true;
      if (estateKey && pEst.includes(estateKey)) return true;
      if (lead.preferredDesign && pDes.includes(lead.preferredDesign.split(" ")[0].toLowerCase())) {
        return true;
      }
      return false;
    })
    .slice(0, 4);

  const linkedQuotes = quotes.filter((q) => {
    if (lead.linkedQuoteNumber && q.quoteNumber === lead.linkedQuoteNumber) return true;
    const qClient = (q.client?.clientName || "").toLowerCase();
    if (clientNameKey && qClient && (qClient.includes(clientNameKey) || clientNameKey.includes(qClient))) {
      return true;
    }
    if (firstToken.length >= 4 && qClient.includes(firstToken)) {
      return true;
    }
    return false;
  });

  return {
    matchingLots,
    matchingPackages,
    linkedQuotes,
  };
}

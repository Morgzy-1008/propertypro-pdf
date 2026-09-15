import {
  type LandParcel,
  type MatchingHudsonDesign,
  type ValuationMetrics,
  type LandScoutFilterState,
  type ComparableSale,
} from "./landScoutTypes";
import { findDesign } from "@/lib/pricing";

/**
 * Standard Hudson Design Reference for Automated Land Siting & Fit Analysis.
 */
interface HudsonPlanSpec {
  name: string;
  widthM: number;
  lengthM: number;
  minLotFrontageM: number;
  minLotDepthM: number;
  beds: number;
  baths: number;
  cars: number;
  baseHousePrice: number;
  isBtbFriendly: boolean;
}

const HUDSON_PLANS: HudsonPlanSpec[] = [
  {
    name: "Azure 19",
    widthM: 10.55,
    lengthM: 18.50,
    minLotFrontageM: 12.0,
    minLotDepthM: 25.0,
    beds: 4,
    baths: 2,
    cars: 2,
    baseHousePrice: 382900,
    isBtbFriendly: true,
  },
  {
    name: "Amber 21",
    widthM: 10.55,
    lengthM: 20.15,
    minLotFrontageM: 12.5,
    minLotDepthM: 27.0,
    beds: 4,
    baths: 2,
    cars: 2,
    baseHousePrice: 409900,
    isBtbFriendly: true,
  },
  {
    name: "Amber 23",
    widthM: 11.20,
    lengthM: 21.00,
    minLotFrontageM: 13.0,
    minLotDepthM: 28.0,
    beds: 4,
    baths: 2,
    cars: 2,
    baseHousePrice: 429900,
    isBtbFriendly: true,
  },
  {
    name: "Amber 26",
    widthM: 11.20,
    lengthM: 20.15,
    minLotFrontageM: 13.5,
    minLotDepthM: 27.0,
    beds: 4,
    baths: 2,
    cars: 2,
    baseHousePrice: 456400,
    isBtbFriendly: true,
  },
  {
    name: "Amaranth 23",
    widthM: 10.80,
    lengthM: 21.20,
    minLotFrontageM: 12.8,
    minLotDepthM: 28.0,
    beds: 4,
    baths: 2,
    cars: 2,
    baseHousePrice: 424900,
    isBtbFriendly: true,
  },
  {
    name: "Jasper 24",
    widthM: 10.89,
    lengthM: 21.50,
    minLotFrontageM: 12.5,
    minLotDepthM: 28.0,
    beds: 4,
    baths: 2,
    cars: 2,
    baseHousePrice: 438900,
    isBtbFriendly: true,
  },
  {
    name: "Jasper 26",
    widthM: 11.09,
    lengthM: 22.50,
    minLotFrontageM: 13.0,
    minLotDepthM: 29.5,
    beds: 4,
    baths: 2,
    cars: 2,
    baseHousePrice: 462900,
    isBtbFriendly: true,
  },
  {
    name: "Charcoal 24",
    widthM: 11.10,
    lengthM: 22.00,
    minLotFrontageM: 13.0,
    minLotDepthM: 28.5,
    beds: 4,
    baths: 2,
    cars: 2,
    baseHousePrice: 441900,
    isBtbFriendly: false,
  },
  {
    name: "Amber 30",
    widthM: 12.60,
    lengthM: 24.50,
    minLotFrontageM: 15.0,
    minLotDepthM: 32.0,
    beds: 5,
    baths: 2.5,
    cars: 2,
    baseHousePrice: 512900,
    isBtbFriendly: false,
  },
];

/**
 * Calculates matching Hudson floorplans for a specific vacant block.
 */
export function findMatchingHudsonDesigns(
  frontageM: number,
  depthM: number,
  landPrice: number,
  isBtb = false
): MatchingHudsonDesign[] {
  const matches: MatchingHudsonDesign[] = [];

  for (const plan of HUDSON_PLANS) {
    const requiredFrontage = isBtb ? plan.widthM + 1.2 : plan.minLotFrontageM;
    const requiredDepth = plan.minLotDepthM;

    if (frontageM >= requiredFrontage && depthM >= requiredDepth) {
      const designRow = findDesign(plan.name);
      const m2 = designRow?.m2 || 192.24;

      const sideBuffer = frontageM - plan.widthM;
      const leftSetback = isBtb ? 0.2 : Number((sideBuffer / 2).toFixed(2));
      const rightSetback = isBtb ? Number((sideBuffer - 0.2).toFixed(2)) : leftSetback;
      const rearSetback = Number(Math.max(1.0, depthM - plan.lengthM - 4.5).toFixed(2));

      matches.push({
        designName: plan.name,
        floorplanM2: m2,
        houseWidthM: plan.widthM,
        houseLengthM: plan.lengthM,
        beds: plan.beds,
        baths: plan.baths,
        cars: plan.cars,
        estimatedHousePrice: plan.baseHousePrice,
        estimatedPackagePrice: plan.baseHousePrice + landPrice,
        minFrontageRequired: requiredFrontage,
        sitingFitNote: `Comfortable Fit (${leftSetback}m Left, ${rightSetback}m Right, ${rearSetback}m Rear Yard)`,
      });
    }
  }

  return matches;
}

/**
 * Natural Language Prompt Parser for Land Search.
 * Translates queries like "Registered 450m2 lots in Flagstone under 400k with 14m frontage" into structured filters.
 */
export function parseNaturalLanguageLandQuery(query: string): Partial<LandScoutFilterState> {
  const q = query.trim().toLowerCase();
  const patch: Partial<LandScoutFilterState> = {};

  if (!q) return patch;

  // 1. State detection
  if (/\b(qld|queensland|brisbane|gold coast|ipswich|logan)\b/i.test(q)) {
    patch.state = "QLD";
  } else if (/\b(nsw|new south wales|sydney|parramatta|hunter|central coast)\b/i.test(q)) {
    patch.state = "NSW";
  }

  // 2. Registration status
  if (/\b(registered|titled|immediate|ready to build|settle now)\b/i.test(q)) {
    patch.isRegisteredOnly = true;
  }

  // 3. Strong buy / deal score
  if (/\b(deal|cheap|below market|strong buy|bargain|undervalued|spec)\b/i.test(q)) {
    patch.strongBuysOnly = true;
  }

  // 4. Price under $X or between $X and $Y
  const priceMaxMatch = q.match(/(?:under|below|max|up to|less than)\s*\$?(\d{2,3})(?:k|,\d{3}|000)?\b/i);
  if (priceMaxMatch) {
    let num = parseInt(priceMaxMatch[1], 10);
    if (num < 1000) num *= 1000;
    patch.maxPrice = num;
  }

  const priceMinMatch = q.match(/(?:over|above|min|from)\s*\$?(\d{2,3})(?:k|,\d{3}|000)?\b/i);
  if (priceMinMatch) {
    let num = parseInt(priceMinMatch[1], 10);
    if (num < 1000) num *= 1000;
    patch.minPrice = num;
  }

  // 5. Land size m² (e.g. "450m2", "400 to 500m2", "500sqm")
  const sizeRangeMatch = q.match(/(\d{3})\s*(?:-|to|and)\s*(\d{3})\s*(?:m2|sqm|m²)/i);
  if (sizeRangeMatch) {
    patch.minLandSize = parseInt(sizeRangeMatch[1], 10);
    patch.maxLandSize = parseInt(sizeRangeMatch[2], 10);
  } else {
    const singleSizeMatch = q.match(/(\d{3})\s*(?:m2|sqm|m²)/i);
    if (singleSizeMatch) {
      const target = parseInt(singleSizeMatch[1], 10);
      patch.minLandSize = Math.max(250, target - 50);
      patch.maxLandSize = target + 50;
    }
  }

  // 6. Frontage meters (e.g. "14m", "12.5m frontage", "15m wide")
  const frontageMatch = q.match(/(\d{1,2}(?:\.\d)?)\s*m\s*(?:frontage|wide|width)/i);
  if (frontageMatch) {
    patch.minFrontage = parseFloat(frontageMatch[1]);
  }

  // 7. Extract suburb/estate keywords
  const knownSuburbs = [
    "flagstone", "ripley", "coomera", "bahrs scrub", "lilywood", "caboolture",
    "south maclean", "springfield", "yarrabilba", "redbank plains", "park ridge",
    "box hill", "oran park", "marsden park", "austral", "calderwood", "warnervale",
    "wilton", "menangle", "the gables", "leppington"
  ];
  for (const s of knownSuburbs) {
    if (q.includes(s)) {
      patch.suburbOrEstate = s.charAt(0).toUpperCase() + s.slice(1);
      break;
    }
  }

  return patch;
}

/**
 * Generates Hudson Deal Score & Valuation Appraisal for a vacant parcel.
 */
export function calculateLandValuationMetrics({
  price,
  landSizeM2,
  frontageM,
  suburb,
  state,
  isRegistered,
  comparables = [],
}: {
  price: number;
  landSizeM2: number;
  frontageM: number;
  suburb: string;
  state: "QLD" | "NSW";
  isRegistered: boolean;
  comparables?: ComparableSale[];
}): ValuationMetrics {
  const currentPricePerM2 = Math.round(price / landSizeM2);

  // Benchmarks by State & Growth Corridors
  const baseBenchmark = state === "NSW" ? 1150 : 820; // benchmark $/m2
  let medianPricePerM2 = baseBenchmark;

  const lowSuburbs = ["flagstone", "south maclean", "yarrabilba", "caboolture", "warnervale", "calderwood"];
  const midSuburbs = ["ripley", "bahrs scrub", "lilywood", "leppington", "menangle"];
  const highSuburbs = ["box hill", "oran park", "marsden park", "austral", "coomera"];

  const subLower = suburb.toLowerCase();
  if (lowSuburbs.some((s) => subLower.includes(s))) {
    medianPricePerM2 = state === "NSW" ? 950 : 740;
  } else if (midSuburbs.some((s) => subLower.includes(s))) {
    medianPricePerM2 = state === "NSW" ? 1180 : 810;
  } else if (highSuburbs.some((s) => subLower.includes(s))) {
    medianPricePerM2 = state === "NSW" ? 1420 : 920;
  }

  const medianLandPrice = Math.round(medianPricePerM2 * landSizeM2);
  const priceDelta = ((price - medianLandPrice) / medianLandPrice) * 100;
  const priceDeltaPercent = Math.round(priceDelta * 10) / 10;

  // Turnkey construction benchmark (Hudson Amber 21 / Amber 26 single-storey average)
  const estimatedBuildCost = 430000;
  const turnkeyTotal = price + estimatedBuildCost;

  // Completed Gross Realization Value (Finished home resale in that area)
  // Typically sells at 15% - 22% premium over land+build in growth corridors
  const medianHomeMultiplier = state === "NSW" ? 1.24 : 1.18;
  const completedMarketValue = Math.round((turnkeyTotal * medianHomeMultiplier) / 5000) * 5000;
  const grossEquityMargin = completedMarketValue - turnkeyTotal;
  const equityMarginPercent = Math.round((grossEquityMargin / turnkeyTotal) * 1000) / 10;

  // Deal score calculation (0 - 100)
  let score = 70;
  if (priceDeltaPercent <= -10) score += 20; // 10%+ below median $/m2
  else if (priceDeltaPercent < 0) score += 10;
  else if (priceDeltaPercent > 10) score -= 15;

  if (frontageM >= 14.0) score += 5;
  if (isRegistered) score += 5; // Ready to build immediately

  score = Math.max(30, Math.min(98, score));

  let dealScoreRating: ValuationMetrics["dealScoreRating"] = "fair_value";
  let recommendation: ValuationMetrics["acquisitionRecommendation"] = "Client Packaging Only";
  let summary = "Priced fairly inline with current estate land releases.";

  if (score >= 85 || priceDeltaPercent <= -8) {
    dealScoreRating = "strong_buy";
    recommendation = "Hudson Spec Purchase";
    summary = `Exceptional Value: ${Math.abs(priceDeltaPercent)}% below median suburb land rate. High equity buffer of $${(grossEquityMargin / 1000).toFixed(0)}k (${equityMarginPercent}%) makes this an ideal candidate for direct Hudson spec inventory purchase.`;
  } else if (score >= 78) {
    dealScoreRating = "speculative_buy";
    recommendation = "Hudson Spec Purchase";
    summary = `High Commercial Appeal: Strong resale spread with estimated gross yield of ${equityMarginPercent}%. Recommended for either spec acquisition or premium client packaging.`;
  } else if (priceDeltaPercent > 8) {
    dealScoreRating = "premium";
    recommendation = "Hold For Negotiation";
    summary = `Priced at a ${priceDeltaPercent}% premium above average lot rate. Recommend requesting developer builder rebate ($5,000 - $10,000) before client contract.`;
  }

  return {
    medianSuburbLandPrice: medianLandPrice,
    medianSuburbPricePerM2: medianPricePerM2,
    priceDeltaPercent,
    dealScoreRating,
    dealScorePoints: score,
    dealSummary: summary,
    estimatedBuildCost,
    estimatedTurnkeyTotalCost: turnkeyTotal,
    estimatedCompletedMarketValue: completedMarketValue,
    projectedGrossEquityMargin: grossEquityMargin,
    projectedEquityMarginPercent: equityMarginPercent,
    acquisitionRecommendation: recommendation,
    comparableSales: comparables,
  };
}

/**
 * AI Agent Outreach Generator: Formulates high-converting builder enquiry messages for listing agents and developer sales reps.
 */
export function generateAgentOutreachMessage({
  parcel,
  consultantName = "Morgan Hales",
  consultantPhone = "0417 571 864",
  consultantEmail = "morgan.hales@hudsonhomes.com.au",
  channel = "email",
  inquiryType = "availability_check",
}: {
  parcel: LandParcel;
  consultantName?: string;
  consultantPhone?: string;
  consultantEmail?: string;
  channel: "email" | "sms" | "phone";
  inquiryType: "availability_check" | "builder_hold" | "disclosure_plan_request" | "price_negotiation";
}): { subject?: string; message: string } {
  const topDesign = parcel.matchingDesigns[0]?.designName || "Amber 26";
  const agentGreeting = parcel.agentName ? `Hi ${parcel.agentName.split(" ")[0]},` : "Hi there,";

  if (channel === "sms") {
    switch (inquiryType) {
      case "builder_hold":
        return {
          message: `${agentGreeting} ${consultantName} from Hudson Homes here. We have a pre-approved client ready to lock in Lot ${parcel.lotNumber} ${parcel.estate || parcel.suburb} (${parcel.landSizeM2}m²). Can you please place an immediate 7-day builder hold on this lot and send over the sales contract? Call me on ${consultantPhone}. Cheers!`,
        };
      case "disclosure_plan_request":
        return {
          message: `${agentGreeting} ${consultantName} from Hudson Homes. Looking at Lot ${parcel.lotNumber} (${parcel.streetAddress || parcel.estate}). Can you please text or email me the civil disclosure plan / engineering levels for our siting? Email: ${consultantEmail}. Thanks!`,
        };
      case "price_negotiation":
        return {
          message: `${agentGreeting} ${consultantName} from Hudson Homes. Regarding Lot ${parcel.lotNumber} ${parcel.estate} listed at $${parcel.price.toLocaleString()}. We have ready buyers and can exchange contracts this week with a builder rebate. Let's chat today: ${consultantPhone}.`,
        };
      case "availability_check":
      default:
        return {
          message: `${agentGreeting} ${consultantName} from Hudson Homes here. Could you please confirm if Lot ${parcel.lotNumber} ${parcel.estate || parcel.suburb} (${parcel.landSizeM2}m², $${parcel.price.toLocaleString()}) is still available for a turnkey house & land package? Thanks!`,
        };
    }
  }

  if (channel === "phone") {
    return {
      message: `[HUDSON CALL SCRIPT]\n"Hi ${parcel.agentName || "there"}, this is ${consultantName} from Hudson Homes ${parcel.state} division. I'm calling regarding Lot ${parcel.lotNumber} at ${parcel.estate ? `${parcel.estate}, ` : ""}${parcel.suburb} listed for $${parcel.price.toLocaleString()}.\n\nWe have an active, finance-approved client whose brief specifically matches this ${parcel.landSizeM2}m² lot with ${parcel.frontageM}m frontage for our ${topDesign} design.\n\nCould you confirm:\n1. Is the block strictly available or under conditional offer?\n2. What is the latest expected registration timeline (${parcel.expectedRegistrationDate})?\n3. Can you email me the latest disclosure plan and contract to ${consultantEmail}?"`,
    };
  }

  // Default Email
  let subject = `Availability & Builder Enquiry: Lot ${parcel.lotNumber}, ${parcel.estate || parcel.suburb} - Hudson Homes`;
  let body = "";

  if (inquiryType === "builder_hold") {
    subject = `URGENT: 7-Day Builder Hold Request: Lot ${parcel.lotNumber}, ${parcel.estate || parcel.suburb} - Hudson Homes`;
    body = `${agentGreeting}

I hope you're having a productive week.

My name is ${consultantName} with Hudson Homes (${parcel.state} Division).

We have an active, pre-approved building client ready to proceed with a turnkey House & Land package on Lot ${parcel.lotNumber} at ${parcel.estate ? `${parcel.estate}, ` : ""}${parcel.suburb} (${parcel.landSizeM2}m² with ${parcel.frontageM}m frontage, listed at $${parcel.price.toLocaleString()}).

Could you please confirm if we can place a 7-day builder hold on this lot to allow our client to sign their preliminary agreement?

Please also forward:
• The current Plan of Subdivision / Disclosure Plan
• Building Envelope Plan (BEP) / Estate POD guidelines
• Confirmation of expected title registration date (${parcel.expectedRegistrationDate})
• Draft land sale contract

Looking forward to working together on this site.

Warm regards,

${consultantName}
Senior New Home Consultant & Acquisition Specialist
Hudson Homes (${parcel.state} Division)
Mobile: ${consultantPhone}
Email: ${consultantEmail}
Web: hudsonhomes.com.au`;
  } else if (inquiryType === "price_negotiation") {
    subject = `Direct Acquisition Offer / Builder Rebate Inquiry: Lot ${parcel.lotNumber}, ${parcel.estate || parcel.suburb}`;
    body = `${agentGreeting}

${consultantName} here from Hudson Homes.

We are reviewing Lot ${parcel.lotNumber} in ${parcel.estate || parcel.suburb} (${parcel.landSizeM2}m², listed at $${parcel.price.toLocaleString()}) for immediate turnkey packaging and potential direct acquisition.

Our estimating team has run a full siting analysis with our ${topDesign} design, and the lot provides an excellent building platform. 

We can proceed to immediate contract exchange this month. Could you advise if the developer or vendor offers:
1. A standard builder commission or settlement rebate ($5,000 – $10,000)?
2. A 14–21 day finance clause or extended settlement terms?

I would love to discuss this with you today. Please feel free to give me a call directly on ${consultantPhone}.

Best regards,

${consultantName}
Hudson Homes
Mobile: ${consultantPhone}
Email: ${consultantEmail}`;
  } else {
    // Standard Availability Check
    body = `${agentGreeting}

I hope you're doing well.

My name is ${consultantName} with Hudson Homes (${parcel.state} Division).

I am currently running a land search for multiple qualified building buyers in ${parcel.suburb}, and came across Lot ${parcel.lotNumber} at ${parcel.estate ? `${parcel.estate}, ` : ""}${parcel.suburb} (${parcel.landSizeM2}m², ${parcel.frontageM}m frontage, $${parcel.price.toLocaleString()}).

We have designed a compliant architectural siting for this block using our ${topDesign} home design.

Could you please confirm:
1. Is this lot still currently available, or is it under contract / hold?
2. What is the latest expected title registration timeline?
3. Could you please send over the latest disclosure plan and civil engineering drawings?

Thank you for your time and assistance.

Warm regards,

${consultantName}
Hudson Homes
Direct: ${consultantPhone}
Email: ${consultantEmail}
Web: hudsonhomes.com.au`;
  }

  return { subject, message: body };
}

import {
  CrmLead,
  CrmStageId,
  CrmMessage,
  CrmNote,
  CrmTask,
  CrmTaskNote,
  CrmChecklistItem,
  CrmTaskType,
  CrmTeamMessage,
  TelnyxSettings,
  BulkSmsTemplate,
  normalizeConsultantId,
} from "./crmTypes";
import type { FullQuote } from "@/lib/quoting/quoteTypes";
import { getActiveStaffUser } from "@/lib/authSession";
export { getActiveStaffUser };

const CRM_STORAGE_KEY = "hudson_crm_leads_v3";
const CRM_MESSAGES_KEY = "hudson_crm_messages_v3";
const CRM_TEAM_MESSAGES_KEY = "hudson_crm_team_messages_v3";
const TELNYX_SETTINGS_KEY = "hudson_telnyx_settings_v3";
const OUTLOOK_SYNC_KEY = "hudson_outlook_sync_state_v3";
const CONSULTANT_SETTINGS_KEY = "hudson_consultant_settings_v3";

export const DEFAULT_BULK_SMS_TEMPLATES: BulkSmsTemplate[] = [
  {
    id: "tmpl_tr_push",
    title: "⚡ Tender Request Window Closing (Urgent Push)",
    category: "tr_push",
    body: "Hi {firstName}, Morgan here from Hudson Homes. Your custom {design} package pricing on Lot {lotNumber} {estate} is protected until this Friday. Would 3:30pm or 5:00pm tomorrow suit for a quick call to review your tender submission?",
  },
  {
    id: "tmpl_price_freeze",
    title: "🛡️ Quarterly Price Freeze Guarantee",
    category: "pricing_freeze",
    body: "Hi {firstName}, Hudson Homes is locking in builder pricing for Lot {lotNumber} before upcoming supplier increases. Secure your base price and premium inclusions today. Let me know if you would like me to text through the itemized breakdown!",
  },
  {
    id: "tmpl_open_home",
    title: "🏡 Weekend Display Home VIP Invitation",
    category: "open_home",
    body: "Hi {firstName}, we are hosting a private VIP preview at our Hudson Homes display this weekend. Tour the {design} design and walk through luxury finish options. Can I reserve a VIP slot for you and your family this Saturday?",
  },
  {
    id: "tmpl_plan_review",
    title: "📐 Concept Plan & Siting Ready",
    category: "followup",
    body: "Hi {firstName}, great news! Your customized concept plan and 1:200 siting for Lot {lotNumber} {estate} is complete. When is a good time today to jump on a quick 5-minute screen share to review the layout?",
  },
  {
    id: "tmpl_general_checkin",
    title: "👋 Casual Consultant Check-In",
    category: "general",
    body: "Hi {firstName}, Morgan from Hudson Homes here. Just checking in on how your land and build plans are progressing for {estate}. Happy to help with siting, developer covenant guidelines, or floorplan tweaks whenever you are ready!",
  },
];

export const INITIAL_DEMO_LEADS: CrmLead[] = [
  {
    id: "lead_lachlan_murdoch",
    clientName: "Lachlan & Sarah Murdoch",
    email: "lachlan.murdoch@outlook.com",
    mobile: "0412 884 921",
    secondaryCustomerName: "Sarah Murdoch",
    secondaryCustomerMobile: "0412 884 922",
    secondaryCustomerEmail: "sarah.murdoch@gmail.com",
    targetEstate: "Flagstone Rise",
    suburb: "Flagstone",
    lotNumber: "1042",
    landStatus: "Have Land (Registered)",
    landBudget: 320000,
    preferredDesign: "Aspen 25",
    facadeName: "Classic Hampton",
    housingType: "Single Storey",
    totalEstimatedDealValue: 492500,
    stage: "estimate_presented",
    assignedConsultantId: "morgan_hales",
    leadSource: "Display Home Kiosk",
    notes: "High interest in 2.6m ceiling height upgrade and extended alfresco. Pre-approval letter confirmed with Macquarie broker.",
    isTopTrTarget: true,
    trPriorityRank: 1,
    trConfidenceScore: "hot",
    trTargetDate: "This Friday 4:00 PM",
    trKeyObstacle: "Verify Bushfire BAL 12.5 allowance & finalize alfresco slab extension.",
    trEstimatedValue: 492500,
    trAiReadinessScore: 94,
    trAiReadinessReason: "Pre-approved finance confirmed, registered titled land, agreed on Aspen 25 layout. Only pending minor ceiling variation before ATP sign-off.",
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    clientNotes: [
      {
        id: "cn_lm_1",
        author: "Morgan Hales",
        content: "Met at Flagstone display. Walked through Aspen 25. Sarah loves the walk-in pantry. Wants formal tender presented by Friday.",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: "cn_lm_2",
        author: "Alyssa Hales (Assistant)",
        content: "Developer covenant check passed for Flagstone Rise Lot 1042. Siting setbacks match 6m front and 1.5m side.",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        isInternalCollab: true,
      },
    ],
    tasks: [
      {
        id: "task_lm_1",
        title: "Present revised Aspen 25 with 2.6m ceilings & Bushfire BAL rating",
        dueDate: "Today",
        completed: false,
        assignedTo: "morgan_hales",
        priority: "urgent",
        type: "tr_prep",
        createdAt: new Date().toISOString(),
      },
      {
        id: "task_lm_2",
        title: "Confirm Macquarie broker pre-approval documentation for head office",
        dueDate: "Tomorrow",
        completed: false,
        assignedTo: "morgan_hales",
        priority: "high",
        type: "tr_prep",
        createdAt: new Date().toISOString(),
      },
    ],
    activities: [
      {
        id: "act_lm_1",
        type: "quote",
        title: "Builders Estimate #MH-1042 Sent",
        description: "Aspen 25 with Classic Hampton facade ($492,500).",
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: "act_lm_2",
        type: "sms",
        title: "Outbound SMS Sent",
        description: "Sent siting plan confirmation to Lachlan.",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "lead_marcus_chen",
    clientName: "Marcus & Dave Chen",
    email: "marcus.chen@techqld.com.au",
    mobile: "0433 119 402",
    secondaryCustomerName: "Dave Chen",
    secondaryCustomerMobile: "0433 119 403",
    targetEstate: "Bahrs Scrub Vista",
    suburb: "Bahrs Scrub",
    lotNumber: "408",
    landStatus: "Have Land (Registered)",
    landBudget: 340000,
    preferredDesign: "Allure 32",
    facadeName: "Hamptons Designer",
    housingType: "Double Storey",
    totalEstimatedDealValue: 685000,
    stage: "concept_plan",
    assignedConsultantId: "morgan_hales",
    leadSource: "Phone Walk-in",
    notes: "Requires drop edge beam due to 1.8m fall across site. Ordered contour survey to verify earthworks allowance.",
    isTopTrTarget: true,
    trPriorityRank: 2,
    trConfidenceScore: "hot",
    trTargetDate: "Monday 11:00 AM",
    trKeyObstacle: "Review engineer contour survey & confirm earthworks cap.",
    trEstimatedValue: 685000,
    trAiReadinessScore: 88,
    trAiReadinessReason: "Land settled. Budget up to $720k. Consultation meeting booked for Monday morning to finalize tender submission paperwork.",
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    clientNotes: [
      {
        id: "cn_mc_1",
        author: "Morgan Hales",
        content: "Marcus called to discuss Allure 32 double storey on sloping block. Explained drop edge beam options.",
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
    tasks: [
      {
        id: "task_mc_1",
        title: "Call surveyor regarding Lot 408 contour DWG & drop edge beam costing",
        dueDate: "Tomorrow",
        completed: false,
        assignedTo: "morgan_hales",
        priority: "high",
        type: "site_visit",
        createdAt: new Date().toISOString(),
      },
    ],
    activities: [
      {
        id: "act_mc_1",
        type: "status_change",
        title: "Moved to Concept Plan",
        description: "Drafting 1:200 siting with engineer slope allowance.",
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "lead_priya_sharma",
    clientName: "Priya & Aarav Sharma",
    email: "priya.sharma@healthqld.gov.au",
    mobile: "0421 990 144",
    secondaryCustomerName: "Aarav Sharma",
    secondaryCustomerMobile: "0421 990 145",
    targetEstate: "Spring Mountain",
    suburb: "Spring Mountain",
    lotNumber: "712",
    landStatus: "Land Under Contract (Unregistered)",
    landBudget: 360000,
    preferredDesign: "Cambridge 28",
    facadeName: "Modern Metro",
    housingType: "Double Storey",
    totalEstimatedDealValue: 588000,
    stage: "meeting_booked",
    assignedConsultantId: "morgan_hales",
    leadSource: "Website Inquiry",
    notes: "Comparing Hudson Homes against Metricon. Loves our 900mm Westinghouse package and H1 slab inclusion.",
    isTopTrTarget: true,
    trPriorityRank: 3,
    trConfidenceScore: "warm",
    trTargetDate: "Next Wednesday",
    trKeyObstacle: "Side-by-side specification comparison vs competing builder.",
    trEstimatedValue: 588000,
    trAiReadinessScore: 79,
    trAiReadinessReason: "Very keen on Hudson inclusions. Ready to proceed once value advantage is clearly articulated in writing.",
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    clientNotes: [
      {
        id: "cn_ps_1",
        author: "Morgan Hales",
        content: "Met Priya and Aarav at Spring Mountain display. Emphasized Hudson's fixed site costs guarantee.",
        createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
    ],
    tasks: [
      {
        id: "task_ps_1",
        title: "Send Inclusions comparison sheet highlighting H1 slab & double glazing",
        dueDate: "In 2 days",
        completed: false,
        assignedTo: "morgan_hales",
        priority: "normal",
        type: "quote_revision",
        createdAt: new Date().toISOString(),
      },
    ],
    activities: [
      {
        id: "act_ps_1",
        type: "status_change",
        title: "Meeting Booked",
        description: "Consultation scheduled at display centre.",
        timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "lead_nathan_wright",
    clientName: "Nathan Wright",
    email: "nathan.wright@sunshinecoast.com.au",
    mobile: "0408 332 199",
    targetEstate: "Harmony Estate",
    suburb: "Palmview",
    lotNumber: "221",
    landStatus: "Looking for Land",
    landBudget: 310000,
    preferredDesign: "Breeze 22",
    facadeName: "Coastal Elegance",
    housingType: "Single Storey",
    totalEstimatedDealValue: 445000,
    stage: "walk_ins",
    assignedConsultantId: "morgan_hales",
    leadSource: "Display Home Kiosk",
    notes: "First home buyer. Eligible for QLD $30,000 First Home Owner Grant. Checking finance borrowing capacity with Aussie Home Loans.",
    isTopTrTarget: true,
    trPriorityRank: 4,
    trConfidenceScore: "warm",
    trTargetDate: "In 2 weeks",
    trKeyObstacle: "Broker confirming final borrowing capacity under FHOG scheme.",
    trEstimatedValue: 445000,
    trAiReadinessScore: 72,
    trAiReadinessReason: "Grant eligible, deposit saved. Just waiting on broker certificate of capacity.",
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    clientNotes: [
      {
        id: "cn_nw_1",
        author: "Morgan Hales",
        content: "Registered at kiosk on Sunday. Looking for 4-bedroom single storey under $460k.",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    tasks: [
      {
        id: "task_nw_1",
        title: "LVM Follow-up: Call Nathan regarding borrowing capacity update",
        dueDate: "Today",
        completed: false,
        assignedTo: "morgan_hales",
        priority: "normal",
        type: "lvm_followup",
        createdAt: new Date().toISOString(),
      },
    ],
    activities: [
      {
        id: "act_nw_1",
        type: "lvm",
        title: "Left Voicemail (LVM)",
        description: "Left friendly message following kiosk registration.",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "lead_chloe_vance",
    clientName: "Chloe & Sam Vance",
    email: "chloe.vance@sydneycorp.com.au",
    mobile: "0419 778 321",
    secondaryCustomerName: "Sam Vance",
    secondaryCustomerMobile: "0419 778 322",
    targetEstate: "Box Hill Heights",
    suburb: "Box Hill",
    lotNumber: "18",
    landStatus: "Have Land (Registered)",
    landBudget: 450000,
    preferredDesign: "Deco 34",
    facadeName: "Executive Grand",
    housingType: "Double Storey",
    totalEstimatedDealValue: 720000,
    tenderPrice: 718500,
    stage: "tender_requested",
    assignedConsultantId: "morgan_hales",
    leadSource: "Developer Land Partner",
    notes: "Tender requested through Hudson Head Office. Estimating preparing formal fixed-price tender agreement.",
    isTopTrTarget: true,
    trPriorityRank: 5,
    trConfidenceScore: "hot",
    trTargetDate: "Awaiting Tender Document",
    trKeyObstacle: "Head office tender drafting (due this week).",
    trEstimatedValue: 720000,
    trAiReadinessScore: 96,
    trAiReadinessReason: "ATP signed & $2,500 preliminary deposit paid! Waiting on formal tender document from estimating department.",
    isAtpSigned: true,
    atpFeePaid: true,
    atpSignedDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    isContractSigned: false,
    contractDepositPaid: false,
    clientNotes: [
      {
        id: "cn_cv_1",
        author: "Morgan Hales",
        content: "ATP signed and fee receipted. Head office tender requested #TR-8821.",
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ],
    tasks: [
      {
        id: "task_cv_1",
        title: "Follow up Head Office Estimator on Deco 34 Tender document dispatch",
        dueDate: "Today",
        completed: false,
        assignedTo: "morgan_hales",
        priority: "urgent",
        type: "tr_prep",
        createdAt: new Date().toISOString(),
      },
    ],
    activities: [
      {
        id: "act_cv_1",
        type: "tender",
        title: "Tender Requested #TR-8821",
        description: "Formal fixed-price tender initiated for Deco 34.",
        timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 18).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "lead_james_miller",
    clientName: "James & Olivia Miller",
    email: "james.miller@illawarra.net.au",
    mobile: "0488 441 229",
    targetEstate: "Calderwood Valley",
    suburb: "Calderwood",
    lotNumber: "89",
    landStatus: "Have Land (Registered)",
    landBudget: 350000,
    preferredDesign: "Avoca 26",
    facadeName: "Coastal",
    housingType: "Single Storey",
    totalEstimatedDealValue: 515000,
    stage: "new_lead",
    assignedConsultantId: "morgan_hales",
    leadSource: "Website Inquiry",
    notes: "Inquired online regarding Avoca 26 on 15m frontage lot in Calderwood.",
    isTopTrTarget: false,
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    clientNotes: [],
    tasks: [
      {
        id: "task_jm_1",
        title: "Urgent: Make initial contact call with James Miller regarding Avoca 26 enquiry",
        dueDate: "Overdue (Yesterday)",
        completed: false,
        assignedTo: "morgan_hales",
        priority: "urgent",
        type: "call",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    activities: [
      {
        id: "act_jm_1",
        type: "status_change",
        title: "Online Inquiry Received",
        description: "Submitted web form from hudsonhomes.com.au",
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "lead_liam_taylor",
    clientName: "Liam & Jessica Taylor",
    email: "liam.taylor@sydneywest.com.au",
    mobile: "0401 223 998",
    targetEstate: "Austral Heights",
    suburb: "Austral",
    lotNumber: "330",
    landStatus: "Knockdown Rebuild (KDRB)",
    landBudget: 0,
    preferredDesign: "Ashton 23",
    facadeName: "Metro",
    housingType: "Single Storey",
    totalEstimatedDealValue: 475000,
    stage: "walk_ins",
    assignedConsultantId: "morgan_hales",
    leadSource: "Phone Walk-in",
    notes: "Existing house in Austral. Looking to knock down and rebuild single storey home.",
    isTopTrTarget: false,
    isAtpSigned: false,
    atpFeePaid: false,
    isContractSigned: false,
    contractDepositPaid: false,
    clientNotes: [],
    tasks: [
      {
        id: "task_lt_1",
        title: "Send KDRB planning guide & Ashton 23 siting checklist",
        dueDate: "In 3 days",
        completed: false,
        assignedTo: "morgan_hales",
        priority: "normal",
        type: "quote_revision",
        createdAt: new Date().toISOString(),
      },
    ],
    activities: [
      {
        id: "act_lt_1",
        type: "status_change",
        title: "KDRB Inquiry Registered",
        description: "Walked into display home to discuss demolition and rebuild.",
        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      },
    ],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date().toISOString(),
    lastContactedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export const INITIAL_DEMO_MESSAGES: CrmMessage[] = [
  {
    id: "msg_demo_1",
    clientEmail: "lachlan.murdoch@outlook.com",
    clientMobile: "0412 884 921",
    direction: "outbound",
    channel: "sms",
    senderName: "Morgan Hales",
    recipientName: "Lachlan Murdoch",
    body: "Hi Lachlan, Morgan here from Hudson Homes. Following up on your Aspen 25 package for Lot 1042 Flagstone Rise. Let me know if you would like me to adjust the ceiling heights before our catchup!",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    isRead: true,
  },
  {
    id: "msg_demo_2",
    clientEmail: "lachlan.murdoch@outlook.com",
    clientMobile: "0412 884 921",
    direction: "inbound",
    channel: "sms",
    senderName: "Lachlan Murdoch",
    recipientName: "Morgan Hales",
    body: "Thanks Morgan! Sarah and I reviewed the plan last night. We definitely want the 2.6m ceilings. Can you have the tender ready for us to sign by Friday afternoon?",
    timestamp: new Date(Date.now() - 86400000 / 2).toISOString(),
    isRead: false,
  },
  {
    id: "msg_demo_3",
    clientEmail: "marcus.chen@techqld.com.au",
    clientMobile: "0433 119 402",
    direction: "outbound",
    channel: "email",
    senderName: "Morgan Hales",
    recipientName: "Marcus Chen",
    subject: "Hudson Homes — Allure 32 Siting & Contour Survey for Lot 408 Bahrs Scrub",
    body: "Hi Marcus,\n\nThanks for your time on the phone today discussing the Allure 32 double storey.\n\nOur assistant Alyssa has lodged the contour survey request so our engineer can accurately price the drop edge beam and earthworks. I will have the final figures ready for our meeting on Monday at 11am.\n\nWarm regards,\nMorgan Hales",
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    isRead: true,
    outlookSynced: true,
  },
];

export const INITIAL_DEMO_TEAM_MESSAGES: CrmTeamMessage[] = [
  {
    id: "tm_1",
    channelId: "general-sales",
    authorId: "alyssa_hales",
    authorName: "Alyssa Hales",
    authorRole: "Executive Assistant / NHC",
    content: "Team, Flagstone display had 18 walk-ins over the weekend! 3 clients specifically asked about the Aspen 25 package. Great start to the month! 🚀",
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "tm_2",
    channelId: "general-sales",
    authorId: "morgan_hales",
    authorName: "Morgan Hales",
    authorRole: "Senior NHC & Admin",
    content: "Awesome momentum. Lachlan Murdoch is ready to TR for Aspen 25 this Friday once we confirm the BAL rating. Targeting ATP by 4pm.",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    linkedLeadId: "lead_lachlan_murdoch",
    linkedLeadName: "Lachlan & Sarah Murdoch",
  },
  {
    id: "tm_3",
    channelId: "general-sales",
    authorId: "adrian",
    authorName: "Adrian Baxter",
    authorRole: "New Home Consultant",
    content: "Bahrs Scrub display looking great today. Sited two lots for clients visiting from Brisbane.",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "tm_4",
    channelId: "tender-dispatch",
    authorId: "shelley_lay",
    authorName: "Shelley Lay",
    authorRole: "Sales Manager",
    content: "@Morgan: Estimating team has finalized the Chloe & Sam Vance Deco 34 tender. Document is dispatched and ready for consultant review.",
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    linkedLeadId: "lead_chloe_vance",
    linkedLeadName: "Chloe & Sam Vance",
    isUrgent: true,
  },
  {
    id: "tm_5",
    channelId: "tender-dispatch",
    authorId: "morgan_hales",
    authorName: "Morgan Hales",
    authorRole: "Senior NHC & Admin",
    content: "@Shelley: Perfect! Reviewing right now so I can book in their formal presentation for Thursday afternoon.",
    timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString(),
  },
  {
    id: "tm_6",
    channelId: "admin-assistance",
    authorId: "alyssa_hales",
    authorName: "Alyssa Hales",
    authorRole: "Executive Assistant / NHC",
    content: "@Morgan: Ordered the soil test and contour survey for Marcus Chen (Lot 408 Bahrs Scrub). Expecting engineer DWG by Wednesday morning.",
    timestamp: new Date(Date.now() - 3600000 * 4.5).toISOString(),
    linkedLeadId: "lead_marcus_chen",
    linkedLeadName: "Marcus & Dave Chen",
  },
  {
    id: "tm_7",
    channelId: "admin-assistance",
    authorId: "morgan_hales",
    authorName: "Morgan Hales",
    authorRole: "Senior NHC & Admin",
    content: "@Alyssa: Thanks! Once that's in, could you please pre-fill the tender request form with the setbacks?",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: "tm_8",
    channelId: "admin-assistance",
    authorId: "alyssa_hales",
    authorName: "Alyssa Hales",
    authorRole: "Executive Assistant / NHC",
    content: "Consider it done! I will also attach the developer covenant guidelines.",
    timestamp: new Date(Date.now() - 3600000 * 3.8).toISOString(),
  },
  {
    id: "tm_9",
    channelId: "hot-deals",
    authorId: "morgan_hales",
    authorName: "Morgan Hales",
    authorRole: "Senior NHC & Admin",
    content: "🔥 Lachlan & Sarah Murdoch flagged as #1 TR Target — $492,500 deal value. Closing this Friday!",
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    linkedLeadId: "lead_lachlan_murdoch",
    linkedLeadName: "Lachlan & Sarah Murdoch",
    isUrgent: true,
  },
];

// -------------------------------------------------------------
// Core CRM Leads Storage
// -------------------------------------------------------------

export async function loadAllCrmLeads(): Promise<CrmLead[]> {
  try {
    const raw = localStorage.getItem(CRM_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_LEADS));
      return INITIAL_DEMO_LEADS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_LEADS));
      return INITIAL_DEMO_LEADS;
    }
    return parsed;
  } catch (err) {
    console.error("Error loading CRM leads:", err);
    return INITIAL_DEMO_LEADS;
  }
}

export async function saveCrmLead(lead: CrmLead): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const idx = list.findIndex((l) => l.id === lead.id);
  let updatedList: CrmLead[];

  const updatedLead = {
    ...lead,
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    updatedList = [...list];
    updatedList[idx] = updatedLead;
  } else {
    updatedList = [updatedLead, ...list];
  }

  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updatedList));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "save", lead: updatedLead } }));
  }
  return updatedList;
}

export async function deleteCrmLead(leadId: string): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updated = list.filter((l) => l.id !== leadId);
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "delete", leadId } }));
  }
  return updated;
}

export async function clearAllCrmData(): Promise<void> {
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify([]));
  localStorage.setItem(CRM_MESSAGES_KEY, JSON.stringify([]));
  localStorage.setItem(CRM_TEAM_MESSAGES_KEY, JSON.stringify([]));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "clear" } }));
  }
}

export async function updateCrmLeadStage(leadId: string, newStage: CrmStageId): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updatedList = list.map((l) => {
    if (l.id === leadId) {
      const newActivities = [...(l.activities || [])];
      newActivities.unshift({
        id: `act_${Date.now()}`,
        type: "status_change",
        title: `Moved to ${newStage.replace(/_/g, " ").toUpperCase()}`,
        description: `Lead moved to ${newStage} stage by sales consultant.`,
        timestamp: new Date().toISOString(),
      });

      return {
        ...l,
        stage: newStage,
        activities: newActivities,
        updatedAt: new Date().toISOString(),
        lastContactedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updatedList));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "stage_change", leadId, newStage } }));
  }
  return updatedList;
}

// -------------------------------------------------------------
// Top 10 Most Likely to TR (Tender Request) Helpers
// -------------------------------------------------------------

export async function toggleLeadTopTr(
  leadId: string,
  isTopTr: boolean,
  updates?: {
    trPriorityRank?: number;
    trConfidenceScore?: "hot" | "warm" | "nurturing";
    trTargetDate?: string;
    trKeyObstacle?: string;
  }
): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updatedList = list.map((l) => {
    if (l.id === leadId) {
      const newActivities = [...(l.activities || [])];
      if (isTopTr) {
        newActivities.unshift({
          id: `act_${Date.now()}`,
          type: "status_change",
          title: `Added to Top 10 TR Target Radar (Rank #${updates?.trPriorityRank || 1})`,
          description: `Identified as high-priority Tender Request target. Obstacle: ${updates?.trKeyObstacle || "None specified"}.`,
          timestamp: new Date().toISOString(),
        });
      }

      return {
        ...l,
        isTopTrTarget: isTopTr,
        trPriorityRank: updates?.trPriorityRank ?? (isTopTr ? l.trPriorityRank || 1 : undefined),
        trConfidenceScore: updates?.trConfidenceScore ?? (isTopTr ? l.trConfidenceScore || "hot" : undefined),
        trTargetDate: updates?.trTargetDate ?? l.trTargetDate,
        trKeyObstacle: updates?.trKeyObstacle ?? l.trKeyObstacle,
        activities: newActivities,
        updatedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updatedList));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "top_tr_change", leadId, isTopTr } }));
  }
  return updatedList;
}

export async function pushLeadToTenderRequested(leadId: string): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const staff = typeof window !== "undefined" ? getActiveStaffUser() : null;
  const consultantName = staff?.name || "Morgan Hales";

  const updatedList = list.map((l) => {
    if (l.id === leadId) {
      const newActivities = [...(l.activities || [])];
      newActivities.unshift({
        id: `act_${Date.now()}`,
        type: "tender",
        title: "🚀 Tender Request Submitted to Head Office",
        description: `Tender submission initiated by ${consultantName}. Client ATP confirmed.`,
        timestamp: new Date().toISOString(),
      });

      const updatedTasks = [...(l.tasks || [])];
      updatedTasks.unshift({
        id: `task_${Date.now()}`,
        title: "Receive and verify head office fixed-price tender document",
        dueDate: "In 3 days",
        completed: false,
        assignedTo: l.assignedConsultantId,
        priority: "urgent",
        type: "tr_prep",
        createdAt: new Date().toISOString(),
      });

      return {
        ...l,
        stage: "tender_requested" as CrmStageId,
        isAtpSigned: true,
        atpFeePaid: true,
        atpSignedDate: new Date().toISOString(),
        tasks: updatedTasks,
        activities: newActivities,
        updatedAt: new Date().toISOString(),
        lastContactedAt: new Date().toISOString(),
      };
    }
    return l;
  });

  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updatedList));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "push_to_tr", leadId } }));
  }
  return updatedList;
}

// -------------------------------------------------------------
// Tasks Management across all clients
// -------------------------------------------------------------

export async function updateLeadTask(
  leadId: string,
  taskId: string,
  completed: boolean
): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updated = list.map((lead) => {
    if (lead.id === leadId && lead.tasks) {
      const updatedTasks = lead.tasks.map((t) =>
        t.id === taskId ? { ...t, completed } : t
      );
      return { ...lead, tasks: updatedTasks, updatedAt: new Date().toISOString() };
    }
    return lead;
  });
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "task_toggle", leadId, taskId, completed } }));
  }
  return updated;
}

export async function addLeadTask(
  leadId: string,
  task: Omit<CrmTask, "id" | "createdAt">
): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updated = list.map((lead) => {
    if (lead.id === leadId) {
      const currentTasks = lead.tasks || [];
      const newTask: CrmTask = {
        ...task,
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: new Date().toISOString(),
      };
      return {
        ...lead,
        tasks: [newTask, ...currentTasks],
        updatedAt: new Date().toISOString(),
      };
    }
    return lead;
  });
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "task_add", leadId } }));
  }
  return updated;
}

export async function snoozeLeadTask(
  leadId: string,
  taskId: string,
  newDueDateText: string
): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updated = list.map((lead) => {
    if (lead.id === leadId && lead.tasks) {
      const updatedTasks = lead.tasks.map((t) =>
        t.id === taskId ? { ...t, dueDate: newDueDateText } : t
      );
      return { ...lead, tasks: updatedTasks, updatedAt: new Date().toISOString() };
    }
    return lead;
  });
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "task_snooze", leadId, taskId } }));
  }
  return updated;
}

export async function deleteLeadTask(leadId: string, taskId: string): Promise<CrmLead[]> {
  const list = await loadAllCrmLeads();
  const updated = list.map((lead) => {
    if (lead.id === leadId && lead.tasks) {
      return {
        ...lead,
        tasks: lead.tasks.filter((t) => t.id !== taskId),
        updatedAt: new Date().toISOString(),
      };
    }
    return lead;
  });
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "task_delete", leadId, taskId } }));
  }
  return updated;
}

// -------------------------------------------------------------
// Shared Colleague Tasks & Real-Time Collaboration Engine
// -------------------------------------------------------------

const CRM_SHARED_TASKS_KEY = "hudson_crm_shared_tasks_v2";

export function calculateEodDeadline(days: number, fromDate: Date = new Date()): string {
  const target = new Date(fromDate);
  target.setDate(target.getDate() + days);
  target.setHours(17, 0, 0, 0); // 5:00:00 PM local time
  return target.toISOString();
}

export function getTaskSlaUrgency(
  dueAtOrDate?: string,
  completed?: boolean
): {
  urgency: "overdue" | "due_today" | "due_tomorrow" | "upcoming" | "completed";
  countdownText: string;
  badgeStyle: string;
} {
  if (completed) {
    return {
      urgency: "completed",
      countdownText: "Smashed Out ✓",
      badgeStyle: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    };
  }

  if (!dueAtOrDate) {
    return {
      urgency: "upcoming",
      countdownText: "Scheduled",
      badgeStyle: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
    };
  }

  const now = new Date();
  const lowerDue = dueAtOrDate.toLowerCase();

  const dueTime = Date.parse(dueAtOrDate);
  if (!isNaN(dueTime)) {
    const due = new Date(dueTime);
    const diffMs = due.getTime() - now.getTime();

    if (diffMs < 0) {
      const absDiffMs = Math.abs(diffMs);
      const diffHours = Math.floor(absDiffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);
      const overdueText = diffDays > 0 ? `Overdue by ${diffDays}d` : `Overdue by ${Math.max(1, diffHours)}h`;
      return {
        urgency: "overdue",
        countdownText: overdueText,
        badgeStyle: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold",
      };
    }

    const isToday =
      now.getFullYear() === due.getFullYear() &&
      now.getMonth() === due.getMonth() &&
      now.getDate() === due.getDate();

    if (isToday) {
      const diffHours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)));
      return {
        urgency: "due_today",
        countdownText: `Due Today 5:00 PM (${diffHours}h left)`,
        badgeStyle: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold",
      };
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      tomorrow.getFullYear() === due.getFullYear() &&
      tomorrow.getMonth() === due.getMonth() &&
      tomorrow.getDate() === due.getDate();

    if (isTomorrow) {
      return {
        urgency: "due_tomorrow",
        countdownText: "Due Tomorrow 5:00 PM",
        badgeStyle: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 font-semibold",
      };
    }

    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return {
      urgency: "upcoming",
      countdownText: `Due in ${diffDays}d (${due.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })})`,
      badgeStyle: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 font-medium",
    };
  }

  if (lowerDue.includes("overdue") || lowerDue.includes("yesterday")) {
    return {
      urgency: "overdue",
      countdownText: dueAtOrDate,
      badgeStyle: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 font-bold",
    };
  }
  if (lowerDue.includes("today") || lowerDue.includes("urgent")) {
    return {
      urgency: "due_today",
      countdownText: dueAtOrDate,
      badgeStyle: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold",
    };
  }
  if (lowerDue.includes("tomorrow")) {
    return {
      urgency: "due_tomorrow",
      countdownText: dueAtOrDate,
      badgeStyle: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 font-semibold",
    };
  }

  return {
    urgency: "upcoming",
    countdownText: dueAtOrDate,
    badgeStyle: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30 font-medium",
  };
}

function getInitialSharedTasks(): CrmTask[] {
  const now = new Date();
  return [
    {
      id: "shared_task_01_markup_steve",
      title: "Mark-up Jasper 26 - Extended Alfresco & Butler's Pantry",
      description: "Steve from NSW requested an extra 2.4m on the rear alfresco and converting the walk-in linen into an extended butler's pantry with cavity sliding door.",
      type: "mark_up",
      assignedTo: "alyssa_hales",
      delegatedBy: "Morgan Hales",
      createdBy: "Morgan Hales",
      completed: false,
      priority: "high",
      slaDays: 2,
      dueAt: calculateEodDeadline(2, now),
      dueDate: "In 2 days (5:00 PM)",
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      clientName: "Steve from NSW",
      clientMobile: "0411 222 333",
      estate: "Penrith (NSW)",
      designName: "Jasper 26",
      quoteNumber: "SN101",
      quickActionUrl: "/floorplan-editor",
      checklist: [
        { id: "c1", text: "Extend rear alfresco roofline by 2.4m", completed: false },
        { id: "c2", text: "Insert cavity sliding door to butler's pantry", completed: false },
        { id: "c3", text: "Export PDF redline and attach to client quote", completed: false },
      ],
      notes: [
        {
          id: "n1",
          author: "Morgan Hales",
          text: "Client requested 2.4m extension on rear alfresco and cavity slider to pantry. Ready to sign ATP once revised.",
          createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
        },
      ],
      tags: ["Mark-up", "Jasper 26", "NSW"],
    },
    {
      id: "shared_task_02_call_david",
      title: "Call David Miller - Soil Test & Piering Allowance Review",
      description: "Discuss geotechnical borehole findings. Slab engineer upgraded to Class H1 soil; explain $4,850 piering inclusion and fixed price foundation cap.",
      type: "call",
      assignedTo: "morgan_hales",
      delegatedBy: "Morgan Hales",
      createdBy: "Morgan Hales",
      completed: false,
      priority: "urgent",
      slaDays: 0,
      dueAt: calculateEodDeadline(0, now),
      dueDate: "Today 5:00 PM",
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      clientName: "David Miller",
      clientMobile: "0412 345 678",
      estate: "Bottletree Street, Bahrs Scrub",
      designName: "Jasper 26",
      quoteNumber: "DM101",
      quickActionUrl: "/quote-builder",
      checklist: [
        { id: "c1", text: "Walk client through H1 soil classification", completed: false },
        { id: "c2", text: "Send updated tender variation breakdown", completed: false },
      ],
      tags: ["Site Costs", "Soil Test", "Piering"],
    },
    {
      id: "shared_task_03_tender_sarah",
      title: "Review Sarah Jenkins Tender Proposal (ATP Prep)",
      description: "Formal Acceptance of Tender Proposal package review. Ensure all inclusion items (ducted air conditioning, 900mm appliances) are line-itemed.",
      type: "tender_submission",
      assignedTo: "adrian",
      delegatedBy: "Morgan Hales",
      createdBy: "Morgan Hales",
      completed: false,
      priority: "high",
      slaDays: 3,
      dueAt: calculateEodDeadline(3, now),
      dueDate: "In 3 days (5:00 PM)",
      createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      clientName: "Sarah Jenkins",
      clientMobile: "0429 881 200",
      estate: "Flagstone",
      designName: "Tiffany 22",
      quickActionUrl: "/tender-request",
      tags: ["Tender ATP", "Tiffany 22"],
    },
    {
      id: "shared_task_04_site_visit_ben",
      title: "Verify Soil Test & Contour DWG for Lot 408",
      description: "Review surveyor CAD levels and check drop edge beam requirements for rear fall before final engineering sign-off.",
      type: "site_visit",
      assignedTo: "ben_grill",
      delegatedBy: "Shelley Lay",
      createdBy: "Shelley Lay",
      completed: false,
      priority: "normal",
      slaDays: 2,
      dueAt: calculateEodDeadline(2, now),
      dueDate: "In 2 days",
      createdAt: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      clientName: "Marcus Chen",
      estate: "Yarrabilba",
      designName: "Allure 32",
      tags: ["Site Works", "Contour DWG"],
    },
    {
      id: "shared_task_05_contract_alyssa",
      title: "Prepare Contract Signing Documents - Lot 712 Spring Mountain",
      description: "Priya & Aarav Sharma accepted tender. Assemble HIA building contract schedule, finance annexure, and QBCC consumer guide.",
      type: "contract",
      assignedTo: "alyssa_hales",
      delegatedBy: "Morgan Hales",
      createdBy: "Morgan Hales",
      completed: false,
      priority: "high",
      slaDays: 3,
      dueAt: calculateEodDeadline(3, now),
      dueDate: "In 3 days",
      createdAt: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(),
      clientName: "Priya & Aarav Sharma",
      clientMobile: "0421 990 144",
      estate: "Spring Mountain",
      designName: "Cambridge 28",
      tags: ["Contract", "QBCC"],
    },
    {
      id: "shared_task_06_team_display",
      title: "Display Home Brochure Stock & Price List Distribution",
      description: "Ensure updated Autumn 2026 price lists and double-sided flyers are printed and displayed across Flagstone, Bahrs Scrub, and HomeWorld Warnervale.",
      type: "general",
      assignedTo: "all_team",
      delegatedBy: "Shelley Lay",
      createdBy: "Shelley Lay",
      completed: false,
      priority: "normal",
      slaDays: 5,
      dueAt: calculateEodDeadline(5, now),
      dueDate: "In 5 days",
      createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      tags: ["Displays", "Marketing", "All Team"],
    },
  ];
}

export async function loadSharedTasks(): Promise<CrmTask[]> {
  if (typeof window === "undefined") return getInitialSharedTasks();
  const raw = localStorage.getItem(CRM_SHARED_TASKS_KEY);
  if (!raw) {
    const seeds = getInitialSharedTasks();
    localStorage.setItem(CRM_SHARED_TASKS_KEY, JSON.stringify(seeds));
    return seeds;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return getInitialSharedTasks();
  }
}

export async function saveSharedTasks(tasks: CrmTask[]): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.setItem(CRM_SHARED_TASKS_KEY, JSON.stringify(tasks));
    window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "shared_tasks_updated" } }));
  }
}

export async function loadAllCrmTasks(): Promise<CrmTask[]> {
  const leads = await loadAllCrmLeads();
  const shared = await loadSharedTasks();

  const leadTasks: CrmTask[] = [];
  leads.forEach((l) => {
    (l.tasks || []).forEach((t) => {
      leadTasks.push({
        ...t,
        leadId: l.id,
        clientName: l.clientName,
        clientMobile: l.mobile,
        estate: l.targetEstate,
        lotNumber: l.lotNumber,
        designName: l.preferredDesign,
      });
    });
  });

  return [...shared, ...leadTasks];
}

export async function addCrmTask(task: Omit<CrmTask, "id" | "createdAt">): Promise<void> {
  const newTask: CrmTask = {
    ...task,
    id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
    completed: false,
  };

  if (task.leadId) {
    await addLeadTask(task.leadId, newTask);
  } else {
    const current = await loadSharedTasks();
    await saveSharedTasks([newTask, ...current]);
  }
}

export async function updateCrmTask(
  taskId: string,
  updates: Partial<CrmTask>,
  leadId?: string
): Promise<void> {
  if (leadId) {
    const leads = await loadAllCrmLeads();
    const updated = leads.map((l) => {
      if (l.id === leadId && l.tasks) {
        const nextTasks = l.tasks.map((t) =>
          t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        );
        return { ...l, tasks: nextTasks, updatedAt: new Date().toISOString() };
      }
      return l;
    });
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "task_updated", taskId, leadId } }));
    }
  } else {
    const shared = await loadSharedTasks();
    const next = shared.map((t) =>
      t.id === taskId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
    );
    await saveSharedTasks(next);
  }
}

export async function reassignCrmTask(
  taskId: string,
  newAssignedTo: string,
  delegatedByName?: string,
  leadId?: string
): Promise<void> {
  const auditNote: CrmTaskNote = {
    id: `note_${Date.now()}`,
    author: delegatedByName || "Team Colleague",
    text: `Reassigned task to ${newAssignedTo}`,
    createdAt: new Date().toISOString(),
  };

  const tasks = await loadAllCrmTasks();
  const existing = tasks.find((t) => t.id === taskId);
  const currentNotes = existing?.notes || [];

  await updateCrmTask(
    taskId,
    {
      assignedTo: newAssignedTo,
      delegatedBy: delegatedByName || existing?.delegatedBy,
      notes: [auditNote, ...currentNotes],
    },
    leadId
  );
}

export async function addCrmTaskNote(
  taskId: string,
  noteText: string,
  authorName: string,
  leadId?: string
): Promise<void> {
  const tasks = await loadAllCrmTasks();
  const existing = tasks.find((t) => t.id === taskId);
  if (!existing) return;

  const newNote: CrmTaskNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    author: authorName,
    text: noteText.trim(),
    createdAt: new Date().toISOString(),
  };

  const currentNotes = existing.notes || [];
  await updateCrmTask(taskId, { notes: [newNote, ...currentNotes] }, leadId);
}

export async function toggleCrmTaskChecklist(
  taskId: string,
  checkItemId: string,
  completed: boolean,
  leadId?: string
): Promise<void> {
  const tasks = await loadAllCrmTasks();
  const existing = tasks.find((t) => t.id === taskId);
  if (!existing || !existing.checklist) return;

  const updatedChecklist = existing.checklist.map((item) =>
    item.id === checkItemId ? { ...item, completed } : item
  );

  await updateCrmTask(taskId, { checklist: updatedChecklist }, leadId);
}

export async function deleteCrmTask(taskId: string, leadId?: string): Promise<void> {
  if (leadId) {
    await deleteLeadTask(leadId, taskId);
  } else {
    const shared = await loadSharedTasks();
    const next = shared.filter((t) => t.id !== taskId);
    await saveSharedTasks(next);
  }
}

// -------------------------------------------------------------
// AI Call Assistant & 1-Click LVM (Left Voicemail) Follow-up
// -------------------------------------------------------------

export async function logLeftVoicemail(
  leadId: string,
  consultantName?: string
): Promise<{ updatedLead: CrmLead; lvmSmsBody: string }> {
  const staff = typeof window !== "undefined" ? getActiveStaffUser() : null;
  const actualConsultant = consultantName || staff?.name || "Morgan Hales";
  const list = await loadAllCrmLeads();
  const lead = list.find((l) => l.id === leadId);
  if (!lead) throw new Error("Lead not found");

  const firstName = lead.clientName.split(" ")[0];
  const lvmSmsBody = `Hi ${firstName}, ${actualConsultant} from Hudson Homes here. Tried calling you regarding your ${lead.preferredDesign} package on Lot ${lead.lotNumber} ${lead.targetEstate}. Left a voicemail, feel free to call or text me back when you get a chance!`;

  const newNote: CrmNote = {
    id: `note_${Date.now()}`,
    author: consultantName || actualConsultant || "Morgan Hales",
    content: "📞 [Left Voicemail (LVM)]: Client did not answer. Standard 48-hour follow-up task auto-scheduled.",
    createdAt: new Date().toISOString(),
  };

  const newActivity = {
    id: `act_${Date.now()}`,
    type: "lvm" as const,
    title: "📞 Left Voicemail (LVM)",
    description: "Follow-up task scheduled for 48 hours.",
    timestamp: new Date().toISOString(),
  };

  const newTask: CrmTask = {
    id: `task_${Date.now()}`,
    title: `LVM Follow-up Call: ${lead.clientName} (2nd touchpoint)`,
    dueDate: "In 2 days",
    completed: false,
    assignedTo: lead.assignedConsultantId,
    priority: "high",
    type: "lvm_followup",
    createdAt: new Date().toISOString(),
  };

  const updated: CrmLead = {
    ...lead,
    clientNotes: [newNote, ...(lead.clientNotes || [])],
    activities: [newActivity, ...(lead.activities || [])],
    tasks: [newTask, ...(lead.tasks || [])],
    lastContactedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveCrmLead(updated);
  return { updatedLead: updated, lvmSmsBody };
}

// -------------------------------------------------------------
// Internal Team Chat & Collab Messages
// -------------------------------------------------------------

export async function loadAllTeamMessages(): Promise<CrmTeamMessage[]> {
  try {
    const raw = localStorage.getItem(CRM_TEAM_MESSAGES_KEY);
    if (!raw) {
      localStorage.setItem(CRM_TEAM_MESSAGES_KEY, JSON.stringify(INITIAL_DEMO_TEAM_MESSAGES));
      return INITIAL_DEMO_TEAM_MESSAGES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_TEAM_MESSAGES;
  } catch {
    return INITIAL_DEMO_TEAM_MESSAGES;
  }
}

export async function saveTeamMessage(msg: CrmTeamMessage): Promise<CrmTeamMessage[]> {
  const list = await loadAllTeamMessages();
  const updated = [msg, ...list];
  localStorage.setItem(CRM_TEAM_MESSAGES_KEY, JSON.stringify(updated));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hudson_team_chat_message", { detail: msg }));
  }
  return updated;
}

// -------------------------------------------------------------
// Telnyx Telephony & Messaging Configuration
// -------------------------------------------------------------

export function loadTelnyxSettings(): TelnyxSettings {
  try {
    const raw = localStorage.getItem(TELNYX_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {
    apiKey: "",
    messagingProfileId: "profile_hudson_sms_prod",
    fromPhoneNumber: "0488 888 123",
    connectionStatus: "ready",
    lastTestSmsAt: "Today at 9:15 AM",
  };
}

export function saveTelnyxSettings(settings: TelnyxSettings): void {
  localStorage.setItem(TELNYX_SETTINGS_KEY, JSON.stringify(settings));
}

// -------------------------------------------------------------
// Bulk SMS Dispatcher Engine
// -------------------------------------------------------------

export async function sendBulkSms(
  recipientLeadIds: string[],
  templateBody: string,
  senderName?: string
): Promise<{ sentCount: number; errors: string[] }> {
  const staff = typeof window !== "undefined" ? getActiveStaffUser() : null;
  const actualSender = senderName || staff?.name || "Morgan Hales";
  const allLeads = await loadAllCrmLeads();
  const allMessages = await loadAllCrmMessages();
  let sentCount = 0;
  const errors: string[] = [];
  const newMessages: CrmMessage[] = [];
  const updatedLeadsMap = new Map<string, CrmLead>();

  for (const id of recipientLeadIds) {
    const lead = allLeads.find((l) => l.id === id);
    if (!lead) {
      errors.push(`Lead ${id} not found`);
      continue;
    }
    if (!lead.mobile) {
      errors.push(`${lead.clientName} has no mobile number`);
      continue;
    }

    const firstName = lead.clientName.split(" ")[0];
    const budgetStr = lead.totalEstimatedDealValue
      ? `$${(lead.totalEstimatedDealValue / 1000).toFixed(0)}k`
      : "$450k";

    const personalizedBody = templateBody
      .replace(/{firstName}/g, firstName)
      .replace(/{clientName}/g, lead.clientName)
      .replace(/{estate}/g, lead.targetEstate || "your estate")
      .replace(/{lotNumber}/g, lead.lotNumber || "TBA")
      .replace(/{design}/g, lead.preferredDesign || "your home")
      .replace(/{consultantName}/g, actualSender)
      .replace(/{landStatus}/g, lead.landStatus || "Looking for Land")
      .replace(/{packageBudget}/g, budgetStr)
      .replace(/{dealValue}/g, budgetStr)
      .replace(/{suburb}/g, lead.suburb || "Queensland")
      .replace(/{housingType}/g, lead.housingType || "Single Storey");

    // Outbound SMS message
    const msg: CrmMessage = {
      id: `msg_bulk_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      clientEmail: lead.email || "bulk_sms@hudsonhomes.com.au",
      clientMobile: lead.mobile,
      direction: "outbound",
      channel: "sms",
      senderName: actualSender,
      recipientName: lead.clientName,
      body: personalizedBody,
      timestamp: new Date().toISOString(),
      isRead: true,
    };
    newMessages.push(msg);

    // Update lead activity & lastContactedAt
    const updatedLead: CrmLead = {
      ...lead,
      lastContactedAt: new Date().toISOString(),
      activities: [
        {
          id: `act_bulk_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
          type: "sms",
          title: "Bulk SMS Sent",
          description: `SMS: "${personalizedBody.substring(0, 60)}..."`,
          timestamp: new Date().toISOString(),
        },
        ...(lead.activities || []),
      ],
    };
    updatedLeadsMap.set(id, updatedLead);
    sentCount++;
  }

  if (newMessages.length > 0) {
    const combinedMessages = [...newMessages, ...allMessages];
    localStorage.setItem(CRM_MESSAGES_KEY, JSON.stringify(combinedMessages));
  }

  if (updatedLeadsMap.size > 0) {
    const combinedLeads = allLeads.map((l) => updatedLeadsMap.get(l.id) || l);
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(combinedLeads));
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("hudson_crm_change", {
          detail: { action: "bulk_sms", count: sentCount },
        })
      );
    }
  }

  return { sentCount, errors };
}

// -------------------------------------------------------------
// Honey CRM Batch Importer
// -------------------------------------------------------------

export async function importHoneyContacts(
  importedLeads: Partial<CrmLead>[],
  defaultConsultantId: string = "morgan_hales"
): Promise<{ addedCount: number; allLeads: CrmLead[] }> {
  const existingList = await loadAllCrmLeads();
  const newLeads: CrmLead[] = [];

  for (const item of importedLeads) {
    if (!item.clientName || item.clientName.trim() === "") continue;

    // Check duplicate by email or phone or exact name
    const isDup = existingList.some(
      (ex) =>
        (item.email && ex.email.toLowerCase() === item.email.toLowerCase()) ||
        (item.mobile && ex.mobile.replace(/\s+/g, "") === item.mobile.replace(/\s+/g, "")) ||
        ex.clientName.toLowerCase() === item.clientName!.toLowerCase()
    );

    if (isDup) continue;

    const lead: CrmLead = {
      id: item.id || `lead_honey_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      clientName: item.clientName.trim(),
      email: item.email || "",
      mobile: item.mobile || "",
      secondaryCustomerName: item.secondaryCustomerName || "",
      secondaryCustomerMobile: item.secondaryCustomerMobile || "",
      secondaryCustomerEmail: item.secondaryCustomerEmail || "",
      targetEstate: item.targetEstate || "Unspecified Estate",
      suburb: item.suburb || "Queensland",
      lotNumber: item.lotNumber || "TBA",
      landStatus: item.landStatus || "Looking for Land",
      landBudget: item.landBudget || 300000,
      preferredDesign: item.preferredDesign || "Standard Hudson Design",
      facadeName: item.facadeName || "Classic",
      housingType: item.housingType || "Single Storey",
      totalEstimatedDealValue: item.totalEstimatedDealValue || 450000,
      tenderPrice: item.tenderPrice,
      stage: item.stage || "new_lead",
      assignedConsultantId: item.assignedConsultantId || defaultConsultantId,
      leadSource: (item.leadSource as any) || "Website Inquiry",
      notes: item.notes || "Imported from Honey CRM contact export.",
      isAtpSigned: !!item.isAtpSigned,
      atpFeePaid: !!item.atpFeePaid,
      isContractSigned: !!item.isContractSigned,
      contractDepositPaid: !!item.contractDepositPaid,
      clientNotes: item.clientNotes || [
        {
          id: `note_honey_${Date.now()}`,
          author: "Honey CRM Import",
          content: "Contact batch-imported from Honey CRM records.",
          createdAt: new Date().toISOString(),
        },
      ],
      tasks: item.tasks || [
        {
          id: `task_honey_${Date.now()}`,
          title: `Initial follow-up call with ${item.clientName}`,
          dueDate: "Tomorrow",
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ],
      activities: item.activities || [
        {
          id: `act_honey_${Date.now()}`,
          type: "status_change",
          title: "Imported from Honey CRM",
          description: "Contact created in Hudson Horizon CRM.",
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContactedAt: new Date().toISOString(),
    };

    newLeads.push(lead);
  }

  const combined = [...newLeads, ...existingList];
  localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(combined));
  return { addedCount: newLeads.length, allLeads: combined };
}

// -------------------------------------------------------------
// Auto-Sync from Quoting Tool to CRM
// -------------------------------------------------------------

export async function upsertLeadFromQuote(quote: FullQuote): Promise<CrmLead[]> {
  if (!quote.client.clientName || quote.client.clientName.trim() === "") {
    return loadAllCrmLeads();
  }

  const list = await loadAllCrmLeads();
  const searchName = quote.client.clientName.trim().toLowerCase();
  const searchPhone = (quote.client.clientPhone || "").replace(/\s+/g, "");
  const searchEmail = (quote.client.clientEmail || "").trim().toLowerCase();

  // Resolve assigned consultant ID normalized to Hudson CRM ID schema
  const staff = typeof window !== "undefined" ? getActiveStaffUser() : null;
  const rawConsultant =
    quote.client.consultantId ||
    staff?.id ||
    quote.client.consultantEmail ||
    quote.client.consultantName ||
    "morgan_hales";
  const consultantKey = normalizeConsultantId(rawConsultant);

  const matchIdx = list.findIndex((l) => {
    if (quote.quoteNumber && l.linkedQuoteNumber === quote.quoteNumber) return true;
    if (searchEmail && l.email && l.email.toLowerCase() === searchEmail) return true;
    if (searchPhone && l.mobile && l.mobile.replace(/\s+/g, "") === searchPhone) return true;
    return l.clientName.toLowerCase() === searchName;
  });

  const dealVal =
    quote.totals?.totalPriceIncGst ||
    quote.pricing?.grossEstimatedInvestment ||
    quote.design.basePrice ||
    450000;
  const designName = quote.design.designName
    ? `${quote.design.designName} (${quote.design.housingType})`
    : "Custom Design";

  if (matchIdx >= 0) {
    const existing = list[matchIdx];
    const newActivities = [...(existing.activities || [])];
    newActivities.unshift({
      id: `act_${Date.now()}`,
      type: "quote",
      title: `Estimate Updated #${quote.quoteNumber || "MH"}`,
      description: `${designName} total: $${dealVal.toLocaleString()} with ${quote.design.specTier || "Inclusions"}.`,
      timestamp: new Date().toISOString(),
    });

    const updated: CrmLead = {
      ...existing,
      clientName: quote.client.clientName.trim(),
      mobile: quote.client.clientPhone || existing.mobile,
      email: quote.client.clientEmail || existing.email,
      secondaryCustomerName: quote.client.hasClient2 ? quote.client.client2Name : existing.secondaryCustomerName,
      secondaryCustomerMobile: quote.client.hasClient2 ? quote.client.client2Phone : existing.secondaryCustomerMobile,
      secondaryCustomerEmail: quote.client.hasClient2 ? quote.client.client2Email : existing.secondaryCustomerEmail,
      targetEstate: quote.client.estate || existing.targetEstate,
      suburb: quote.client.suburb || existing.suburb,
      lotNumber: quote.client.lotNumber || existing.lotNumber,
      preferredDesign: quote.design.designName || existing.preferredDesign,
      facadeName: quote.design.facadeName || existing.facadeName,
      housingType: (quote.design.housingType as any) || existing.housingType,
      totalEstimatedDealValue: dealVal,
      linkedQuoteNumber: quote.quoteNumber,
      assignedConsultantId: consultantKey || existing.assignedConsultantId,
      activities: newActivities,
      updatedAt: new Date().toISOString(),
    };

    list[matchIdx] = updated;
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(list));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "update", lead: updated } }));
    }
    return list;
  } else {
    const newLead: CrmLead = {
      id: `lead_quote_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      clientName: quote.client.clientName.trim(),
      email: quote.client.clientEmail || "",
      mobile: quote.client.clientPhone || "",
      secondaryCustomerName: quote.client.hasClient2 ? quote.client.client2Name : undefined,
      secondaryCustomerMobile: quote.client.hasClient2 ? quote.client.client2Phone : undefined,
      secondaryCustomerEmail: quote.client.hasClient2 ? quote.client.client2Email : undefined,
      targetEstate: quote.client.estate || "Estate TBA",
      suburb: quote.client.suburb || "Queensland",
      lotNumber: quote.client.lotNumber || "TBA",
      landStatus: "Looking for Land",
      landBudget: 300000,
      preferredDesign: quote.design.designName || "Hudson Home",
      facadeName: quote.design.facadeName || "Classic",
      housingType: (quote.design.housingType as any) || "Single Storey",
      totalEstimatedDealValue: dealVal,
      stage: "estimate_presented",
      assignedConsultantId: consultantKey,
      leadSource: "Quoting System" as any,
      notes: quote.client.notes || `Generated from Hudson Quoting Tool Estimate #${quote.quoteNumber}.`,
      linkedQuoteNumber: quote.quoteNumber,
      isAtpSigned: false,
      atpFeePaid: false,
      isContractSigned: false,
      contractDepositPaid: false,
      clientNotes: [
        {
          id: `cn_${Date.now()}`,
          author: quote.client.consultantName || staff?.name || "Sales Consultant",
          content: `Initial Builders Estimate #${quote.quoteNumber} created for ${designName}.`,
          createdAt: new Date().toISOString(),
        },
      ],
      tasks: [
        {
          id: `task_${Date.now()}`,
          title: `Follow up ${quote.client.clientName} on Estimate #${quote.quoteNumber}`,
          dueDate: "In 2 days",
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ],
      activities: [
        {
          id: `act_${Date.now()}`,
          type: "quote",
          title: `Estimate #${quote.quoteNumber} Created`,
          description: `${designName} estimate total: $${dealVal.toLocaleString()}.`,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastContactedAt: new Date().toISOString(),
    };

    const combined = [newLead, ...list];
    localStorage.setItem(CRM_STORAGE_KEY, JSON.stringify(combined));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hudson_crm_change", { detail: { action: "create", lead: newLead } }));
    }
    return combined;
  }
}

// -------------------------------------------------------------
// Messages & Communications Storage
// -------------------------------------------------------------

export async function loadAllCrmMessages(): Promise<CrmMessage[]> {
  try {
    const raw = localStorage.getItem(CRM_MESSAGES_KEY);
    if (!raw) {
      localStorage.setItem(CRM_MESSAGES_KEY, JSON.stringify(INITIAL_DEMO_MESSAGES));
      return INITIAL_DEMO_MESSAGES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DEMO_MESSAGES;
  } catch {
    return INITIAL_DEMO_MESSAGES;
  }
}

export async function saveCrmMessage(msg: CrmMessage): Promise<CrmMessage[]> {
  const list = await loadAllCrmMessages();
  const updated = [msg, ...list];
  localStorage.setItem(CRM_MESSAGES_KEY, JSON.stringify(updated));
  return updated;
}

export function getOutlookSyncStatus(): { synced: boolean; count: number; lastSync: string } {
  try {
    const raw = localStorage.getItem(OUTLOOK_SYNC_KEY);
    if (!raw) return { synced: true, count: 14, lastSync: "Ready to Sync" };
    return JSON.parse(raw);
  } catch {
    return { synced: true, count: 14, lastSync: "Ready to Sync" };
  }
}

export function triggerOutlookSync(): { synced: boolean; count: number; lastSync: string } {
  const current = getOutlookSyncStatus();
  const updated = {
    synced: true,
    count: current.count + 3,
    lastSync: "Just now (Synced)",
  };
  localStorage.setItem(OUTLOOK_SYNC_KEY, JSON.stringify(updated));
  return updated;
}

// -------------------------------------------------------------
// Consultant Private Salary & Commission Settings
// -------------------------------------------------------------

export interface ConsultantPrivateSettings {
  baseSalaryYearly: number;
  commissionRatePct: number;
}

export function loadConsultantSettings(consultantId: string): ConsultantPrivateSettings {
  try {
    const raw = localStorage.getItem(`${CONSULTANT_SETTINGS_KEY}_${consultantId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { baseSalaryYearly: 75000, commissionRatePct: 2.25 };
}

export function saveConsultantSettings(
  consultantId: string,
  settings: ConsultantPrivateSettings
): void {
  localStorage.setItem(`${CONSULTANT_SETTINGS_KEY}_${consultantId}`, JSON.stringify(settings));
}

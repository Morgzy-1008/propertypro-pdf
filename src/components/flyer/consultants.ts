export interface Consultant {
  id: string;
  name: string;
  phone: string;
  email: string;
  title: string;
  displayCentre: string;
  state?: "QLD" | "NSW";
  division?: "QLD" | "NSW";
}

/** Active New Home Sales Consultants for House & Land and Flyer Studio */
export const CONSULTANTS: Consultant[] = [
  {
    id: "morgan-hales",
    name: "Morgan Hales",
    phone: "0417 571 864",
    email: "Morgan.hales@hudsonhomes.com.au",
    title: "Senior New Home Consultant & System Admin",
    displayCentre: "Flagstone Display Home",
    division: "QLD",
    state: "QLD",
  },
  {
    id: "jesse-jenkins",
    name: "Jesse Jenkins",
    phone: "0431 292 123",
    email: "Jesse.jenkins@hudsonhomes.com.au",
    title: "New Home Consultant",
    displayCentre: "Lilywood Landings Display Home",
    division: "QLD",
    state: "QLD",
  },
  {
    id: "adrian-baxter",
    name: "Adrian Baxter",
    phone: "0419 232 955",
    email: "Adrian.baxter@hudsonhomes.com.au",
    title: "New Home Consultant",
    displayCentre: "Bahrs Scrub Display Home",
    division: "QLD",
    state: "QLD",
  },
  {
    id: "gary-rees",
    name: "Gary Rees",
    phone: "0429 850 465",
    email: "Gary.rees@hudsonhomes.com.au",
    title: "New Home Sales Consultant",
    displayCentre: "Watagan Park Display",
    division: "NSW",
    state: "NSW",
  },
  {
    id: "steve-silsar",
    name: "Steve Silsar",
    phone: "0483 950 830",
    email: "Steve.silsar@hudsonhomes.com.au",
    title: "New Home Sales Consultant",
    displayCentre: "HomeWorld Warnervale Display",
    division: "NSW",
    state: "NSW",
  },
  {
    id: "christine-hunt",
    name: "Christine Hunt",
    phone: "0483 988 125",
    email: "Christine.hunt@hudsonhomes.com.au",
    title: "New Home Sales Consultant",
    displayCentre: "Oran Park Display",
    division: "NSW",
    state: "NSW",
  },
  {
    id: "aaron-martin",
    name: "Aaron Martin",
    phone: "0483 936 841",
    email: "Aaron.martin@hudsonhomes.com.au",
    title: "New Home Sales Consultant",
    displayCentre: "85 George Street, Parramatta, NSW",
    division: "NSW",
    state: "NSW",
  },
];

/** Full staff consultant directory for backward compatibility and profile resolution */
export const ALL_STAFF_CONSULTANTS: Consultant[] = [
  ...CONSULTANTS,
  {
    id: "alyssa-hales",
    name: "Alyssa Hales",
    phone: "0480 893 290",
    email: "Alyssa.hales@hudsonhomes.com.au",
    title: "New Home Consultant",
    displayCentre: "Queensland Division",
    division: "QLD",
    state: "QLD",
  },
  {
    id: "shelley-lay",
    name: "Shelley Lay",
    phone: "0428 650 617",
    email: "Shelley.lay@hudsonhomes.com.au",
    title: "QLD & NSW Sales Manager",
    displayCentre: "Queensland & New South Wales Divisions",
    division: "QLD",
    state: "QLD",
  },
  {
    id: "ben-grill",
    name: "Ben Grill",
    phone: "0468 092 034",
    email: "Ben.grill@hudsonhomes.com.au",
    title: "New Home Sales Associate",
    displayCentre: "Queensland Division",
    division: "QLD",
    state: "QLD",
  },
];

export function findConsultant(id: string) {
  return CONSULTANTS.find((c) => c.id === id) || ALL_STAFF_CONSULTANTS.find((c) => c.id === id);
}

export function findConsultantByEmail(email?: string | null): Consultant | undefined {
  if (!email) return undefined;
  const clean = email.trim().toLowerCase();
  return CONSULTANTS.find((c) => c.email.toLowerCase() === clean) || ALL_STAFF_CONSULTANTS.find((c) => c.email.toLowerCase() === clean);
}

/** vCard payload used for the "scan to save my details" QR code. */
export function consultantVCard(c: {
  name: string;
  phone: string;
  email: string;
  office?: string;
  website?: string;
}) {
  const parts = (c.name || "Morgan Hales").trim().split(/\s+/);
  const first = parts[0] || "";
  const last = parts.slice(1).join(" ") || "";
  const cleanPhone = (c.phone || "").replace(/[^\d+]/g, "");

  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${last};${first};;;`,
    `FN:${c.name || "Morgan Hales"}`,
    "ORG:Hudson Homes",
    "TITLE:New Home Consultant",
    `TEL;TYPE=CELL,VOICE:${cleanPhone}`,
    `EMAIL;TYPE=INTERNET,WORK:${c.email || ""}`,
    c.office ? `NOTE:${c.office}` : "",
    "URL:https://www.hudsonhomes.com.au",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\r\n");
}

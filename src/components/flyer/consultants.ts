export interface Consultant {
  id: string;
  name: string;
  phone: string;
  email: string;
  title: string;
  displayCentre: string;
}

/** New Home Consultants available to be shown in the flyer footer. */
export const CONSULTANTS: Consultant[] = [
  {
    id: "morgan-hales",
    name: "Morgan Hales",
    phone: "0417 571 864",
    email: "Morgan.hales@hudsonhomes.com.au",
    title: "New Home Consultant",
    displayCentre: "Flagstone Display Home",
  },
  {
    id: "jesse-jenkins",
    name: "Jesse Jenkins",
    phone: "0431 292 123",
    email: "Jesse.jenkins@hudsonhomes.com.au",
    title: "New Home Consultant",
    displayCentre: "Lilywood Landings Display Home",
  },
  {
    id: "adrian-baxter",
    name: "Adrian Baxter",
    phone: "0419 232 955",
    email: "Adrian.baxter@hudsonhomes.com.au",
    title: "New Home Consultant",
    displayCentre: "Bahrs Scrub Display Home",
  },
  {
    id: "alyssa-hales",
    name: "Alyssa Hales",
    phone: "0480 893 290",
    email: "Alyssa.hales@hudsonhomes.com.au",
    title: "New Home Consultant",
    displayCentre: "Queensland Division",
  },
  {
    id: "shelley-lay",
    name: "Shelley Lay",
    phone: "0428 650 617",
    email: "Shelley.lay@hudsonhomes.com.au",
    title: "New Home Consultant",
    displayCentre: "Queensland Division",
  },
  {
    id: "ben-grill",
    name: "Ben Grill",
    phone: "0400 000 000",
    email: "Ben.grill@hudsonhomes.com.au",
    title: "New Home Sales Associate",
    displayCentre: "Queensland Division",
  },
];

export function findConsultant(id: string) {
  return CONSULTANTS.find((c) => c.id === id);
}

export function findConsultantByEmail(email?: string | null): Consultant | undefined {
  if (!email) return undefined;
  const clean = email.trim().toLowerCase();
  return CONSULTANTS.find((c) => c.email.toLowerCase() === clean);
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

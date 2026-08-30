import { supabase } from "@/integrations/supabase/client";
import { HUDSON_FACADES } from "@/components/flyer/facades.data";
import { plansForDesign } from "@/components/flyer/floorplans";

export interface PublicLot {
  estate: string;
  suburb: string;
  lotNumber: string | null;
  address: string | null;
  landSize: number | null;
  frontage: number | null;
  landPrice: number | null;
  titled: boolean;
  registrationDate: string | null;
  developer: string | null;
  developerContactName: string | null;
  developerContactPhone: string | null;
  developerContactEmail: string | null;
}

export interface PublicPackage {
  id: string;
  name: string;
  design: string;
  housingType: string;
  facadeName: string | null;
  facadeUrl?: string | null;
  floorplanUrl?: string | null;
  rangeLabel: string;
  estate: string;
  suburb: string;
  address: string | null;
  beds: string | null;
  baths: string | null;
  cars: string | null;
  homeSize: string | null;
  landSize: number | null;
  frontage?: number | null;
  housePrice?: number | null;
  landPrice?: number | null;
  totalPrice: number | null;
  consultantName: string | null;
  consultantPhone: string | null;
  consultantEmail: string | null;
  consultantOffice: string | null;
  flyerJson?: string | null;
}

export function determineHousingType(designName: string, explicitType?: string | null): string {
  if (explicitType) {
    const norm = explicitType.toLowerCase();
    if (norm.includes("double") || norm.includes("two") || norm.includes("2 storey") || norm.includes("2 story")) {
      return "Double Storey";
    }
    if (norm.includes("split")) return "Split Level";
    if (norm.includes("dual") || norm.includes("duplex")) return "Dual Living";
    if (norm.includes("acreage") || norm.includes("ranch") || norm.includes("mulberry")) return "Acreage";
    if (norm.includes("single") || norm.includes("one") || norm.includes("1 storey") || norm.includes("1 story")) {
      return "Single Storey";
    }
  }

  const d = (designName || "").toLowerCase();
  if (d.includes("mulberry") || d.includes("ranch") || d.includes("acreage")) {
    return "Acreage";
  }
  if (d.includes("two story") || d.includes("two storey") || d.includes("double")) {
    return "Double Storey";
  }
  if (
    d.includes("split") ||
    d.includes("highview") ||
    d.includes("hilltop") ||
    d.includes("horizon") ||
    d.includes("outlook") ||
    d.includes("panorama") ||
    d.includes("ridgeview") ||
    d.includes("summit") ||
    d.includes("valleyview") ||
    d.includes("vista")
  ) {
    return "Split Level";
  }
  if (
    d.includes("dual") ||
    d.includes("duet") ||
    d.includes("harmony") ||
    d.includes("matrix") ||
    d.includes("symphony") ||
    d.includes("twin") ||
    d.includes("unity") ||
    d.includes("alabaster") ||
    d.includes("cayene") ||
    d.includes("magnolia") ||
    d.includes("maize") ||
    d.includes("raven") ||
    d.includes("teal") ||
    d.includes("wisteria")
  ) {
    if (d.includes("two story") || d.includes("two storey")) return "Double Storey";
    return "Dual Living";
  }
  if (
    d.includes("amethyst") ||
    d.includes("aquamarine") ||
    d.includes("ashton") ||
    d.includes("allure") ||
    d.includes("beryl") ||
    d.includes("citrine") ||
    d.includes("fluorite") ||
    d.includes("heliodor") ||
    d.includes("iolite") ||
    d.includes("jasper 26") ||
    d.includes("morganite") ||
    d.includes("onyx") ||
    d.includes("peridot") ||
    d.includes("spinel") ||
    d.includes("tanzanite") ||
    d.includes("tourmaline") ||
    d.includes("zircon") ||
    d.includes("lime") ||
    d.includes("mahogany") ||
    d.includes("ruby 26") ||
    d.includes("sabel") ||
    d.includes("tangerine") ||
    d.includes("terracotta 36") ||
    d.includes("turquoise")
  ) {
    return "Double Storey";
  }

  return "Single Storey";
}

function str(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  return s.length ? s : null;
}

import { findFacadeForDesign } from "./quoting/facadeLookup";

function findFacadeUrl(nameOrId: string | null | undefined, housingType?: string): string {
  if (!nameOrId) return HUDSON_FACADES[0]?.url || "";
  const isDouble = (housingType || "").toLowerCase().includes("double");
  const match = findFacadeForDesign(nameOrId, isDouble, housingType);
  return match?.url || HUDSON_FACADES[0]?.url || "";
}

export async function listPublicLots(): Promise<PublicLot[]> {
  try {
    const { data: rows, error } = await supabase
      .from("land_lots")
      .select(
        "estate, suburb, lot_number, address, land_size, frontage, land_price, titled, registration_date, developer, developer_contact_name, developer_contact_phone, developer_contact_email, status"
      )
      .neq("status", "sold");

    if (error || !rows || rows.length === 0) {
      return [];
    }

    return rows.map((r) => ({
      estate: r.estate || "Queensland",
      suburb: r.suburb || "",
      lotNumber: r.lot_number,
      address: r.address,
      landSize: r.land_size == null ? null : Number(r.land_size),
      frontage: r.frontage == null ? null : Number(r.frontage),
      landPrice: r.land_price == null ? null : Number(r.land_price),
      titled: Boolean(r.titled),
      registrationDate: r.registration_date,
      developer: r.developer,
      developerContactName: r.developer_contact_name,
      developerContactPhone: r.developer_contact_phone,
      developerContactEmail: r.developer_contact_email,
    }));
  } catch (err) {
    console.error("[listPublicLots] Exception:", err);
    return [];
  }
}

export const CURRENT_DATABASE_PACKAGES: PublicPackage[] = [
  {
    id: "pkg-turquoise-24-brookhaven",
    name: "Turquoise 24 · Brookhaven",
    design: "Turquoise 24",
    housingType: "Single Storey",
    facadeName: "Classic (Double Garage)",
    facadeUrl: findFacadeUrl("Classic") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Classic-Facade-Single-Storey.jpg",
    floorplanUrl: plansForDesign("Turquoise 24")[0]?.url || "",
    rangeLabel: "Value",
    estate: "Brookhaven",
    suburb: "Bahrs Scrub",
    address: "Brookhaven, Bahrs Scrub QLD 4207",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "228.5",
    landSize: 480,
    frontage: 15,
    housePrice: 465400,
    landPrice: 524000,
    totalPrice: 989400,
    consultantName: "Adrian Baxter",
    consultantPhone: "0419 232 955",
    consultantEmail: "Adrian.baxter@hudsonhomes.com.au",
    consultantOffice: "Bahrs Scrub Display Home",
    flyerJson: JSON.stringify({
      id: "pkg-turquoise-24-brookhaven",
      packageId: "pkg-turquoise-24-brookhaven",
      estate: "Brookhaven",
      suburb: "Bahrs Scrub",
      address: "Brookhaven, Bahrs Scrub QLD 4207",
      housingType: "Single Storey",
      designName: "Turquoise 24",
      range: "value",
      facadeName: "Classic (Double Garage)",
      facadeUrl: findFacadeUrl("Classic") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Classic-Facade-Single-Storey.jpg",
      floorplanUrl: plansForDesign("Turquoise 24")[0]?.url || "",
      housePrice: "$465,400",
      landPrice: "$524,000",
      price: "$989,400",
      beds: "4",
      baths: "2",
      cars: "2",
      floorplanSize: "228.5",
      landSize: "480",
      landFrontage: "15",
      headline: "House & Land Package",
      contactName: "Adrian Baxter",
      contactPhone: "0419 232 955",
      contactEmail: "Adrian.baxter@hudsonhomes.com.au",
      contactOffice: "Bahrs Scrub Display Home",
      consultantId: "adrian-baxter",
    }),
  },
  {
    id: "pkg-azure-21-lilywood",
    name: "Azure 21 · Lilywood Landings",
    design: "Azure 21",
    housingType: "Single Storey",
    facadeName: "Bayside",
    facadeUrl: findFacadeUrl("Bayside") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Bayside-Facade-Single-Storey.jpg",
    floorplanUrl: plansForDesign("Azure 21")[0]?.url || "",
    rangeLabel: "Value",
    estate: "Lilywood Landings",
    suburb: "Lilywood",
    address: "Lilywood Landings, Lilywood QLD 4506",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "201.2",
    landSize: 450,
    frontage: 14,
    housePrice: 343600,
    landPrice: 560000,
    totalPrice: 903600,
    consultantName: "Jesse Jenkins",
    consultantPhone: "0431 292 123",
    consultantEmail: "Jesse.jenkins@hudsonhomes.com.au",
    consultantOffice: "Lilywood Landings Display Home",
    flyerJson: JSON.stringify({
      id: "pkg-azure-21-lilywood",
      packageId: "pkg-azure-21-lilywood",
      estate: "Lilywood Landings",
      suburb: "Lilywood",
      address: "Lilywood Landings, Lilywood QLD 4506",
      housingType: "Single Storey",
      designName: "Azure 21",
      range: "value",
      facadeName: "Bayside",
      facadeUrl: findFacadeUrl("Bayside") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Bayside-Facade-Single-Storey.jpg",
      floorplanUrl: plansForDesign("Azure 21")[0]?.url || "",
      housePrice: "$343,600",
      landPrice: "$560,000",
      price: "$903,600",
      beds: "4",
      baths: "2",
      cars: "2",
      floorplanSize: "201.2",
      landSize: "450",
      landFrontage: "14",
      headline: "House & Land Package",
      contactName: "Jesse Jenkins",
      contactPhone: "0431 292 123",
      contactEmail: "Jesse.jenkins@hudsonhomes.com.au",
      contactOffice: "Lilywood Landings Display Home",
      consultantId: "jesse-jenkins",
    }),
  },
  {
    id: "pkg-quartz-21-lilywood",
    name: "Quartz 21 · Lilywood Landings",
    design: "Quartz 21",
    housingType: "Single Storey",
    facadeName: "Breeze",
    facadeUrl: findFacadeUrl("Breeze") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Breeze-Facade-Single-Storey.jpg",
    floorplanUrl: plansForDesign("Quartz 21")[0]?.url || "",
    rangeLabel: "Value",
    estate: "Lilywood Landings",
    suburb: "Lilywood",
    address: "Lilywood Landings, Lilywood QLD 4506",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "201.5",
    landSize: 450,
    frontage: 14,
    housePrice: 345600,
    landPrice: 520000,
    totalPrice: 865600,
    consultantName: "Jesse Jenkins",
    consultantPhone: "0431 292 123",
    consultantEmail: "Jesse.jenkins@hudsonhomes.com.au",
    consultantOffice: "Lilywood Landings Display Home",
    flyerJson: JSON.stringify({
      id: "pkg-quartz-21-lilywood",
      packageId: "pkg-quartz-21-lilywood",
      estate: "Lilywood Landings",
      suburb: "Lilywood",
      address: "Lilywood Landings, Lilywood QLD 4506",
      housingType: "Single Storey",
      designName: "Quartz 21",
      range: "value",
      facadeName: "Breeze",
      facadeUrl: findFacadeUrl("Breeze") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Breeze-Facade-Single-Storey.jpg",
      floorplanUrl: plansForDesign("Quartz 21")[0]?.url || "",
      housePrice: "$345,600",
      landPrice: "$520,000",
      price: "$865,600",
      beds: "4",
      baths: "2",
      cars: "2",
      floorplanSize: "201.5",
      landSize: "450",
      landFrontage: "14",
      headline: "House & Land Package",
      contactName: "Jesse Jenkins",
      contactPhone: "0431 292 123",
      contactEmail: "Jesse.jenkins@hudsonhomes.com.au",
      contactOffice: "Lilywood Landings Display Home",
      consultantId: "jesse-jenkins",
    }),
  },
  {
    id: "pkg-terracotta-25-lilywood",
    name: "Terracotta 25 · Lilywood Landings",
    design: "Terracotta 25",
    housingType: "Double Storey",
    facadeName: "Allure",
    facadeUrl: "/facades/allure_widescreen.jpg",
    floorplanUrl: plansForDesign("Terracotta 25")[0]?.url || "",
    rangeLabel: "Designer",
    estate: "Lilywood Landings",
    suburb: "Lilywood",
    address: "Lilywood Landings, Lilywood QLD 4506",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "235.8",
    landSize: 450,
    frontage: 14,
    housePrice: 613300,
    landPrice: 520000,
    totalPrice: 1133300,
    consultantName: "Jesse Jenkins",
    consultantPhone: "0431 292 123",
    consultantEmail: "Jesse.jenkins@hudsonhomes.com.au",
    consultantOffice: "Lilywood Landings Display Home",
    flyerJson: JSON.stringify({
      id: "pkg-terracotta-25-lilywood",
      packageId: "pkg-terracotta-25-lilywood",
      estate: "Lilywood Landings",
      suburb: "Lilywood",
      address: "Lilywood Landings, Lilywood QLD 4506",
      housingType: "Double Storey",
      designName: "Terracotta 25",
      range: "designer",
      facadeName: "Allure",
      facadeUrl: "/facades/allure_widescreen.jpg",
      floorplanUrl: plansForDesign("Terracotta 25")[0]?.url || "",
      housePrice: "$613,300",
      landPrice: "$520,000",
      price: "$1,133,300",
      beds: "4",
      baths: "2",
      cars: "2",
      floorplanSize: "235.8",
      landSize: "450",
      landFrontage: "14",
      headline: "House & Land Package",
      contactName: "Jesse Jenkins",
      contactPhone: "0431 292 123",
      contactEmail: "Jesse.jenkins@hudsonhomes.com.au",
      contactOffice: "Lilywood Landings Display Home",
      consultantId: "jesse-jenkins",
    }),
  },
  {
    id: "pkg-terracotta-25-flagstone",
    name: "Terracotta 25 · Flagstone",
    design: "Terracotta 25",
    housingType: "Double Storey",
    facadeName: "Contemporary",
    facadeUrl: "/facades/contemporary_widescreen.jpg",
    floorplanUrl: plansForDesign("Terracotta 25")[0]?.url || "",
    rangeLabel: "Designer",
    estate: "Flagstone",
    suburb: "Flagstone",
    address: "Flagstone, Flagstone QLD 4280",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "235.8",
    landSize: 420,
    frontage: 14,
    housePrice: 526600,
    landPrice: 449000,
    totalPrice: 975600,
    consultantName: "Morgan Hales",
    consultantPhone: "0417 571 864",
    consultantEmail: "Morgan.hales@hudsonhomes.com.au",
    consultantOffice: "Flagstone Display Home",
    flyerJson: JSON.stringify({
      id: "pkg-terracotta-25-flagstone",
      packageId: "pkg-terracotta-25-flagstone",
      estate: "Flagstone",
      suburb: "Flagstone",
      address: "Flagstone, Flagstone QLD 4280",
      housingType: "Double Storey",
      designName: "Terracotta 25",
      range: "designer",
      facadeName: "Contemporary",
      facadeUrl: "/facades/contemporary_widescreen.jpg",
      floorplanUrl: plansForDesign("Terracotta 25")[0]?.url || "",
      housePrice: "$526,600",
      landPrice: "$449,000",
      price: "$975,600",
      beds: "4",
      baths: "2",
      cars: "2",
      floorplanSize: "235.8",
      landSize: "420",
      landFrontage: "14",
      headline: "House & Land Package",
      contactName: "Morgan Hales",
      contactPhone: "0417 571 864",
      contactEmail: "Morgan.hales@hudsonhomes.com.au",
      contactOffice: "Flagstone Display Home",
      consultantId: "morgan-hales",
    }),
  },
  {
    id: "pkg-quartz-21-brookhaven",
    name: "Quartz 21 · Brookhaven",
    design: "Quartz 21",
    housingType: "Single Storey",
    facadeName: "Avalon",
    facadeUrl: findFacadeUrl("Avalon") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Avalon-Facade-Single-Storey.jpg",
    floorplanUrl: plansForDesign("Quartz 21")[0]?.url || "",
    rangeLabel: "Designer",
    estate: "Brookhaven",
    suburb: "Bahrs Scrub",
    address: "Brookhaven, Bahrs Scrub QLD 4207",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "201.5",
    landSize: 480,
    frontage: 15,
    housePrice: 396300,
    landPrice: 554000,
    totalPrice: 950300,
    consultantName: "Adrian Baxter",
    consultantPhone: "0419 232 955",
    consultantEmail: "Adrian.baxter@hudsonhomes.com.au",
    consultantOffice: "Bahrs Scrub Display Home",
    flyerJson: JSON.stringify({
      id: "pkg-quartz-21-brookhaven",
      packageId: "pkg-quartz-21-brookhaven",
      estate: "Brookhaven",
      suburb: "Bahrs Scrub",
      address: "Brookhaven, Bahrs Scrub QLD 4207",
      housingType: "Single Storey",
      designName: "Quartz 21",
      range: "designer",
      facadeName: "Avalon",
      facadeUrl: findFacadeUrl("Avalon") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Avalon-Facade-Single-Storey.jpg",
      floorplanUrl: plansForDesign("Quartz 21")[0]?.url || "",
      housePrice: "$396,300",
      landPrice: "$554,000",
      price: "$950,300",
      beds: "4",
      baths: "2",
      cars: "2",
      floorplanSize: "201.5",
      landSize: "480",
      landFrontage: "15",
      headline: "House & Land Package",
      contactName: "Adrian Baxter",
      contactPhone: "0419 232 955",
      contactEmail: "Adrian.baxter@hudsonhomes.com.au",
      contactOffice: "Bahrs Scrub Display Home",
      consultantId: "adrian-baxter",
    }),
  },
  {
    id: "pkg-quartz-21-flagstone",
    name: "Quartz 21 · Flagstone",
    design: "Quartz 21",
    housingType: "Single Storey",
    facadeName: "Pavilion",
    facadeUrl: findFacadeUrl("Pavilion") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Pavilion-Facade-Single-Storey.jpg",
    floorplanUrl: plansForDesign("Quartz 21")[0]?.url || "",
    rangeLabel: "Designer",
    estate: "Flagstone",
    suburb: "Flagstone",
    address: "Flagstone, Flagstone QLD 4280",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "201.5",
    landSize: 420,
    frontage: 14,
    housePrice: 399800,
    landPrice: 449000,
    totalPrice: 848800,
    consultantName: "Morgan Hales",
    consultantPhone: "0417 571 864",
    consultantEmail: "Morgan.hales@hudsonhomes.com.au",
    consultantOffice: "Flagstone Display Home",
    flyerJson: JSON.stringify({
      id: "pkg-quartz-21-flagstone",
      packageId: "pkg-quartz-21-flagstone",
      estate: "Flagstone",
      suburb: "Flagstone",
      address: "Flagstone, Flagstone QLD 4280",
      housingType: "Single Storey",
      designName: "Quartz 21",
      range: "designer",
      facadeName: "Pavilion",
      facadeUrl: findFacadeUrl("Pavilion") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Pavilion-Facade-Single-Storey.jpg",
      floorplanUrl: plansForDesign("Quartz 21")[0]?.url || "",
      housePrice: "$399,800",
      landPrice: "$449,000",
      price: "$848,800",
      beds: "4",
      baths: "2",
      cars: "2",
      floorplanSize: "201.5",
      landSize: "420",
      landFrontage: "14",
      headline: "House & Land Package",
      contactName: "Morgan Hales",
      contactPhone: "0417 571 864",
      contactEmail: "Morgan.hales@hudsonhomes.com.au",
      contactOffice: "Flagstone Display Home",
      consultantId: "morgan-hales",
    }),
  },
  {
    id: "pkg-ivory-21-lilywood",
    name: "Ivory 21 · Lilywood Landings",
    design: "Ivory 21",
    housingType: "Single Storey",
    facadeName: "Eden",
    facadeUrl: findFacadeUrl("Eden") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Eden-Facade-Single-Storey.jpg",
    floorplanUrl: plansForDesign("Ivory 21")[0]?.url || "",
    rangeLabel: "Designer",
    estate: "Lilywood Landings",
    suburb: "Lilywood",
    address: "Lilywood Landings, Lilywood QLD 4506",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "201.2",
    landSize: 450,
    frontage: 14,
    housePrice: 408200,
    landPrice: 520000,
    totalPrice: 928200,
    consultantName: "Jesse Jenkins",
    consultantPhone: "0431 292 123",
    consultantEmail: "Jesse.jenkins@hudsonhomes.com.au",
    consultantOffice: "Lilywood Landings Display Home",
    flyerJson: JSON.stringify({
      id: "pkg-ivory-21-lilywood",
      packageId: "pkg-ivory-21-lilywood",
      estate: "Lilywood Landings",
      suburb: "Lilywood",
      address: "Lilywood Landings, Lilywood QLD 4506",
      housingType: "Single Storey",
      designName: "Ivory 21",
      range: "designer",
      facadeName: "Eden",
      facadeUrl: findFacadeUrl("Eden") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Eden-Facade-Single-Storey.jpg",
      floorplanUrl: plansForDesign("Ivory 21")[0]?.url || "",
      housePrice: "$408,200",
      landPrice: "$520,000",
      price: "$928,200",
      beds: "4",
      baths: "2",
      cars: "2",
      floorplanSize: "201.2",
      landSize: "450",
      landFrontage: "14",
      headline: "House & Land Package",
      contactName: "Jesse Jenkins",
      contactPhone: "0431 292 123",
      contactEmail: "Jesse.jenkins@hudsonhomes.com.au",
      contactOffice: "Lilywood Landings Display Home",
      consultantId: "jesse-jenkins",
    }),
  },
  {
    id: "pkg-crimson-24-lilywood",
    name: "Crimson 24 · Lilywood Landings",
    design: "Crimson 24",
    housingType: "Single Storey",
    facadeName: "Serenity",
    facadeUrl: findFacadeUrl("Serenity") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Serenity-Facade-Single-Storey.jpg",
    floorplanUrl: plansForDesign("Crimson 24")[0]?.url || "",
    rangeLabel: "Designer",
    estate: "Lilywood Landings",
    suburb: "Lilywood",
    address: "Lilywood Landings, Lilywood QLD 4506",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "228.6",
    landSize: 480,
    frontage: 15,
    housePrice: 439700,
    landPrice: 560000,
    totalPrice: 999700,
    consultantName: "Jesse Jenkins",
    consultantPhone: "0431 292 123",
    consultantEmail: "Jesse.jenkins@hudsonhomes.com.au",
    consultantOffice: "Lilywood Landings Display Home",
    flyerJson: JSON.stringify({
      id: "pkg-crimson-24-lilywood",
      packageId: "pkg-crimson-24-lilywood",
      estate: "Lilywood Landings",
      suburb: "Lilywood",
      address: "Lilywood Landings, Lilywood QLD 4506",
      housingType: "Single Storey",
      designName: "Crimson 24",
      range: "designer",
      facadeName: "Serenity",
      facadeUrl: findFacadeUrl("Serenity") || "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Serenity-Facade-Single-Storey.jpg",
      floorplanUrl: plansForDesign("Crimson 24")[0]?.url || "",
      housePrice: "$439,700",
      landPrice: "$560,000",
      price: "$999,700",
      beds: "4",
      baths: "2",
      cars: "2",
      floorplanSize: "228.6",
      landSize: "480",
      landFrontage: "15",
      headline: "House & Land Package",
      contactName: "Jesse Jenkins",
      contactPhone: "0431 292 123",
      contactEmail: "Jesse.jenkins@hudsonhomes.com.au",
      contactOffice: "Lilywood Landings Display Home",
      consultantId: "jesse-jenkins",
    }),
  },
];

/**
 * Lists packages available in the database.
 * Merges the current 9 database packages with any additional live Supabase records.
 */
export async function listPublicPackages(): Promise<PublicPackage[]> {
  try {
    let remotePackages: PublicPackage[] = [];

    // 1. Direct Supabase query
    try {
      const [lotRes, pkgRes] = await Promise.all([
        supabase.from("land_lots").select("*").order("created_at", { ascending: false }),
        supabase.from("packages").select("*").order("created_at", { ascending: false }),
      ]);

      const lots = (lotRes.data ?? []) as any[];
      const lotById = new Map(lots.map((l) => [l.id, l]));
      const rawPkgs = (pkgRes.data ?? []) as any[];

      if (rawPkgs.length > 0) {
        remotePackages = rawPkgs
          .filter((p) => p.status !== "sold")
          .map((p) => {
            const lot = p.lot_id ? lotById.get(p.lot_id) : null;
            return formatPublicPackage({ ...p, land_lots: lot });
          });
      }
    } catch {}

    const map = new Map<string, PublicPackage>();
    CURRENT_DATABASE_PACKAGES.forEach((p) => map.set(p.id, p));
    remotePackages.forEach((p) => map.set(p.id, p));

    return Array.from(map.values());
  } catch (err) {
    console.error("[listPublicPackages] Load error:", err);
    return CURRENT_DATABASE_PACKAGES;
  }
}

export function formatPublicPackage(p: any): PublicPackage {
  const f = (p.flyer_data ?? {}) as Record<string, unknown>;
  const lot = p.land_lots;

  const design = p.design || str(f.designName) || "";
  const housingType = determineHousingType(design, p.housing_type || str(f.housingType));
  const estate = lot?.estate || str(f.estate) || "Queensland";
  const suburb = lot?.suburb || str(f.suburb) || "";
  const address = lot?.address || str(f.address) || (lot?.lot_number ? `Lot ${lot.lot_number}` : null);
  const homeSize = p.floorplan_size ? String(p.floorplan_size) : (str(f.homeSize) || str(f.floorplanSize));
  const landSize = lot?.land_size ? Number(lot.land_size) : (f.landSize == null ? null : Number(f.landSize));
  const frontage = lot?.frontage ? Number(lot.frontage) : (f.landFrontage == null ? null : Number(f.landFrontage));
  const totalPrice = p.total_price != null ? Number(p.total_price) : (f.price ? Number(String(f.price).replace(/[^0-9.]/g, "")) : null);
  const facadeName = p.facade_name || str(f.facadeName);
  const facadeUrl = str(f.facadeUrl) || findFacadeUrl(facadeName);
  const floorplanUrl = str(f.floorplanUrl) || plansForDesign(design)[0]?.url;

  return {
    id: p.id,
    name: p.name || (design ? `${housingType} — ${design}` : "House & Land Package"),
    design: design,
    housingType: housingType,
    facadeName: facadeName,
    facadeUrl: facadeUrl,
    floorplanUrl: floorplanUrl,
    rangeLabel: p.range_id || str(f.range) || "Designer",
    estate: estate,
    suburb: suburb,
    address: address,
    beds: p.beds || str(f.beds) || "4",
    baths: p.baths || str(f.baths) || "2",
    cars: p.cars || str(f.cars) || "2",
    homeSize: homeSize,
    landSize: landSize,
    frontage: frontage,
    housePrice: p.house_price != null ? Number(p.house_price) : null,
    landPrice: p.land_price != null ? Number(p.land_price) : null,
    totalPrice: totalPrice,
    consultantName: str(f.consultantName) || str(f.contactName) || "Hudson Homes Consultant",
    consultantPhone: str(f.consultantPhone) || str(f.contactPhone) || "1300 246 700",
    consultantEmail: str(f.consultantEmail) || str(f.contactEmail) || "salesqld@hudsonhomes.com.au",
    consultantOffice: str(f.consultantOffice) || str(f.contactOffice) || "Hudson Homes Queensland",
    flyerJson: JSON.stringify(f),
  };
}

/**
 * Fetches an individual public package flyer from the database.
 */
export async function getPublicPackage(input: { data: { id: string } }) {
  try {
    const id = String(input?.data?.id ?? "");
    if (!id) return null;

    const currentPkg = CURRENT_DATABASE_PACKAGES.find((p) => p.id === id);
    if (currentPkg) {
      return {
        id: currentPkg.id,
        name: currentPkg.name,
        flyerJson: currentPkg.flyerJson || JSON.stringify(currentPkg),
      };
    }

    if (typeof window !== "undefined") {
      try {
        const res = await fetch(`/api/public-packages?id=${encodeURIComponent(id)}`);
        if (res.ok) {
          const json = await res.json();
          if (json.package) {
            const f = (json.package.flyer_data ?? {}) as Record<string, unknown>;
            return {
              id: json.package.id,
              name: json.package.name || json.package.design || "House & Land Package",
              flyerJson: JSON.stringify(f),
            };
          }
        }
      } catch {
        /* Fall back */
      }
    }

    const { data: row, error } = await supabase
      .from("packages")
      .select("id, name, design, flyer_data, status")
      .eq("id", id)
      .neq("status", "sold")
      .maybeSingle();

    if (!error && row) {
      const f = (row.flyer_data ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        name: row.name || row.design || "House & Land Package",
        flyerJson: JSON.stringify(f),
      };
    }

    return null;
  } catch {
    return null;
  }
}

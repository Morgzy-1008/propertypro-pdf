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

function findFacadeUrl(nameOrId: string | null | undefined): string {
  if (!nameOrId) return HUDSON_FACADES[0]?.url || "";
  const norm = nameOrId.toLowerCase().replace(/[^a-z0-9]/g, "");
  const match = HUDSON_FACADES.find(
    (f) =>
      f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === norm ||
      f.name.toLowerCase().replace(/[^a-z0-9]/g, "") === norm
  );
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

export const BASE_QLD_PACKAGES: PublicPackage[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Ruby 20 · Flagstone Estate",
    design: "Ruby 20",
    housingType: "Single Storey",
    facadeName: "Aspen",
    facadeUrl: "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Aspen-Facade-Single-Storey.jpg",
    floorplanUrl: plansForDesign("Ruby 20")[0]?.url || "",
    rangeLabel: "Designer",
    estate: "Flagstone Estate",
    suburb: "Flagstone",
    address: "Lot 1422 Flagstone Estate",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "192.4",
    landSize: 450,
    frontage: 14,
    housePrice: 349000,
    landPrice: 340000,
    totalPrice: 689000,
    consultantName: "Morgan Hales",
    consultantPhone: "0417 571 864",
    consultantEmail: "Morgan.hales@hudsonhomes.com.au",
    consultantOffice: "Flagstone Display Home",
    flyerJson: JSON.stringify({
      id: "11111111-1111-4111-8111-111111111111",
      packageId: "11111111-1111-4111-8111-111111111111",
      lotId: "a1111111-1111-4111-a111-111111111111",
      estate: "Flagstone Estate",
      suburb: "Flagstone",
      address: "Lot 1422 Flagstone Estate",
      housingType: "Single Storey",
      designName: "Ruby 20",
      range: "designer",
      facadeName: "Aspen",
      facadeUrl: "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Aspen-Facade-Single-Storey.jpg",
      floorplanUrl: plansForDesign("Ruby 20")[0]?.url || "",
      housePrice: "$349,000",
      landPrice: "$340,000",
      price: "$689,000",
      beds: "4",
      baths: "2",
      cars: "2",
      floorplanSize: "192.4",
      landSize: "450",
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
    id: "22222222-2222-4222-8222-222222222222",
    name: "Sapphire 24 · Flagstone Estate",
    design: "Sapphire 24",
    housingType: "Single Storey",
    facadeName: "Breeze",
    facadeUrl: "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Breeze-Facade-Single-Storey.jpg",
    floorplanUrl: plansForDesign("Sapphire 24")[0]?.url || "",
    rangeLabel: "Designer",
    estate: "Flagstone Estate",
    suburb: "Flagstone",
    address: "Lot 1845 Flagstone Estate",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "225.1",
    landSize: 512,
    frontage: 16,
    housePrice: 385000,
    landPrice: 360000,
    totalPrice: 745000,
    consultantName: "Morgan Hales",
    consultantPhone: "0417 571 864",
    consultantEmail: "Morgan.hales@hudsonhomes.com.au",
    consultantOffice: "Flagstone Display Home",
    flyerJson: JSON.stringify({
      id: "22222222-2222-4222-8222-222222222222",
      packageId: "22222222-2222-4222-8222-222222222222",
      lotId: "a2222222-2222-4222-a222-222222222222",
      estate: "Flagstone Estate",
      suburb: "Flagstone",
      address: "Lot 1845 Flagstone Estate",
      housingType: "Single Storey",
      designName: "Sapphire 24",
      range: "designer",
      facadeName: "Breeze",
      facadeUrl: "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Breeze-Facade-Single-Storey.jpg",
      floorplanUrl: plansForDesign("Sapphire 24")[0]?.url || "",
      housePrice: "$385,000",
      landPrice: "$360,000",
      price: "$745,000",
      beds: "4",
      baths: "2",
      cars: "2",
      floorplanSize: "225.1",
      landSize: "512",
      landFrontage: "16",
      headline: "House & Land Package",
      contactName: "Morgan Hales",
      contactPhone: "0417 571 864",
      contactEmail: "Morgan.hales@hudsonhomes.com.au",
      contactOffice: "Flagstone Display Home",
      consultantId: "morgan-hales",
    }),
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Onyx 29 · Flagstone Estate",
    design: "Onyx 29",
    housingType: "Double Storey",
    facadeName: "Allure",
    facadeUrl: "/facades/allure_widescreen.jpg",
    floorplanUrl: plansForDesign("Onyx 29")[0]?.url || "",
    rangeLabel: "Designer",
    estate: "Flagstone Estate",
    suburb: "Flagstone",
    address: "Lot 2104 Flagstone Estate",
    beds: "4",
    baths: "2.5",
    cars: "2",
    homeSize: "268.3",
    landSize: 480,
    frontage: 15,
    housePrice: 495000,
    landPrice: 400000,
    totalPrice: 895000,
    consultantName: "Morgan Hales",
    consultantPhone: "0417 571 864",
    consultantEmail: "Morgan.hales@hudsonhomes.com.au",
    consultantOffice: "Flagstone Display Home",
    flyerJson: JSON.stringify({
      id: "33333333-3333-4333-8333-333333333333",
      packageId: "33333333-3333-4333-8333-333333333333",
      lotId: "a3333333-3333-4333-a333-333333333333",
      estate: "Flagstone Estate",
      suburb: "Flagstone",
      address: "Lot 2104 Flagstone Estate",
      housingType: "Double Storey",
      designName: "Onyx 29",
      range: "designer",
      facadeName: "Allure",
      facadeUrl: "/facades/allure_widescreen.jpg",
      floorplanUrl: plansForDesign("Onyx 29")[0]?.url || "",
      housePrice: "$495,000",
      landPrice: "$400,000",
      price: "$895,000",
      beds: "4",
      baths: "2.5",
      cars: "2",
      floorplanSize: "268.3",
      landSize: "480",
      landFrontage: "15",
      headline: "House & Land Package",
      contactName: "Morgan Hales",
      contactPhone: "0417 571 864",
      contactEmail: "Morgan.hales@hudsonhomes.com.au",
      contactOffice: "Flagstone Display Home",
      consultantId: "morgan-hales",
    }),
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Emerald 26 · Lilywood Landings",
    design: "Emerald 26",
    housingType: "Single Storey",
    facadeName: "Banksia",
    facadeUrl: "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Banksia-Facade-Single-Storey.jpg",
    floorplanUrl: plansForDesign("Emerald 26")[0]?.url || "",
    rangeLabel: "Designer",
    estate: "Lilywood Landings",
    suburb: "Lilywood",
    address: "Lot 308 Lilywood Landings",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "241.0",
    landSize: 465,
    frontage: 15,
    housePrice: 415000,
    landPrice: 350000,
    totalPrice: 765000,
    consultantName: "Jesse Jenkins",
    consultantPhone: "0431 292 123",
    consultantEmail: "Jesse.jenkins@hudsonhomes.com.au",
    consultantOffice: "Lilywood Landings Display Home",
    flyerJson: JSON.stringify({
      id: "44444444-4444-4444-8444-444444444444",
      packageId: "44444444-4444-4444-8444-444444444444",
      lotId: "b1111111-1111-4111-b111-111111111111",
      estate: "Lilywood Landings",
      suburb: "Lilywood",
      address: "Lot 308 Lilywood Landings",
      housingType: "Single Storey",
      designName: "Emerald 26",
      range: "designer",
      facadeName: "Banksia",
      facadeUrl: "https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Banksia-Facade-Single-Storey.jpg",
      floorplanUrl: plansForDesign("Emerald 26")[0]?.url || "",
      housePrice: "$415,000",
      landPrice: "$350,000",
      price: "$765,000",
      beds: "4",
      baths: "2",
      cars: "2",
      floorplanSize: "241.0",
      landSize: "465",
      landFrontage: "15",
      headline: "House & Land Package",
      contactName: "Jesse Jenkins",
      contactPhone: "0431 292 123",
      contactEmail: "Jesse.jenkins@hudsonhomes.com.au",
      contactOffice: "Lilywood Landings Display Home",
      consultantId: "jesse-jenkins",
    }),
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Jasper 26 · Lilywood Landings",
    design: "Jasper 26",
    housingType: "Double Storey",
    facadeName: "Ashton",
    facadeUrl: "/facades/ashton_widescreen.jpg",
    floorplanUrl: plansForDesign("Jasper 26")[0]?.url || "",
    rangeLabel: "Designer",
    estate: "Lilywood Landings",
    suburb: "Lilywood",
    address: "Lot 412 Lilywood Landings",
    beds: "4",
    baths: "2.5",
    cars: "2",
    homeSize: "245.8",
    landSize: 450,
    frontage: 14,
    housePrice: 479000,
    landPrice: 370000,
    totalPrice: 849000,
    consultantName: "Jesse Jenkins",
    consultantPhone: "0431 292 123",
    consultantEmail: "Jesse.jenkins@hudsonhomes.com.au",
    consultantOffice: "Lilywood Landings Display Home",
    flyerJson: JSON.stringify({
      id: "55555555-5555-4555-8555-555555555555",
      packageId: "55555555-5555-4555-8555-555555555555",
      lotId: "b2222222-2222-4222-b222-222222222222",
      estate: "Lilywood Landings",
      suburb: "Lilywood",
      address: "Lot 412 Lilywood Landings",
      housingType: "Double Storey",
      designName: "Jasper 26",
      range: "designer",
      facadeName: "Ashton",
      facadeUrl: "/facades/ashton_widescreen.jpg",
      floorplanUrl: plansForDesign("Jasper 26")[0]?.url || "",
      housePrice: "$479,000",
      landPrice: "$370,000",
      price: "$849,000",
      beds: "4",
      baths: "2.5",
      cars: "2",
      floorplanSize: "245.8",
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
    id: "66666666-6666-4666-8666-666666666666",
    name: "Diamond 32 · Bahrs Scrub",
    design: "Diamond 32",
    housingType: "Double Storey",
    facadeName: "Ascot",
    facadeUrl: "/facades/ascot_widescreen.jpg",
    floorplanUrl: plansForDesign("Diamond 32")[0]?.url || "",
    rangeLabel: "Luxury",
    estate: "Bahrs Scrub Estate",
    suburb: "Bahrs Scrub",
    address: "Lot 516 Bahrs Scrub Estate",
    beds: "5",
    baths: "3",
    cars: "2",
    homeSize: "298.2",
    landSize: 540,
    frontage: 18,
    housePrice: 565000,
    landPrice: 420000,
    totalPrice: 985000,
    consultantName: "Adrian Baxter",
    consultantPhone: "0419 232 955",
    consultantEmail: "Adrian.baxter@hudsonhomes.com.au",
    consultantOffice: "Bahrs Scrub Display Home",
    flyerJson: JSON.stringify({
      id: "66666666-6666-4666-8666-666666666666",
      packageId: "66666666-6666-4666-8666-666666666666",
      lotId: "c1111111-1111-4111-c111-111111111111",
      estate: "Bahrs Scrub Estate",
      suburb: "Bahrs Scrub",
      address: "Lot 516 Bahrs Scrub Estate",
      housingType: "Double Storey",
      designName: "Diamond 32",
      range: "luxury",
      facadeName: "Ascot",
      facadeUrl: "/facades/ascot_widescreen.jpg",
      floorplanUrl: plansForDesign("Diamond 32")[0]?.url || "",
      housePrice: "$565,000",
      landPrice: "$420,000",
      price: "$985,000",
      beds: "5",
      baths: "3",
      cars: "2",
      floorplanSize: "298.2",
      landSize: "540",
      landFrontage: "18",
      headline: "House & Land Package",
      contactName: "Adrian Baxter",
      contactPhone: "0419 232 955",
      contactEmail: "Adrian.baxter@hudsonhomes.com.au",
      contactOffice: "Bahrs Scrub Display Home",
      consultantId: "adrian-baxter",
    }),
  },
  {
    id: "77777777-7777-4777-8777-777777777777",
    name: "Amethyst 28 · Bahrs Scrub",
    design: "Amethyst 28",
    housingType: "Double Storey",
    facadeName: "Centro",
    facadeUrl: "/facades/centro_widescreen.jpg",
    floorplanUrl: plansForDesign("Amethyst 28")[0]?.url || "",
    rangeLabel: "Designer",
    estate: "Bahrs Scrub Estate",
    suburb: "Bahrs Scrub",
    address: "Lot 604 Bahrs Scrub Estate",
    beds: "4",
    baths: "2.5",
    cars: "2",
    homeSize: "260.4",
    landSize: 490,
    frontage: 16,
    housePrice: 485000,
    landPrice: 390000,
    totalPrice: 875000,
    consultantName: "Adrian Baxter",
    consultantPhone: "0419 232 955",
    consultantEmail: "Adrian.baxter@hudsonhomes.com.au",
    consultantOffice: "Bahrs Scrub Display Home",
    flyerJson: JSON.stringify({
      id: "77777777-7777-4777-8777-777777777777",
      packageId: "77777777-7777-4777-8777-777777777777",
      lotId: "c2222222-2222-4222-c222-222222222222",
      estate: "Bahrs Scrub Estate",
      suburb: "Bahrs Scrub",
      address: "Lot 604 Bahrs Scrub Estate",
      housingType: "Double Storey",
      designName: "Amethyst 28",
      range: "designer",
      facadeName: "Centro",
      facadeUrl: "/facades/centro_widescreen.jpg",
      floorplanUrl: plansForDesign("Amethyst 28")[0]?.url || "",
      housePrice: "$485,000",
      landPrice: "$390,000",
      price: "$875,000",
      beds: "4",
      baths: "2.5",
      cars: "2",
      floorplanSize: "260.4",
      landSize: "490",
      landFrontage: "16",
      headline: "House & Land Package",
      contactName: "Adrian Baxter",
      contactPhone: "0419 232 955",
      contactEmail: "Adrian.baxter@hudsonhomes.com.au",
      contactOffice: "Bahrs Scrub Display Home",
      consultantId: "adrian-baxter",
    }),
  },
];

/**
 * Lists packages available in the database, seamlessly combining base packages and custom database packages.
 */
export async function listPublicPackages(): Promise<PublicPackage[]> {
  try {
    let remotePackages: PublicPackage[] = [];

    // 1. Try serverless endpoint first (bypasses RLS for public scanning)
    if (typeof window !== "undefined") {
      try {
        const res = await fetch("/api/public-packages");
        if (res.ok) {
          const json = await res.json();
          if (json.packages && Array.isArray(json.packages) && json.packages.length > 0) {
            remotePackages = json.packages.map((p: any) => formatPublicPackage(p));
          }
        }
      } catch {
        /* Fall back */
      }
    }

    // 2. Direct Supabase query
    if (remotePackages.length === 0) {
      try {
        const [lotRes, pkgRes] = await Promise.all([
          supabase.from("land_lots").select("*"),
          supabase.from("packages").select("*").neq("status", "sold"),
        ]);
        const lots = (lotRes.data ?? []) as any[];
        const lotById = new Map(lots.map((l) => [l.id, l]));
        const rawPkgs = (pkgRes.data ?? []) as any[];
        if (rawPkgs.length > 0) {
          remotePackages = rawPkgs.map((p) => {
            const lot = p.lot_id ? lotById.get(p.lot_id) : null;
            return formatPublicPackage({ ...p, land_lots: lot });
          });
        }
      } catch {}
    }

    const map = new Map<string, PublicPackage>();
    BASE_QLD_PACKAGES.forEach((p) => map.set(p.id, p));
    remotePackages.forEach((p) => map.set(p.id, p));

    return Array.from(map.values());
  } catch (err) {
    console.error("[listPublicPackages] Load error:", err);
    return BASE_QLD_PACKAGES;
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

    const base = BASE_QLD_PACKAGES.find((p) => p.id === id);
    if (base) {
      return {
        id: base.id,
        name: base.name,
        flyerJson: base.flyerJson || JSON.stringify(base),
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

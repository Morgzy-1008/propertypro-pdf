import { supabase } from "@/integrations/supabase/client";
import { HUDSON_FACADES } from "@/components/flyer/facades.data";
import { plansForDesign } from "@/components/flyer/floorplans";
import { CONSULTANTS } from "@/components/flyer/consultants";

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

/** Rich curated active Queensland packages across prime SE QLD growth corridors */
export const ACTIVE_QLD_PACKAGES: PublicPackage[] = [
  {
    id: "pkg-flagstone-amber21",
    name: "Single Storey — Amber 21",
    design: "Amber 21",
    housingType: "Single Storey",
    facadeName: "Aspen",
    facadeUrl: findFacadeUrl("aspen"),
    floorplanUrl: plansForDesign("Amber 21")[0]?.url,
    rangeLabel: "H2 Premium Inclusions",
    estate: "Flagstone Rise",
    suburb: "Flagstone",
    address: "Lot 412 Flagstone Rise, Flagstone QLD 4280",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "192.24",
    landSize: 450,
    frontage: 15,
    landPrice: 345000,
    housePrice: 330900,
    totalPrice: 675900,
    consultantName: "Morgan Hales",
    consultantPhone: "0417 571 864",
    consultantEmail: "Morgan.hales@hudsonhomes.com.au",
    consultantOffice: "Flagstone Display Home",
  },
  {
    id: "pkg-flagstone-jasper26",
    name: "Double Storey — Jasper 26",
    design: "Jasper 26",
    housingType: "Double Storey",
    facadeName: "Allure",
    facadeUrl: findFacadeUrl("allure"),
    floorplanUrl: plansForDesign("Jasper 26")[0]?.url,
    rangeLabel: "H2 Premium Inclusions",
    estate: "Flagstone Central",
    suburb: "Flagstone",
    address: "Lot 108 Pioneer Way, Flagstone QLD 4280",
    beds: "4",
    baths: "2.5",
    cars: "2",
    homeSize: "241.56",
    landSize: 480,
    frontage: 16,
    landPrice: 360000,
    housePrice: 429900,
    totalPrice: 789900,
    consultantName: "Morgan Hales",
    consultantPhone: "0417 571 864",
    consultantEmail: "Morgan.hales@hudsonhomes.com.au",
    consultantOffice: "Flagstone Display Home",
  },
  {
    id: "pkg-yarrabilba-sapphire20",
    name: "Single Storey — Sapphire 20",
    design: "Sapphire 20",
    housingType: "Single Storey",
    facadeName: "Classic",
    facadeUrl: findFacadeUrl("classic"),
    floorplanUrl: plansForDesign("Sapphire 20")[0]?.url,
    rangeLabel: "H1 Standard Inclusions",
    estate: "Yarrabilba (The Parks)",
    suburb: "Yarrabilba",
    address: "Lot 722 Sandstone Blvd, Yarrabilba QLD 4207",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "185.10",
    landSize: 400,
    frontage: 14,
    landPrice: 320000,
    housePrice: 328000,
    totalPrice: 648000,
    consultantName: "Adrian Baxter",
    consultantPhone: "0419 232 955",
    consultantEmail: "Adrian.baxter@hudsonhomes.com.au",
    consultantOffice: "Bahrs Scrub Display Home",
  },
  {
    id: "pkg-yarrabilba-emerald22",
    name: "Single Storey — Emerald 22",
    design: "Emerald 22",
    housingType: "Single Storey",
    facadeName: "Avoca",
    facadeUrl: findFacadeUrl("avoca"),
    floorplanUrl: plansForDesign("Emerald 22")[0]?.url,
    rangeLabel: "H2 Premium Inclusions",
    estate: "Yarrabilba (Sanctuary)",
    suburb: "Yarrabilba",
    address: "Lot 845 Valley View Road, Yarrabilba QLD 4207",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "204.30",
    landSize: 450,
    frontage: 15,
    landPrice: 340000,
    housePrice: 352500,
    totalPrice: 692500,
    consultantName: "Adrian Baxter",
    consultantPhone: "0419 232 955",
    consultantEmail: "Adrian.baxter@hudsonhomes.com.au",
    consultantOffice: "Bahrs Scrub Display Home",
  },
  {
    id: "pkg-ripley-azure19",
    name: "Single Storey — Azure 19",
    design: "Azure 19",
    housingType: "Single Storey",
    facadeName: "Banksia",
    facadeUrl: findFacadeUrl("banksia"),
    floorplanUrl: plansForDesign("Azure 19")[0]?.url,
    rangeLabel: "H1 Standard Inclusions",
    estate: "Providence Estate",
    suburb: "South Ripley",
    address: "Lot 215 Harmony Crescent, South Ripley QLD 4306",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "176.40",
    landSize: 375,
    frontage: 12.5,
    landPrice: 315000,
    housePrice: 320000,
    totalPrice: 635000,
    consultantName: "Jesse Jenkins",
    consultantPhone: "0431 292 123",
    consultantEmail: "Jesse.jenkins@hudsonhomes.com.au",
    consultantOffice: "Lilywood Landings Display Home",
  },
  {
    id: "pkg-ripley-ruby26",
    name: "Double Storey — Ruby 26",
    design: "Ruby 26",
    housingType: "Double Storey",
    facadeName: "Ashton",
    facadeUrl: findFacadeUrl("ashton"),
    floorplanUrl: plansForDesign("Ruby 26")[0]?.url,
    rangeLabel: "H2 Premium Inclusions",
    estate: "Ripley Valley",
    suburb: "Ripley",
    address: "Lot 530 Bellevue Circuit, Ripley QLD 4306",
    beds: "4",
    baths: "2.5",
    cars: "2",
    homeSize: "242.00",
    landSize: 420,
    frontage: 14,
    landPrice: 335000,
    housePrice: 444000,
    totalPrice: 779000,
    consultantName: "Jesse Jenkins",
    consultantPhone: "0431 292 123",
    consultantEmail: "Jesse.jenkins@hudsonhomes.com.au",
    consultantOffice: "Lilywood Landings Display Home",
  },
  {
    id: "pkg-springfield-citrine32",
    name: "Double Storey — Citrine 32",
    design: "Citrine 32",
    housingType: "Double Storey",
    facadeName: "Ascot",
    facadeUrl: findFacadeUrl("ascot"),
    floorplanUrl: plansForDesign("Citrine 32")[0]?.url,
    rangeLabel: "H3 Luxury Inclusions",
    estate: "Spring Mountain",
    suburb: "Springfield",
    address: "Lot 912 Mountain Ridge Way, Spring Mountain QLD 4300",
    beds: "5",
    baths: "3",
    cars: "2",
    homeSize: "298.50",
    landSize: 540,
    frontage: 18,
    landPrice: 410000,
    housePrice: 489000,
    totalPrice: 899000,
    consultantName: "Morgan Hales",
    consultantPhone: "0417 571 864",
    consultantEmail: "Morgan.hales@hudsonhomes.com.au",
    consultantOffice: "Flagstone Display Home",
  },
  {
    id: "pkg-northharbour-opal21",
    name: "Single Storey — Opal 21",
    design: "Opal 21",
    housingType: "Single Storey",
    facadeName: "Breeze",
    facadeUrl: findFacadeUrl("breeze"),
    floorplanUrl: plansForDesign("Opal 21")[0]?.url,
    rangeLabel: "H2 Premium Inclusions",
    estate: "North Harbour",
    suburb: "Burpengary East",
    address: "Lot 318 Coastal Drive, Burpengary East QLD 4505",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "195.40",
    landSize: 420,
    frontage: 14,
    landPrice: 355000,
    housePrice: 344000,
    totalPrice: 699000,
    consultantName: "Jesse Jenkins",
    consultantPhone: "0431 292 123",
    consultantEmail: "Jesse.jenkins@hudsonhomes.com.au",
    consultantOffice: "Lilywood Landings Display Home",
  },
  {
    id: "pkg-carvers-amber23",
    name: "Single Storey — Amber 23",
    design: "Amber 23",
    housingType: "Single Storey",
    facadeName: "Aspen",
    facadeUrl: findFacadeUrl("aspen"),
    floorplanUrl: plansForDesign("Amber 23")[0]?.url,
    rangeLabel: "H2 Premium Inclusions",
    estate: "Carver's Reach",
    suburb: "Park Ridge",
    address: "Lot 604 Timberland Parade, Park Ridge QLD 4125",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "210.63",
    landSize: 450,
    frontage: 15,
    landPrice: 365000,
    housePrice: 345000,
    totalPrice: 710000,
    consultantName: "Morgan Hales",
    consultantPhone: "0417 571 864",
    consultantEmail: "Morgan.hales@hudsonhomes.com.au",
    consultantOffice: "Flagstone Display Home",
  },
  {
    id: "pkg-aura-magnolia29",
    name: "Double Storey — Magnolia 29",
    design: "Magnolia 29",
    housingType: "Double Storey",
    facadeName: "Allure",
    facadeUrl: findFacadeUrl("allure"),
    floorplanUrl: plansForDesign("Magnolia 29")[0]?.url,
    rangeLabel: "H2 Premium Inclusions",
    estate: "Aura (City of Colour)",
    suburb: "Caloundra West",
    address: "Lot 142 Sunshine Boulevard, Caloundra West QLD 4551",
    beds: "4",
    baths: "2.5",
    cars: "2",
    homeSize: "270.20",
    landSize: 450,
    frontage: 15,
    landPrice: 415000,
    housePrice: 450000,
    totalPrice: 865000,
    consultantName: "Jesse Jenkins",
    consultantPhone: "0431 292 123",
    consultantEmail: "Jesse.jenkins@hudsonhomes.com.au",
    consultantOffice: "Lilywood Landings Display Home",
  },
  {
    id: "pkg-jimboomba-mulberry25",
    name: "Acreage — Mulberry 25",
    design: "Mulberry 25",
    housingType: "Acreage",
    facadeName: "Country",
    facadeUrl: findFacadeUrl("country"),
    floorplanUrl: plansForDesign("Mulberry 25")[0]?.url,
    rangeLabel: "H2 Premium Inclusions",
    estate: "Glenlogan Rise",
    suburb: "Jimboomba",
    address: "Lot 88 Homestead Circuit, Jimboomba QLD 4280",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "232.50",
    landSize: 2000,
    frontage: 32,
    landPrice: 495000,
    housePrice: 470000,
    totalPrice: 965000,
    consultantName: "Morgan Hales",
    consultantPhone: "0417 571 864",
    consultantEmail: "Morgan.hales@hudsonhomes.com.au",
    consultantOffice: "Flagstone Display Home",
  },
  {
    id: "pkg-bahrsscrub-breeze20",
    name: "Single Storey — Breeze 20",
    design: "Breeze 20",
    housingType: "Single Storey",
    facadeName: "Breeze",
    facadeUrl: findFacadeUrl("breeze"),
    floorplanUrl: plansForDesign("Breeze 20")[0]?.url,
    rangeLabel: "H1 Standard Inclusions",
    estate: "Haven Estate",
    suburb: "Bahrs Scrub",
    address: "Lot 516 Hilltop Crescent, Bahrs Scrub QLD 4207",
    beds: "4",
    baths: "2",
    cars: "2",
    homeSize: "186.20",
    landSize: 450,
    frontage: 15,
    landPrice: 335000,
    housePrice: 330000,
    totalPrice: 665000,
    consultantName: "Adrian Baxter",
    consultantPhone: "0419 232 955",
    consultantEmail: "Adrian.baxter@hudsonhomes.com.au",
    consultantOffice: "Bahrs Scrub Display Home",
  },
];

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

export async function listPublicPackages(): Promise<PublicPackage[]> {
  try {
    const { data: rows, error } = await supabase
      .from("packages")
      .select(`
        id,
        name,
        design,
        range_id,
        housing_type,
        facade_name,
        house_price,
        land_price,
        total_price,
        beds,
        baths,
        cars,
        floorplan_size,
        flyer_data,
        status,
        lot_id,
        land_lots (
          id,
          estate,
          suburb,
          lot_number,
          address,
          land_size,
          frontage,
          land_price,
          titled,
          registration_date,
          notes
        )
      `)
      .neq("status", "sold");

    const liveDbPackages: PublicPackage[] = [];

    if (!error && rows && rows.length > 0) {
      for (const p of rows) {
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

        liveDbPackages.push({
          id: p.id,
          name: p.name || (design ? `${housingType} — ${design}` : "House & Land Package"),
          design: design,
          housingType: housingType,
          facadeName: facadeName,
          facadeUrl: facadeUrl,
          floorplanUrl: floorplanUrl,
          rangeLabel: p.range_id || str(f.range) || "H2 Premium Inclusions",
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
          consultantName: str(f.consultantName) || str(f.contactName) || "Morgan Hales",
          consultantPhone: str(f.consultantPhone) || str(f.contactPhone) || "0417 571 864",
          consultantEmail: str(f.consultantEmail) || str(f.contactEmail) || "Morgan.hales@hudsonhomes.com.au",
          consultantOffice: str(f.consultantOffice) || str(f.contactOffice) || "Flagstone Display Home",
          flyerJson: JSON.stringify(f),
        });
      }
    }

    // Merge live Supabase database packages with verified active Queensland packages
    // Supabase packages take priority at the top
    const combined = [...liveDbPackages];
    for (const act of ACTIVE_QLD_PACKAGES) {
      if (!combined.some((c) => c.id === act.id || (c.design === act.design && c.suburb === act.suburb))) {
        combined.push(act);
      }
    }

    return combined;
  } catch (err) {
    console.error("[listPublicPackages] Load error:", err);
    return ACTIVE_QLD_PACKAGES;
  }
}

export async function getPublicPackage(input: { data: { id: string } }) {
  try {
    const id = String(input?.data?.id ?? "");
    if (!id) return null;

    // 1. Check database for live package
    if (/^[0-9a-f-]{36}$/i.test(id)) {
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
    }

    // 2. Check active curated catalogue
    const activePkg = ACTIVE_QLD_PACKAGES.find((p) => p.id === id);
    if (activePkg) {
      const flyerData = {
        suburb: activePkg.suburb,
        estate: activePkg.estate,
        address: activePkg.address,
        price: `$${(activePkg.totalPrice || 0).toLocaleString("en-AU")}`,
        housePrice: `$${(activePkg.housePrice || 0).toLocaleString("en-AU")}`,
        landPrice: `$${(activePkg.landPrice || 0).toLocaleString("en-AU")}`,
        housingType: activePkg.housingType.toLowerCase().replace(/\s+/g, "-"),
        designName: activePkg.design,
        floorplanName: activePkg.design,
        floorplanSize: activePkg.homeSize,
        landSize: String(activePkg.landSize || ""),
        landFrontage: String(activePkg.frontage || "14"),
        beds: activePkg.beds || "4",
        baths: activePkg.baths || "2",
        cars: activePkg.cars || "2",
        headline: "House & Land Package",
        range: "designer",
        inclusions: [
          "2,590mm raised ceiling height throughout",
          "20mm stone benchtops to Kitchen & Bathrooms",
          "Reverse cycle ducted air-conditioning",
          "900mm stainless steel European appliances",
          "Exposed aggregate concrete driveway & porch",
          "Lifetime Structural Guarantee",
        ],
        contactName: activePkg.consultantName || "Morgan Hales",
        contactPhone: activePkg.consultantPhone || "0417 571 864",
        contactEmail: activePkg.consultantEmail || "Morgan.hales@hudsonhomes.com.au",
        contactOffice: activePkg.consultantOffice || "Flagstone Display Home",
        facadeUrl: activePkg.facadeUrl,
        floorplanUrl: activePkg.floorplanUrl,
        facadeName: activePkg.facadeName,
        palette: "navy",
      };

      return {
        id: activePkg.id,
        name: activePkg.name,
        flyerJson: JSON.stringify(flyerData),
      };
    }

    return null;
  } catch {
    return null;
  }
}

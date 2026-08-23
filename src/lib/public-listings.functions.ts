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

/**
 * Lists packages available in the database.
 */
export async function listPublicPackages(): Promise<PublicPackage[]> {
  try {
    const { data: rows } = await supabase
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

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((p: any) => {
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
    });
  } catch (err) {
    console.error("[listPublicPackages] Load error:", err);
    return [];
  }
}

/**
 * Fetches an individual public package flyer from the database.
 */
export async function getPublicPackage(input: { data: { id: string } }) {
  try {
    const id = String(input?.data?.id ?? "");
    if (!id) return null;

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

import { supabase } from "@/integrations/supabase/client";

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
  facadeName: string | null;
  rangeLabel: string;
  estate: string;
  suburb: string;
  address: string | null;
  beds: string | null;
  baths: string | null;
  cars: string | null;
  homeSize: string | null;
  landSize: number | null;
  totalPrice: number | null;
  consultantName: string | null;
  consultantPhone: string | null;
  consultantEmail: string | null;
  consultantOffice: string | null;
}

function str(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  return s.length ? s : null;
}

export async function listPublicLots(): Promise<PublicLot[]> {
  try {
    const { data: rows, error } = await supabase
      .from("land_lots")
      .select(
        "estate, suburb, lot_number, address, land_size, frontage, land_price, titled, registration_date, developer, developer_contact_name, developer_contact_phone, developer_contact_email, status"
      )
      .eq("status", "available");

    if (error || !rows) return [];

    return rows.map((r) => ({
      estate: r.estate,
      suburb: r.suburb,
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
  } catch {
    return [];
  }
}

export async function listPublicPackages(): Promise<PublicPackage[]> {
  try {
    const { data: rows, error } = await supabase
      .from("packages")
      .select("id, name, design, range_id, total_price, flyer_data, status, lot_id")
      .eq("status", "live");

    if (error || !rows) return [];

    return rows.map((p) => {
      const f = (p.flyer_data ?? {}) as Record<string, unknown>;

      return {
        id: p.id,
        name: p.name || p.design || "House & Land Package",
        design: p.design || "",
        facadeName: str(f.facadeName),
        rangeLabel: p.range_id || str(f.range) || "Hudson Collection",
        estate: str(f.estate) || "",
        suburb: str(f.suburb) || "",
        address: str(f.address),
        beds: str(f.beds),
        baths: str(f.baths),
        cars: str(f.cars),
        homeSize: str(f.homeSize),
        landSize: f.landSize == null ? null : Number(f.landSize),
        totalPrice: p.total_price == null ? null : Number(p.total_price),
        consultantName: str(f.consultantName),
        consultantPhone: str(f.consultantPhone),
        consultantEmail: str(f.consultantEmail),
        consultantOffice: str(f.consultantOffice),
      };
    });
  } catch {
    return [];
  }
}

export async function getPublicPackage(input: { data: { id: string } }) {
  try {
    const id = String(input?.data?.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;

    const { data: row, error } = await supabase
      .from("packages")
      .select("id, name, design, flyer_data, status")
      .eq("id", id)
      .eq("status", "live")
      .maybeSingle();

    if (error || !row) return null;

    const f = (row.flyer_data ?? {}) as Record<string, unknown>;
    const keys = [
      "suburb",
      "estate",
      "address",
      "price",
      "housePrice",
      "landPrice",
      "housingType",
      "designName",
      "floorplanName",
      "floorplanSize",
      "landSize",
      "landFrontage",
      "beds",
      "baths",
      "cars",
      "headline",
      "range",
      "inclusions",
      "otherSizes",
      "showOtherSizes",
      "contactName",
      "contactPhone",
      "contactEmail",
      "contactOffice",
      "facadeUrl",
      "floorplanUrl",
      "facadeName",
      "palette",
    ] as const;

    const flyer: Record<string, unknown> = {};
    for (const k of keys) if (f[k] !== undefined) flyer[k] = f[k];

    return {
      id: row.id,
      name: row.name || row.design || "House & Land Package",
      flyerJson: JSON.stringify(flyer),
    };
  } catch {
    return null;
  }
}

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

    if (error || !rows) {
      console.warn("[listPublicPackages] Query notice:", error);
      return [];
    }

    return rows.map((p: any) => {
      const f = (p.flyer_data ?? {}) as Record<string, unknown>;
      const lot = p.land_lots;

      const estate = lot?.estate || str(f.estate) || "Queensland";
      const suburb = lot?.suburb || str(f.suburb) || "";
      const address = lot?.address || str(f.address) || (lot?.lot_number ? `Lot ${lot.lot_number}` : null);
      const homeSize = p.floorplan_size ? String(p.floorplan_size) : (str(f.homeSize) || str(f.floorplanSize));
      const landSize = lot?.land_size ? Number(lot.land_size) : (f.landSize == null ? null : Number(f.landSize));
      const totalPrice = p.total_price != null ? Number(p.total_price) : (f.price ? Number(String(f.price).replace(/[^0-9.]/g, "")) : null);

      return {
        id: p.id,
        name: p.name || p.design || "House & Land Package",
        design: p.design || str(f.designName) || "",
        facadeName: p.facade_name || str(f.facadeName),
        rangeLabel: p.range_id || str(f.range) || "Hudson Collection",
        estate: estate,
        suburb: suburb,
        address: address,
        beds: p.beds || str(f.beds),
        baths: p.baths || str(f.baths),
        cars: p.cars || str(f.cars),
        homeSize: homeSize,
        landSize: landSize,
        totalPrice: totalPrice,
        consultantName: str(f.consultantName) || str(f.contactName),
        consultantPhone: str(f.consultantPhone) || str(f.contactPhone),
        consultantEmail: str(f.consultantEmail) || str(f.contactEmail),
        consultantOffice: str(f.consultantOffice) || str(f.contactOffice),
      };
    });
  } catch (err) {
    console.error("[listPublicPackages] Load error:", err);
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

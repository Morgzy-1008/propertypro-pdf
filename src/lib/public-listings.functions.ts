import { createServerFn } from "@tanstack/react-start";

/**
 * Customer-facing, read-only listings.
 *
 * These are the ONLY records ever exposed publicly: land lots with status
 * "available" and packages with status "live". Every field returned is
 * explicitly whitelisted below — internal notes, owner ids, timestamps,
 * review flags and any non-listed record can never leave the server.
 */

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

const RANGE_LABEL: Record<string, string> = {
  value: "Value Range",
  designer: "Designer Range",
  luxury: "Luxury Range",
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

/** Every land lot a customer may see, grouped client-side by location. */
export const listPublicLots = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("land_lots")
    .select(
      "estate, suburb, lot_number, address, land_size, frontage, land_price, titled, registration_date, developer, developer_contact_name, developer_contact_phone, developer_contact_email",
    )
    .eq("status", "available");

  return (data ?? []).map(
    (l): PublicLot => ({
      estate: l.estate || "Other",
      suburb: l.suburb || "",
      lotNumber: l.lot_number,
      address: l.address,
      landSize: l.land_size == null ? null : Number(l.land_size),
      frontage: l.frontage == null ? null : Number(l.frontage),
      landPrice: l.land_price == null ? null : Number(l.land_price),
      titled: Boolean(l.titled),
      registrationDate: l.registration_date,
      developer: l.developer,
      developerContactName: l.developer_contact_name,
      developerContactPhone: l.developer_contact_phone,
      developerContactEmail: l.developer_contact_email,
    }),
  );
});

/** Every live package a customer may see. */
export const listPublicPackages = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("packages")
    .select(
      "id, name, design, range_id, facade_name, beds, baths, cars, floorplan_size, total_price, flyer_data, lot_id",
    )
    .eq("status", "live");

  const rows = data ?? [];
  const lotIds = [...new Set(rows.map((r) => r.lot_id).filter(Boolean))] as string[];
  const lotMap = new Map<string, { estate: string; suburb: string; land_size: number | null }>();
  if (lotIds.length) {
    const { data: lots } = await supabaseAdmin
      .from("land_lots")
      .select("id, estate, suburb, land_size")
      .in("id", lotIds);
    for (const l of lots ?? [])
      lotMap.set(l.id, { estate: l.estate, suburb: l.suburb, land_size: l.land_size });
  }

  return rows.map((p): PublicPackage => {
    const f = (p.flyer_data ?? {}) as Record<string, unknown>;
    const lot = p.lot_id ? lotMap.get(p.lot_id) : undefined;
    return {
      id: p.id,
      name: p.name || p.design || "House & Land Package",
      design: p.design || "",
      facadeName: p.facade_name,
      rangeLabel: RANGE_LABEL[p.range_id] ?? "Inclusions",
      estate: lot?.estate || str(f.estate) || "Other",
      suburb: lot?.suburb || str(f.suburb) || "",
      address: str(f.address),
      beds: p.beds,
      baths: p.baths,
      cars: p.cars,
      homeSize: p.floorplan_size,
      landSize: lot?.land_size == null ? null : Number(lot.land_size),
      totalPrice: p.total_price == null ? null : Number(p.total_price),
      consultantName: str(f.contactName),
      consultantPhone: str(f.contactPhone),
      consultantEmail: str(f.contactEmail),
      consultantOffice: str(f.contactOffice),
    };
  });
});

/** Flyer content for one live package — used by the public flyer page. */
export const getPublicPackage = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => {
    const id = String(input?.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Not found");
    return { id };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("packages")
      .select("id, name, design, flyer_data, status")
      .eq("id", data.id)
      .eq("status", "live")
      .maybeSingle();
    if (!row) return null;

    const f = (row.flyer_data ?? {}) as Record<string, unknown>;

    // Whitelist: only flyer presentation fields are returned.
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
      // Serialized so the server-fn boundary stays strictly typed.
      flyerJson: JSON.stringify(flyer),
    };
  });

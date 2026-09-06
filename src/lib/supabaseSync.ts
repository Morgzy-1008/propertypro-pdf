import { supabase } from "@/integrations/supabase/client";
import {
  type Lot,
  type Pkg,
  generateSeedData,
  getLocalLots,
  getLocalPackages,
  saveLocalLots,
  saveLocalPackages,
} from "@/lib/databaseStorage";
import { toValidUuid, isValidUuid, generateUuid } from "@/lib/uuid";

const REALTIME_CHANNEL_NAME = "hudson_database_live_realtime";
const STAFF_AUTH_EMAIL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_STAFF_AUTH_EMAIL) ||
  "jesse.jenkins@hudsonhomes.com.au";
const STAFF_AUTH_PASS =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_STAFF_AUTH_PASS) ||
  "StoneBenchTop99";

let authPromise: Promise<boolean> | null = null;

/**
 * Ensures the Supabase client holds an active authenticated staff session.
 * This is required so Supabase Postgres Row Level Security (RLS) permits
 * INSERT, UPDATE, and DELETE operations on land_lots and packages.
 */
export async function ensureStaffSupabaseAuth(): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session?.user) {
      return true;
    }

    if (authPromise) return authPromise;

    authPromise = (async () => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: STAFF_AUTH_EMAIL,
          password: STAFF_AUTH_PASS,
        });
        if (error || !data.session) {
          console.warn("[supabaseSync] Staff auth warning:", error?.message);
          return false;
        }
        return true;
      } catch (err) {
        console.warn("[supabaseSync] Staff auth exception:", err);
        return false;
      } finally {
        authPromise = null;
      }
    })();

    return await authPromise;
  } catch {
    return false;
  }
}

/**
 * Normalizes a lot object so its properties strictly match Supabase land_lots columns.
 * (e.g. omitting 'state' which is not a physical column in Supabase schema).
 */
export function formatLotForSupabase(lot: Lot) {
  return {
    id: isValidUuid(lot.id) ? lot.id : (toValidUuid(lot.id) || generateUuid()),
    estate: lot.estate || "Hudson Estate",
    suburb: lot.suburb || "Queensland",
    developer: lot.developer || "",
    developer_contact_name: lot.developer_contact_name || null,
    developer_contact_phone: lot.developer_contact_phone || null,
    developer_contact_email: lot.developer_contact_email || null,
    lot_number: lot.lot_number || null,
    address: lot.address || null,
    land_size: lot.land_size != null ? Number(lot.land_size) : null,
    frontage: lot.frontage != null ? Number(lot.frontage) : null,
    land_price: lot.land_price != null ? Number(lot.land_price) : null,
    titled: !!lot.titled,
    registration_date: lot.registration_date || null,
    status: (lot.status || "available") as "available" | "on_hold" | "sold",
    deadline: lot.deadline || null,
    notes: lot.notes || null,
    exclusive_consultants: lot.exclusive_consultants || [],
    updated_at: new Date().toISOString(),
  };
}

/**
 * Normalizes a package object for Supabase packages table.
 */
export function formatPackageForSupabase(pkg: Pkg) {
  return {
    id: isValidUuid(pkg.id) ? pkg.id : (toValidUuid(pkg.id) || generateUuid()),
    lot_id: pkg.lot_id && isValidUuid(pkg.lot_id) ? pkg.lot_id : null,
    name: pkg.name || `${pkg.design} · House & Land`,
    housing_type: pkg.housing_type || "single-storey",
    design: pkg.design || "",
    range_id: pkg.range_id || "value",
    facade_name: pkg.facade_name || null,
    house_price: pkg.house_price != null ? Number(pkg.house_price) : null,
    land_price: pkg.land_price != null ? Number(pkg.land_price) : null,
    total_price: pkg.total_price != null ? Number(pkg.total_price) : null,
    beds: pkg.beds || "4",
    baths: pkg.baths || "2",
    cars: pkg.cars || "2",
    floorplan_size: pkg.floorplan_size ? String(pkg.floorplan_size) : null,
    status: (pkg.status === "sold" ? "sold" : pkg.status === "draft" ? "draft" : "live") as "draft" | "live" | "sold",
    needs_review: !!pkg.needs_review,
    flyer_data: (pkg.flyer_json || pkg.flyer_data || {}) as any,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Seeds the Supabase cloud database if it currently has 0 rows,
 * ensuring all connected NHCs see the complete set of lots and packages.
 */
export async function seedRemoteDatabaseIfEmpty(): Promise<{ seededLots: boolean; seededPkgs: boolean }> {
  await ensureStaffSupabaseAuth();
  let seededLots = false;
  let seededPkgs = false;

  try {
    const { count: lotCount, error: lotCountErr } = await supabase
      .from("land_lots")
      .select("id", { count: "exact", head: true });

    if (!lotCountErr && (lotCount === 0 || lotCount === null)) {
      const localLots = getLocalLots();
      const seed = localLots.length > 0 ? localLots : generateSeedData().lots;
      const formatted = seed.map(formatLotForSupabase);
      const { error: insertErr } = await supabase.from("land_lots").upsert(formatted);
      if (!insertErr) {
        console.log(`[supabaseSync] Successfully seeded ${formatted.length} lots to Supabase server`);
        seededLots = true;
      } else {
        console.warn("[supabaseSync] Lot seed warning:", insertErr);
      }
    }

    const { count: pkgCount, error: pkgCountErr } = await supabase
      .from("packages")
      .select("id", { count: "exact", head: true });

    if (!pkgCountErr && (pkgCount === 0 || pkgCount === null)) {
      const localPkgs = getLocalPackages();
      const seedPkgs = localPkgs.length > 0 ? localPkgs : generateSeedData().packages;
      const formatted = seedPkgs.map(formatPackageForSupabase);
      const { error: insertErr } = await supabase.from("packages").upsert(formatted);
      if (!insertErr) {
        console.log(`[supabaseSync] Successfully seeded ${formatted.length} packages to Supabase server`);
        seededPkgs = true;
      } else {
        console.warn("[supabaseSync] Package seed warning:", insertErr);
      }
    }
  } catch (e) {
    console.warn("[supabaseSync] Seed remote database exception:", e);
  }

  return { seededLots, seededPkgs };
}

let activeRealtimeChannel: ReturnType<typeof supabase.channel> | null = null;

/**
 * Gets or initializes the singleton Supabase Realtime channel.
 */
export function getRealtimeChannel() {
  if (!activeRealtimeChannel) {
    activeRealtimeChannel = supabase.channel(REALTIME_CHANNEL_NAME, {
      config: { broadcast: { self: false } },
    });
    activeRealtimeChannel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("[supabaseSync] Realtime WebSocket connected to cloud server");
      }
    });
  }
  return activeRealtimeChannel;
}

export type SyncPayload =
  | { action: "lot_updated"; lot: Lot }
  | { action: "lots_bulk_updated"; lots: Lot[] }
  | { action: "lot_deleted"; id: string }
  | { action: "lots_bulk_deleted"; ids: string[] }
  | { action: "lots_imported"; count: number }
  | { action: "package_updated"; package: Pkg }
  | { action: "packages_bulk_updated"; packages: Pkg[] }
  | { action: "package_deleted"; id: string }
  | { action: "packages_bulk_deleted"; ids: string[] }
  | { action: "database_full_sync"; timestamp: number };

/**
 * Broadcasts a mutation across all logged-in NHCs via Supabase Realtime WebSockets.
 */
export async function broadcastCloudChange(payload: SyncPayload): Promise<void> {
  try {
    const channel = getRealtimeChannel();
    await channel.send({
      type: "broadcast",
      event: "database_mutation",
      payload,
    });
  } catch (e) {
    console.warn("[supabaseSync] Broadcast error:", e);
  }
}

/**
 * Subscribes to real-time database mutations pushed by other NHCs.
 */
export function subscribeToCloudDatabaseSync(onMutation: (payload: SyncPayload) => void): () => void {
  const channel = getRealtimeChannel();
  channel.on("broadcast", { event: "database_mutation" }, (msg) => {
    if (msg.payload) {
      console.log("[supabaseSync] Received real-time cloud mutation:", msg.payload.action);
      onMutation(msg.payload as SyncPayload);
    }
  });

  return () => {
    // Keep channel active
  };
}

/**
 * Pushes a lot update directly to Supabase and broadcasts to all clients.
 */
export async function syncLotToSupabase(lot: Lot): Promise<boolean> {
  try {
    await ensureStaffSupabaseAuth();
    const formatted = formatLotForSupabase(lot);
    const { error } = await supabase.from("land_lots").upsert(formatted);
    if (error) {
      console.warn("[supabaseSync] Supabase upsert lot warning:", error);
      return false;
    }
    await broadcastCloudChange({ action: "lot_updated", lot });
    return true;
  } catch (e) {
    console.warn("[supabaseSync] syncLotToSupabase exception:", e);
    return false;
  }
}

/**
 * Deletes a lot from Supabase and broadcasts to all clients.
 */
export async function deleteLotFromSupabase(id: string): Promise<boolean> {
  try {
    await ensureStaffSupabaseAuth();
    const normalizedId = isValidUuid(id) ? id : (toValidUuid(id) || id);
    const { error } = await supabase.from("land_lots").delete().eq("id", normalizedId);
    if (error) {
      console.warn("[supabaseSync] Supabase delete lot warning:", error);
      return false;
    }
    await broadcastCloudChange({ action: "lot_deleted", id: normalizedId });
    return true;
  } catch (e) {
    console.warn("[supabaseSync] deleteLotFromSupabase exception:", e);
    return false;
  }
}

/**
 * Pushes a package update directly to Supabase and broadcasts to all clients.
 */
export async function syncPackageToSupabase(pkg: Pkg): Promise<boolean> {
  try {
    await ensureStaffSupabaseAuth();
    const formatted = formatPackageForSupabase(pkg);
    const { error } = await supabase.from("packages").upsert(formatted);
    if (error) {
      console.warn("[supabaseSync] Supabase upsert package warning:", error);
      return false;
    }
    await broadcastCloudChange({ action: "package_updated", package: pkg });
    return true;
  } catch (e) {
    console.warn("[supabaseSync] syncPackageToSupabase exception:", e);
    return false;
  }
}

/**
 * Deletes a package from Supabase and broadcasts to all clients.
 */
export async function deletePackageFromSupabase(id: string): Promise<boolean> {
  try {
    await ensureStaffSupabaseAuth();
    const normalizedId = isValidUuid(id) ? id : (toValidUuid(id) || id);
    const { error } = await supabase.from("packages").delete().eq("id", normalizedId);
    if (error) {
      console.warn("[supabaseSync] Supabase delete package warning:", error);
      return false;
    }
    await broadcastCloudChange({ action: "package_deleted", id: normalizedId });
    return true;
  } catch (e) {
    console.warn("[supabaseSync] deletePackageFromSupabase exception:", e);
    return false;
  }
}

/**
 * Pushes multiple lots to Supabase in a batch and broadcasts to all clients.
 */
export async function syncLotsBatchToSupabase(lots: Lot[]): Promise<boolean> {
  if (!lots.length) return true;
  try {
    await ensureStaffSupabaseAuth();
    const formatted = lots.map(formatLotForSupabase);
    const { error } = await supabase.from("land_lots").upsert(formatted);
    if (error) {
      console.warn("[supabaseSync] Batch lot upsert warning:", error);
      return false;
    }
    await broadcastCloudChange({ action: "lots_bulk_updated", lots });
    return true;
  } catch (e) {
    console.warn("[supabaseSync] syncLotsBatchToSupabase exception:", e);
    return false;
  }
}

/**
 * Deletes multiple lots from Supabase in a batch and broadcasts to all clients.
 */
export async function deleteLotsBatchFromSupabase(ids: string[]): Promise<boolean> {
  if (!ids.length) return true;
  try {
    await ensureStaffSupabaseAuth();
    const normalizedIds = ids.map((id) => (isValidUuid(id) ? id : (toValidUuid(id) || id)));
    const { error } = await supabase.from("land_lots").delete().in("id", normalizedIds);
    if (error) {
      console.warn("[supabaseSync] Batch lot delete warning:", error);
      return false;
    }
    await broadcastCloudChange({ action: "lots_bulk_deleted", ids: normalizedIds });
    return true;
  } catch (e) {
    console.warn("[supabaseSync] deleteLotsBatchFromSupabase exception:", e);
    return false;
  }
}

/**
 * Pushes multiple packages to Supabase in a batch and broadcasts to all clients.
 */
export async function syncPackagesBatchToSupabase(pkgs: Pkg[]): Promise<boolean> {
  if (!pkgs.length) return true;
  try {
    await ensureStaffSupabaseAuth();
    const formatted = pkgs.map(formatPackageForSupabase);
    const { error } = await supabase.from("packages").upsert(formatted);
    if (error) {
      console.warn("[supabaseSync] Batch package upsert warning:", error);
      return false;
    }
    await broadcastCloudChange({ action: "packages_bulk_updated", packages: pkgs });
    return true;
  } catch (e) {
    console.warn("[supabaseSync] syncPackagesBatchToSupabase exception:", e);
    return false;
  }
}

/**
 * Deletes multiple packages from Supabase in a batch and broadcasts to all clients.
 */
export async function deletePackagesBatchFromSupabase(ids: string[]): Promise<boolean> {
  if (!ids.length) return true;
  try {
    await ensureStaffSupabaseAuth();
    const normalizedIds = ids.map((id) => (isValidUuid(id) ? id : (toValidUuid(id) || id)));
    const { error } = await supabase.from("packages").delete().in("id", normalizedIds);
    if (error) {
      console.warn("[supabaseSync] Batch package delete warning:", error);
      return false;
    }
    await broadcastCloudChange({ action: "packages_bulk_deleted", ids: normalizedIds });
    return true;
  } catch (e) {
    console.warn("[supabaseSync] deletePackagesBatchFromSupabase exception:", e);
    return false;
  }
}

/**
 * Fetches fresh lots and packages directly from Supabase.
 */
export async function fetchRemoteLotsAndPackages(): Promise<{ lots: Lot[]; packages: Pkg[] } | null> {
  try {
    await ensureStaffSupabaseAuth();
    const [lotRes, pkgRes] = await Promise.all([
      supabase.from("land_lots").select("*").order("created_at", { ascending: false }),
      supabase.from("packages").select("*").order("created_at", { ascending: false }),
    ]);

    if (lotRes.error || pkgRes.error) {
      console.warn("[supabaseSync] Fetch error:", lotRes.error || pkgRes.error);
      return null;
    }

    const rawLots = (lotRes.data || []) as Record<string, unknown>[];
    const rawPkgs = (pkgRes.data || []) as Record<string, unknown>[];

    const lots: Lot[] = rawLots.map((r) => {
      const estate = String(r.estate || "");
      const suburb = String(r.suburb || "");
      const address = r.address ? String(r.address) : "";
      const text = `${estate} ${suburb} ${address}`.toLowerCase();
      const state: "QLD" | "NSW" =
        text.includes("nsw") ||
        text.includes("oran park") ||
        text.includes("watagan") ||
        text.includes("warnervale") ||
        text.includes("parramatta") ||
        text.includes("box hill") ||
        text.includes("marsden park") ||
        text.includes("calderwood") ||
        text.includes("austral") ||
        text.includes("menangle") ||
        text.includes("leppington")
          ? "NSW"
          : "QLD";

      return {
        id: String(r.id),
        estate,
        suburb,
        state,
        developer: r.developer ? String(r.developer) : null,
        developer_contact_name: r.developer_contact_name ? String(r.developer_contact_name) : null,
        developer_contact_phone: r.developer_contact_phone ? String(r.developer_contact_phone) : null,
        developer_contact_email: r.developer_contact_email ? String(r.developer_contact_email) : null,
        lot_number: r.lot_number ? String(r.lot_number) : null,
        address: r.address ? String(r.address) : null,
        land_size: r.land_size != null ? Number(r.land_size) : null,
        frontage: r.frontage != null ? Number(r.frontage) : null,
        land_price: r.land_price != null ? Number(r.land_price) : null,
        titled: Boolean(r.titled),
        registration_date: r.registration_date ? String(r.registration_date) : null,
        status: (r.status || "available") as Lot["status"],
        exclusive_consultants: Array.isArray(r.exclusive_consultants) ? (r.exclusive_consultants as string[]) : null,
        deadline: r.deadline ? String(r.deadline) : null,
        notes: r.notes ? String(r.notes) : null,
        updated_at: r.updated_at ? String(r.updated_at) : new Date().toISOString(),
      };
    });

    const packages: Pkg[] = rawPkgs.map((p) => {
      const lotId = p.lot_id ? String(p.lot_id) : null;
      const matchingLot = lots.find((l) => l.id === lotId);
      const state = matchingLot?.state || "QLD";

      return {
        id: String(p.id),
        lot_id: lotId,
        name: p.name ? String(p.name) : null,
        housing_type: p.housing_type ? String(p.housing_type) : "Single Storey",
        design: p.design ? String(p.design) : "",
        range_id: p.range_id ? String(p.range_id) : "value",
        facade_name: p.facade_name ? String(p.facade_name) : null,
        house_price: p.house_price != null ? Number(p.house_price) : null,
        land_price: p.land_price != null ? Number(p.land_price) : null,
        total_price: p.total_price != null ? Number(p.total_price) : null,
        beds: p.beds ? String(p.beds) : "4",
        baths: p.baths ? String(p.baths) : "2",
        cars: p.cars ? String(p.cars) : "2",
        floorplan_size: p.floorplan_size ? String(p.floorplan_size) : "200",
        state,
        status: (p.status || "live") as Pkg["status"],
        exclusive_consultants: Array.isArray(p.exclusive_consultants) ? (p.exclusive_consultants as string[]) : null,
        flyer_json: (p.flyer_data || null) as Record<string, unknown> | null,
        needs_review: Boolean(p.needs_review),
        updated_at: p.updated_at ? String(p.updated_at) : new Date().toISOString(),
      };
    });

    return { lots, packages };
  } catch (err) {
    console.warn("[supabaseSync] fetchRemoteLotsAndPackages exception:", err);
    return null;
  }
}

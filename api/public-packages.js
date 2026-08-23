import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { id } = req.query || {};

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://qdzvdpkzwhpchyvpflmd.supabase.co";

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_4ZqwAVBPvFHobRABfdhi9A_1L_ECgL9";

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (id) {
      const { data: pkg, error } = await supabase
        .from("packages")
        .select("*")
        .eq("id", id)
        .neq("status", "sold")
        .maybeSingle();

      if (error || !pkg) {
        return res.status(404).json({ error: "Package not found" });
      }

      let lot = null;
      if (pkg.lot_id) {
        const { data: lotData } = await supabase
          .from("land_lots")
          .select("*")
          .eq("id", pkg.lot_id)
          .maybeSingle();
        lot = lotData;
      }

      return res.status(200).json({ package: { ...pkg, land_lots: lot } });
    }

    const { data: packages, error: pkgError } = await supabase
      .from("packages")
      .select("*")
      .neq("status", "sold")
      .order("created_at", { ascending: false });

    if (pkgError) {
      console.error("[api/public-packages] Error:", pkgError);
      return res.status(200).json({ packages: [] });
    }

    const { data: lots } = await supabase.from("land_lots").select("*");
    const lotsMap = new Map((lots || []).map((l) => [l.id, l]));

    const result = (packages || []).map((p) => {
      const lot = p.lot_id ? lotsMap.get(p.lot_id) : null;
      return {
        ...p,
        land_lots: lot || null,
      };
    });

    return res.status(200).json({ packages: result });
  } catch (err) {
    console.error("[api/public-packages] Fatal:", err);
    return res.status(500).json({ error: err.message });
  }
}

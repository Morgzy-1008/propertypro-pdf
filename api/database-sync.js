import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

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

    // Ensure staff authentication on Supabase client if service role is not active
    const staffEmail = process.env.STAFF_AUTH_EMAIL || process.env.VITE_STAFF_AUTH_EMAIL || "adrian.baxter@hudsonhomes.com.au";
    const staffPass = process.env.STAFF_AUTH_PASS || process.env.VITE_STAFF_AUTH_PASS || "StoneBenchTop99";
    try {
      await supabase.auth.signInWithPassword({ email: staffEmail, password: staffPass });
    } catch {}

    // POST: Upsert lots and/or packages
    if (req.method === "POST") {
      const { lots, packages } = req.body || {};
      let lotsUpserted = 0;
      let pkgsUpserted = 0;

      if (Array.isArray(lots) && lots.length > 0) {
        // Chunk upserts into blocks of 50
        const chunkSize = 50;
        for (let i = 0; i < lots.length; i += chunkSize) {
          const chunk = lots.slice(i, i + chunkSize);
          const { error } = await supabase.from("land_lots").upsert(chunk);
          if (error) {
            console.warn("[api/database-sync] Lot upsert error:", error);
          } else {
            lotsUpserted += chunk.length;
          }
        }
      }

      if (Array.isArray(packages) && packages.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < packages.length; i += chunkSize) {
          const chunk = packages.slice(i, i + chunkSize);
          const { error } = await supabase.from("packages").upsert(chunk);
          if (error) {
            console.warn("[api/database-sync] Package upsert error:", error);
          } else {
            pkgsUpserted += chunk.length;
          }
        }
      }

      return res.status(200).json({
        success: true,
        lotsUpserted,
        pkgsUpserted,
        timestamp: new Date().toISOString(),
      });
    }

    // GET: Fetch all lots and packages
    const [lotRes, pkgRes] = await Promise.all([
      supabase.from("land_lots").select("*").order("created_at", { ascending: false }).limit(2000),
      supabase.from("packages").select("*").not("name", "like", "Tender Request%").order("created_at", { ascending: false }).limit(2000),
    ]);

    if (lotRes.error) {
      console.warn("[api/database-sync] land_lots select error:", lotRes.error);
    }
    if (pkgRes.error) {
      console.warn("[api/database-sync] packages select error:", pkgRes.error);
    }

    return res.status(200).json({
      success: true,
      lots: lotRes.data || [],
      packages: pkgRes.data || [],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[api/database-sync] Fatal error:", err);
    return res.status(500).json({ error: err.message });
  }
}

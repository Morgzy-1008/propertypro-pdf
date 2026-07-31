import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Verifies the request carries a valid Supabase session belonging to approved
 * Hudson staff. Returns a Response to send back when the caller is not allowed,
 * or null when the request may proceed.
 */
export async function requireStaff(request: Request): Promise<Response | null> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.error("[auth] Missing Supabase server environment variables");
    return Response.json({ error: "Server not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length).trim();
  if (token.split(".").length !== 3) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (headers.get("Authorization") === `Bearer ${SUPABASE_PUBLISHABLE_KEY}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
        return fetch(input, { ...init, headers });
      },
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // approved_staff is only readable by approved staff (RLS), so a non-empty
  // result proves the caller is staff without exposing an API-callable helper.
  const { data: staffRows, error: staffError } = await supabase
    .from("approved_staff")
    .select("email")
    .limit(1);
  if (staffError || !staffRows || staffRows.length === 0) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

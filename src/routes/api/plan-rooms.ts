import { createFileRoute } from "@tanstack/react-router";
import { requireStaff } from "@/lib/require-auth.server";

/**
 * Counts the sleeping and bathing rooms actually drawn on a floorplan so the
 * flyer can advertise the real totals. Published specs often exclude a GUEST
 * bedroom and never count a powder room, which understates the home.
 * The model only reads the drawing — it never returns an edited image.
 */
const PROMPT = `You are reading an architectural floor plan drawing. Count rooms by their printed labels only.

Reply with JSON only, no prose, in exactly this shape:
{"bedrooms":4,"guest":1,"bathrooms":2,"ensuites":1,"powder":1}

Rules:
- bedrooms: number of rooms labelled BED / BEDROOM / BED 1..n / MASTER / MASTER SUITE. Do NOT include guest rooms here.
- guest: number of rooms labelled GUEST, GUEST BED, GUEST BEDROOM or GUEST SUITE that are clearly a bedroom (not a guest WC).
- bathrooms: number of rooms labelled BATH / BATHRM / BATHROOM / MAIN BATH / FAMILY BATH / KIDS BATH. A room labelled with BOTH ensuite and bath (ENS/BATH, BATH/ENS, ENSUITE & BATH) is ONE room — count it once here and NOT in ensuites.
- ensuites: number of rooms labelled ENS / ENS. / E'SUITE / ENSUITE / WIR-ENSUITE / MASTER ENSUITE, including a second or third ensuite off any other bedroom. Count every one you can see, even when the label is tiny, rotated or abbreviated.
- powder: number of separate toilet-only rooms labelled PWDR / PDR / PWD / POWDER / POWDER ROOM / WC / TOILET. Count a standalone WC or TOILET room here too, but do NOT count a WC drawn inside a bathroom or ensuite.
- Rooms such as STUDY, MEDIA, ACTIVITY, THEATRE, OFFICE, LAUNDRY are NOT bedrooms or bathrooms.
- Scan the WHOLE drawing including every floor/level shown, and read small abbreviated labels carefully.
- Every value must be an integer. Use 0 when none are present.`;

export const Route = createFileRoute("/api/plan-rooms")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await requireStaff(request);
        if (denied) return denied;

        const body = (await request.json()) as { dataUrl?: string };
        const dataUrl = body.dataUrl;
        if (!dataUrl?.startsWith("data:image/")) {
          return Response.json({ error: "Invalid image" }, { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "Missing LOVABLE_API_KEY" }, { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: PROMPT },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
            response_format: { type: "json_object" },
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return Response.json({ error: text || "Read failed" }, { status: upstream.status });
        }

        const json = (await upstream.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        try {
          return Response.json(JSON.parse(json.choices?.[0]?.message?.content ?? ""));
        } catch {
          return Response.json({});
        }
      },
    },
  },
});

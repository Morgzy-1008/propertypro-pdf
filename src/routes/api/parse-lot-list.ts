import { createFileRoute } from "@tanstack/react-router";
import { requireStaff } from "@/lib/require-auth.server";


const PROMPT = `You are reading a residential land developer's price list / stock list for a QLD estate.
Extract EVERY land lot row you can see. Return STRICT JSON only, no markdown, in this shape:

{"estate":"","suburb":"","developer":"","lots":[{"lot_number":"","address":"","land_size":0,"frontage":0,"land_price":0,"registration_date":"YYYY-MM-DD","titled":false,"status":"available","notes":""}]}

Rules:
- estate/suburb/developer come from the document header if present.
- land_size is m2, frontage is metres, land_price is a plain number (no $ or commas).
- If a lot is described as titled/registered/"registered now", set titled=true and registration_date=null.
- If registration is a quarter or month (e.g. "Q3 2026", "Mar 2026"), use the first day of that period.
- status: "sold" if marked sold, "on_hold" if held/deposited, otherwise "available".
- Omit fields you cannot read (use null). Never invent lots.`;

export const Route = createFileRoute("/api/parse-lot-list")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await requireStaff(request);
        if (denied) return denied;

        const body = (await request.json()) as { pages?: string[] };

        const pages = (body.pages ?? []).filter((p) => p?.startsWith("data:image/")).slice(0, 12);
        if (!pages.length) return Response.json({ error: "No pages supplied" }, { status: 400 });

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
                  ...pages.map((url) => ({ type: "image_url", image_url: { url } })),
                ],
              },
            ],
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return Response.json({ error: text || "Parse failed" }, { status: upstream.status });
        }

        const json = (await upstream.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const raw = json.choices?.[0]?.message?.content ?? "";
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) return Response.json({ error: "No lots found in that file" }, { status: 422 });

        try {
          return Response.json(JSON.parse(match[0]));
        } catch {
          return Response.json({ error: "Could not read the price list" }, { status: 422 });
        }
      },
    },
  },
});

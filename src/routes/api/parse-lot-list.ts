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

        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        const lovableKey = process.env.LOVABLE_API_KEY;
        if (!geminiKey && !lovableKey) {
          return Response.json({ error: "Missing API Key" }, { status: 500 });
        }

        let raw = "";

        if (geminiKey) {
          const parts: unknown[] = [{ text: PROMPT }];
          for (const p of pages) {
            const match = p.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
              parts.push({
                inline_data: { mime_type: match[1], data: match[2] },
              });
            }
          }
          const upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ contents: [{ parts }] }),
            },
          );

          if (upstream.ok) {
            const json = (await upstream.json()) as {
              candidates?: { content?: { parts?: { text?: string }[] } }[];
            };
            raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          }
        }

        if (!raw && lovableKey) {
          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
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

          if (upstream.ok) {
            const json = (await upstream.json()) as {
              choices?: { message?: { content?: string } }[];
            };
            raw = json.choices?.[0]?.message?.content ?? "";
          }
        }

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

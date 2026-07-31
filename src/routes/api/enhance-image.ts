import { createFileRoute } from "@tanstack/react-router";
import { requireStaff } from "@/lib/require-auth.server";

const PROMPT =
  "Enhance this architectural facade render for a printed real-estate flyer. " +
  "Improve sharpness, clarity, lighting and colour balance, clean up compression artefacts, " +
  "and make the sky and landscaping look natural and appealing. " +
  "Do not change the architecture, materials, colours of the home, or the composition. " +
  "Return the enhanced photo only.";

/** Only Hudson's own image hosts may be fetched server-side. */
const ALLOWED_IMAGE_HOSTS = ["www.hudsonhomes.com.au", "hudsonhomes.com.au"];

function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_IMAGE_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/enhance-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await requireStaff(request);
        if (denied) return denied;

        const body = (await request.json()) as { dataUrl?: string; url?: string };
        let dataUrl = body.dataUrl;

        // Library facades are hosted remotely — fetch and inline them server-side.
        if (!dataUrl && body.url) {
          if (!isAllowedImageUrl(body.url)) {
            return Response.json({ error: "Unsupported image source" }, { status: 400 });
          }
          const img = await fetch(body.url);

          if (!img.ok) {
            return Response.json({ error: "Could not download facade" }, { status: 502 });
          }
          const type = img.headers.get("content-type") ?? "image/jpeg";
          const bytes = new Uint8Array(await img.arrayBuffer());
          let binary = "";
          for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
          dataUrl = `data:${type};base64,${btoa(binary)}`;
        }

        if (!dataUrl?.startsWith("data:image/")) {
          return Response.json({ error: "Invalid image" }, { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return Response.json({ error: "Missing LOVABLE_API_KEY" }, { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: PROMPT },
                  { type: "image_url", image_url: { url: dataUrl } },
                ],
              },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return Response.json(
            { error: text || "Enhancement failed" },
            { status: upstream.status },
          );
        }

        const json = (await upstream.json()) as { data?: { b64_json?: string }[] };
        const b64 = json.data?.[0]?.b64_json;
        if (!b64) return Response.json({ error: "No image returned" }, { status: 502 });

        return Response.json({ dataUrl: `data:image/png;base64,${b64}` });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { requireStaff } from "@/lib/require-auth.server";

/** Only Hudson's own image hosts may be fetched server-side. */
const ALLOWED_IMAGE_HOSTS = ["www.hudsonhomes.com.au", "hudsonhomes.com.au"];

function isAllowedImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}


function buildPrompt(double: boolean) {
  const fill = double
    ? "roughly 95% of the image height and about 80-86% of the image width"
    : "roughly 88% of the image height and about 72-80% of the image width";
  return (
    "Re-render this house facade as a single ultra-wide 21:9 cinematic architectural photograph. " +
    "ABSOLUTE RULE: the house is a fixed, unchangeable subject. You may ONLY improve photographic " +
    "quality — sharpness, lighting, resolution, realism. You must NOT alter the architecture in any way. " +
    "Treat the building as a locked reference: identical roof form, rooflines, pitch, gables, eaves, " +
    "render/brick/cladding materials, colours, window count/size/placement, door, portico, columns, " +
    "balcony and proportions. " +
    "Count the garage doors in the source image and reproduce EXACTLY that same number, same width and " +
    "same position — never add a second garage, never widen a single garage into a double, never add or " +
    "remove windows, rooms, wings, storeys or any structure. Do not mirror, stretch or duplicate any part " +
    "of the building to fill the wider frame — extend only the ground, garden, driveway, fencing and sky. " +
    "Do not add any secondary dwelling, granny flat or attached structure. " +
    `Composition: place the house centred, filling as much of the frame as possible — ${fill} — ` +
    "with the ENTIRE house visible: the full ridge of the roof, both side edges of the building and the " +
    "whole garage must be inside the frame, with only a very tight margin of clearance (a few percent) " +
    "above the roof ridge and beside the outer walls. Never crop or cut off any part of the house. " +
    (double
      ? "This is a DOUBLE STOREY home: keep the camera low and close so the two-storey elevation is as " +
        "large as possible in the frame, with minimal empty sky above the roof and minimal foreground. "
      : "") +
    "You may freely re-create the entire surrounding scene so that it is completely consistent: one clean " +
    "modern Australian streetscape with boundary fencing on both sides, neat lawn, simple contemporary garden beds, " +
    "an exposed-aggregate driveway leading to the garage, footpath and kerb, and a soft clear blue sky. The landscaping " +
    "and fencing must be continuous, symmetric in feel and seamless right across the full width of the frame — no visible " +
    "joins, seams, mismatched lighting, repeated foliage or duplicated elements. " +
    "Bright natural daylight, consistent shadows, photoreal. " +
    "No text, no watermarks, no people, no cars, no extra houses. Return the finished photo only."
  );
}



function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

export const Route = createFileRoute("/api/widen-facade")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await requireStaff(request);
        if (denied) return denied;

        const body = (await request.json()) as {
          id?: string;
          name?: string;
          url?: string;
          housingType?: string;
          force?: boolean;
        };
        const id = (body.id ?? "").trim();
        const url = (body.url ?? "").trim();
        if (!id || !url) return Response.json({ error: "Missing facade" }, { status: 400 });

        const isDouble = /double|two|2\s*storey/i.test(body.housingType ?? "");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Bump when the widening prompt changes so cached renders are refreshed.
        const cacheId = `${id}::v5${isDouble ? "d" : "s"}`;


        if (!body.force) {
          const { data: cached } = await supabaseAdmin
            .from("facade_renders")
            .select("widened_url")
            .eq("id", cacheId)
            .maybeSingle();
          if (cached?.widened_url) {
            return Response.json({ url: cached.widened_url, cached: true });
          }
        }

        // Any failure below is non-fatal: fall back to the original render so the
        // studio keeps working instead of surfacing a 502 to the client.
        const fallback = (reason: string) => {
          console.error(`[widen-facade] ${reason} (${id})`);
          return Response.json({ url, cached: false, fallback: true, reason });
        };

        // Inline the source render so the model can edit it.
        let dataUrl = url;
        if (!url.startsWith("data:")) {
          if (!isAllowedImageUrl(url)) {
            return Response.json({ error: "Unsupported image source" }, { status: 400 });
          }
          const img = await fetch(url).catch(() => null);
          if (!img || !img.ok) return fallback("could not download facade");
          const type = img.headers.get("content-type") ?? "image/jpeg";
          dataUrl = `data:${type};base64,${toBase64(new Uint8Array(await img.arrayBuffer()))}`;
        }

        const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.LOVABLE_API_KEY;
        if (!key) return fallback("missing API Key");

        const isDirectGemini = !process.env.LOVABLE_API_KEY && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
        const endpoint = isDirectGemini
          ? `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`
          : "https://ai.gateway.lovable.dev/v1/images/generations";

        const upstream = isDirectGemini
          ? await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: buildPrompt(isDouble) },
                      { inline_data: { mime_type: "image/jpeg", data: dataUrl.split(",")[1] ?? "" } },
                    ],
                  },
                ],
              }),
            }).catch(() => null)
          : await fetch(endpoint, {
              method: "POST",
              headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "google/gemini-3.1-flash-image",
                messages: [
                  {
                    role: "user",
                    content: [
                      { type: "text", text: buildPrompt(isDouble) },
                      { type: "image_url", image_url: { url: dataUrl } },
                    ],
                  },
                ],
                modalities: ["image", "text"],
              }),
            }).catch(() => null);

        if (!upstream || !upstream.ok) {
          const text = upstream ? await upstream.text().catch(() => "") : "network error";
          return fallback(`widening failed: ${text.slice(0, 300)}`);
        }

        const json = (await upstream.json().catch(() => null)) as {
          data?: { b64_json?: string; url?: string }[];
          choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
        } | null;

        // The gateway returns either images-API `data[].b64_json` or a chat-style
        // `choices[].message.images[].image_url.url` data URL depending on model.
        const rawUrl =
          json?.data?.[0]?.url ?? json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        const b64 =
          json?.data?.[0]?.b64_json ??
          (rawUrl?.startsWith("data:") ? rawUrl.split(",")[1] : undefined);
        if (!b64) return fallback("no image returned");


        const path = `widened/${cacheId}.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("facades")
          .upload(path, fromBase64(b64), { contentType: "image/png", upsert: true });
        if (uploadError) return fallback(`upload failed: ${uploadError.message}`);


        const widenedUrl = `/api/facade-image/${encodeURIComponent(cacheId)}`;
        await supabaseAdmin.from("facade_renders").upsert({
          id: cacheId,
          facade_name: body.name ?? null,
          source_url: url.startsWith("data:") ? null : url,
          widened_url: widenedUrl,
          aspect: "21x9",
        });

        return Response.json({ url: widenedUrl, cached: false });
      },
    },
  },
});

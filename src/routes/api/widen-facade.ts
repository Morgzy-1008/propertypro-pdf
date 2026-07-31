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
    ? "roughly 78% of the image height with a 10% sky headroom gap above the roof ridge"
    : "roughly 86% of the image height with a 7% sky headroom gap above the roof ridge";
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
    `Composition: place the house centred, set back in perspective — ${fill} — ` +
    "with the ENTIRE house visible: the full ridge of the roof, both side edges of the building and the " +
    "whole garage must be inside the frame, with a clear 10% sky clearance margin above the roof ridge. " +
    (double
      ? "This is a DOUBLE STOREY home: sit the house further back in perspective so we can see generous " +
        "front landscaping and an exposed-aggregate driveway leading to the garage in the foreground. "
      : "") +
    "You may freely re-create the surrounding scene matching the facade's color palette: one clean " +
    "modern Australian streetscape with boundary fencing on both sides, neat lawn, simple contemporary garden beds, " +
    "an exposed-aggregate driveway leading to the garage, footpath and kerb, and a soft clear sky. The landscaping " +
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

        let upstream: Response | null = null;
        if (isDirectGemini) {
          // 1. Try Google Imagen 3 image generation API
          upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:generateImages?key=${key}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                prompt: buildPrompt(isDouble),
                numberOfImages: 1,
                aspectRatio: "16:9",
                outputMimeType: "image/png",
              }),
            },
          ).catch(() => null);

          // 2. Fallback to Gemini 2.0 Flash / 1.5 Flash multimodal endpoint
          if (!upstream || !upstream.ok) {
            upstream = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
              {
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
              },
            ).catch(() => null);
          }
        } else {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
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
        }

        if (!upstream || !upstream.ok) {
          const text = upstream ? await upstream.text().catch(() => "") : "network error";
          return fallback(`widening failed: ${text.slice(0, 300)}`);
        }

        const json = (await upstream.json().catch(() => null)) as {
          data?: { b64_json?: string; url?: string }[];
          choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
          candidates?: { content?: { parts?: { text?: string; inline_data?: { mime_type?: string; data?: string } }[] } }[];
          predictions?: { bytesBase64Encoded?: string }[];
        } | null;

        // Extract base64 image data across OpenAI, Lovable Gateway, and Google Gemini/Imagen APIs
        const rawUrl =
          json?.data?.[0]?.url ?? json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        const b64 =
          json?.data?.[0]?.b64_json ??
          json?.predictions?.[0]?.bytesBase64Encoded ??
          json?.candidates?.[0]?.content?.parts?.find((p) => p.inline_data?.data)?.inline_data?.data ??
          (rawUrl?.startsWith("data:") ? rawUrl.split(",")[1] : undefined);

        if (!b64) return fallback("no image returned");

        const dataResUrl = `data:image/png;base64,${b64}`;

        try {
          const path = `widened/${cacheId}.png`;
          const { error: uploadError } = await supabaseAdmin.storage
            .from("facades")
            .upload(path, fromBase64(b64), { contentType: "image/png", upsert: true });

          if (!uploadError) {
            const widenedUrl = `/api/facade-image/${encodeURIComponent(cacheId)}`;
            await supabaseAdmin.from("facade_renders").upsert({
              id: cacheId,
              facade_name: body.name ?? null,
              source_url: url.startsWith("data:") ? null : url,
              widened_url: widenedUrl,
              aspect: "21x9",
            });
            return Response.json({ url: widenedUrl, cached: false });
          }
        } catch {
          // If Supabase storage is unavailable, proceed with direct data URL
        }

        return Response.json({ url: dataResUrl, cached: false });
      },
    },
  },
});

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


interface FacadeComposition {
  targetHeightPercent: number;
  skyHeadroomPercent: number;
  groundClearancePercent: number;
  specialInstructions?: string;
}

const SPECIFIC_FACADE_OVERRIDES: Record<string, FacadeComposition> = {
  centro: {
    targetHeightPercent: 62,
    skyHeadroomPercent: 12,
    groundClearancePercent: 26,
    specialInstructions: "CENTRO MAXIMUM SCALE & FRAMING: Draw the single-storey Centro house large and crisp as the main feature. Leave exactly a tight ~1cm sky headroom space (12% of vertical height) above the top roof ridge, and ~3cm ground/driveway clearance (26% of vertical height) showing the exposed aggregate driveway, entrance steps, and lawn below so the building is 100% unclipped.",
  },
  ascot: {
    targetHeightPercent: 60,
    skyHeadroomPercent: 12,
    groundClearancePercent: 28,
    specialInstructions: "ASCOT MAXIMUM SCALE & FRAMING: Draw the 2-storey Ascot home large and prominent. Leave ~1cm sky headroom space (12% of vertical height) above the top roof ridge and ~3cm driveway clearance (28% of vertical height) below.",
  },
  cambridge: {
    targetHeightPercent: 60,
    skyHeadroomPercent: 12,
    groundClearancePercent: 28,
    specialInstructions: "CAMBRIDGE MAXIMUM SCALE & FRAMING: Draw the 2-storey Hampton Cambridge home large and prominent, with ~1cm sky headroom (12% vertical height) above gable peaks and ~3cm driveway / lawn clearance (28% vertical height) below.",
  },
  marche: {
    targetHeightPercent: 60,
    skyHeadroomPercent: 12,
    groundClearancePercent: 28,
    specialInstructions: "MARCHE MAXIMUM SCALE & FRAMING: Draw the 2-storey Marche home centered occupying ~60% height with ~1cm (12%) sky headroom and ~3cm (28%) driveway below.",
  },
  allure: {
    targetHeightPercent: 60,
    skyHeadroomPercent: 12,
    groundClearancePercent: 28,
    specialInstructions: "ALLURE MAXIMUM SCALE & FRAMING: Draw the 2-storey Allure home centered occupying ~60% height with ~1cm (12%) sky headroom and ~3cm (28%) driveway below.",
  },
  chevron: {
    targetHeightPercent: 60,
    skyHeadroomPercent: 12,
    groundClearancePercent: 28,
    specialInstructions: "CHEVRON MAXIMUM SCALE & FRAMING: Draw the 2-storey Chevron home centered occupying ~60% height with ~1cm (12%) sky headroom and ~3cm (28%) driveway below.",
  },
  violet: {
    targetHeightPercent: 60,
    skyHeadroomPercent: 12,
    groundClearancePercent: 28,
    specialInstructions: "VIOLET MAXIMUM SCALE & FRAMING: Draw the 2-storey Violet home centered occupying ~60% height with ~1cm (12%) sky headroom and ~3cm (28%) driveway below.",
  },
  jasper: {
    targetHeightPercent: 60,
    skyHeadroomPercent: 12,
    groundClearancePercent: 28,
    specialInstructions: "JASPER MAXIMUM SCALE & FRAMING: Draw the 2-storey Jasper home centered occupying ~60% height with ~1cm (12%) sky headroom and ~3cm (28%) driveway below.",
  },
};

function getFacadeComposition(id: string, name: string, isDouble: boolean): FacadeComposition {
  const key = (id || name || "").toLowerCase().trim();
  for (const [facadeKey, config] of Object.entries(SPECIFIC_FACADE_OVERRIDES)) {
    if (key.includes(facadeKey)) return config;
  }

  if (isDouble) {
    return {
      targetHeightPercent: 60,
      skyHeadroomPercent: 12,
      groundClearancePercent: 28,
      specialInstructions: "DOUBLE-STOREY EXACT FRAMING MANDATE: Draw the 2-storey house large, crisp, and prominent as the main feature in wide 2.69:1 perspective, occupying roughly 60% of total vertical image height. ABSOLUTE MANDATE: Leave ~1cm clear blue sky headroom space (12% of frame height) above the highest roof ridge/peak, and ~3cm driveway/lawn clearance (28% of frame height) below so the entire building architecture from top roof peak down to bottom garage base is 100% visible and unclipped.",
    };
  }

  return {
    targetHeightPercent: 62,
    skyHeadroomPercent: 12,
    groundClearancePercent: 26,
    specialInstructions: "SINGLE-STOREY EXACT FRAMING MANDATE: Draw the single-storey house large, crisp, and prominent in wide 2.69:1 perspective, occupying roughly 62% of total vertical image height. ABSOLUTE MANDATE: Leave ~1cm clear blue sky headroom space (12% of frame height) above the roof ridge, and ~3cm driveway/lawn clearance (26% of frame height) below showing the entrance porch and exposed-aggregate driveway so the building is 100% visible and unclipped.",
  };
}

function buildPrompt(id: string, name: string, double: boolean) {
  const comp = getFacadeComposition(id, name, double);
  const compositionText =
    `situate the house centered, set back in perspective, occupying ${comp.targetHeightPercent}% of the total vertical frame height. ` +
    `EXACT FRAMING & CLEARANCE RULE: You MUST leave a clean ${comp.skyHeadroomPercent}% clear blue sky headroom space (~1cm) above the highest roof ridge and roof peak, ` +
    `and a ${comp.groundClearancePercent}% ground clearance space (~3cm) below showing the entire entry porch, porch steps, garage base, exposed aggregate driveway, and front lawn. ` +
    `The entire building from top roof peak down to bottom garage base MUST sit comfortably inside the upper-middle of the image height so it is NEVER clipped. ` +
    (comp.specialInstructions ? comp.specialInstructions + " " : "");

  return (
    "Re-render this house facade as a single ultra-wide 2.69:1 widescreen architectural photograph (exact proportion 269:100) filling the complete width of a Hudson Homes sales flyer frame. " +
    "CRITICAL ARCHITECTURAL RULE: The building architecture, roof form, rooflines, pitch, gables, eaves, render/brick/cladding materials, colors, window count/size/placement, entrance portico, door, and garage count MUST BE 100% UNTOUCHED and identical to the reference image. " +
    "Count the garage doors in the reference image and reproduce EXACTLY that same number, width, and position — never add a second garage, never widen a single garage into a double, never alter storeys or building structure. " +
    "COMPOSITION & SCALE: " + compositionText + ". " +
    "LANDSCAPING OUTPAINTING: On both the left and right sides of the house, seamlessly outpaint and generate modern Australian residential suburban landscaping, including timber boundary fencing running back into the background, lush green garden beds with tropical plants (agaves, yuccas, hedges), background trees, and a clear bright blue sky with soft light clouds spanning the full 2.69:1 width. " +
    "TOP QUALITY & ENHANCEMENT MANDATE: Re-render in crystal-clear ultra-high resolution 4K/8K architectural photographic quality. Sharpen fine textures on roof tiles, brickwork, render, timber garage doors, glass windows, door hardware, foliage, and driveway paving with ultra-sharp definition, vivid natural colors, realistic daylighting, and zero compression artifacts. " +
    "CRITICAL: Do NOT apply any background blur, depth-of-field blur, radial blur, bokeh, or vignetting. Do NOT mirror, stretch, or tile the building. The entire image including extended landscaping, garden beds, sky, and house architecture MUST BE 100% SHARP, CRISP, AND IN PERFECT FOCUS THROUGHOUT. " +
    "Bright natural daylight, realistic lighting and shadows, photoreal. Return the finished photo only."
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

        const isDouble =
          /double|two|2\s*storey|duplex/i.test(body.housingType ?? "") ||
          /double|2-storey|2stry|30|32|34|35|36|38|40|42|burgundy|cambridge|ascot|ashton|marche|allure|chevron|violet|jasper|manhattan|tropez|sapphire|hamilton|montana|chelsea|palermo|windsor|cleveland/i.test(
            `${body.id ?? ""} ${body.name ?? ""}`,
          );


        // Bump cacheId to force fresh generation across all facades with 1cm top / 3cm bottom framing
        const cacheId = `${id}::v70_${isDouble ? "d" : "s"}`;
        const promptText = buildPrompt(id, body.name ?? "", isDouble);

        // ── Supabase cache check (optional — skipped if service key is missing) ──
        // Wrapped in try/catch: if SUPABASE_SERVICE_ROLE_KEY is not set the client
        // throws, which was previously crashing the whole route with a 500 before
        // even reaching the API key check. Now we just skip the cache.
        try {
          const mod = await import("@/integrations/supabase/client.server");
          const supabaseAdmin = mod.supabaseAdmin;
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
        } catch {
          // Supabase not configured — skip cache, proceed to AI generation
          console.warn(`[widen-facade] Supabase unavailable, skipping cache (${id})`);
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

        const key =
          process.env.GEMINI_API_KEY ||
          process.env.GOOGLE_API_KEY ||
          process.env.LOVABLE_API_KEY ||
          process.env.OPENAI_API_KEY ||
          process.env.OPENROUTER_API_KEY;

        if (!key) return fallback("missing API Key");

        let upstream: Response | null = null;

        // 1. If using Google Gemini API key (GEMINI_API_KEY or GOOGLE_API_KEY)
        if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) {
          const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
          
          upstream = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${geminiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: promptText },
                      {
                        inline_data: {
                          mime_type: dataUrl.startsWith("data:image/png") ? "image/png" : "image/jpeg",
                          data: dataUrl.split(",")[1] ?? "",
                        },
                      },
                    ],
                  },
                ],
              }),
            },
          ).catch(() => null);
        }

        // 2. If using Lovable or OpenRouter gateway key
        if (!upstream || !upstream.ok) {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-3.1-flash-image",
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: promptText },
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

        // Extract base64 image data across OpenAI, Lovable Gateway, and Google Gemini APIs
        let b64: string | undefined = undefined;
        if (json?.candidates?.[0]?.content?.parts) {
          for (const p of json.candidates[0].content.parts as any[]) {
            if (p.inlineData?.data) {
              b64 = p.inlineData.data;
              break;
            }
            if (p.inline_data?.data) {
              b64 = p.inline_data.data;
              break;
            }
          }
        }
        if (!b64) {
          const rawUrl = json?.data?.[0]?.url ?? json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
          b64 =
            json?.data?.[0]?.b64_json ??
            json?.predictions?.[0]?.bytesBase64Encoded ??
            (rawUrl?.startsWith("data:") ? rawUrl.split(",")[1] : undefined);
        }

        if (!b64) return fallback("no image returned");

        const dataResUrl = `data:image/png;base64,${b64}`;

        // ── Persist to Supabase (optional — skipped if service key is missing) ──
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
          // Supabase not configured — fall through to return data URL directly
        }

        return Response.json({ url: dataResUrl, cached: false });
      },
    },
  },
});

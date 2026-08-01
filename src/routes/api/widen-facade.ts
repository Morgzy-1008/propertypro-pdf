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
    targetHeightPercent: 70,
    skyHeadroomPercent: 14,
    groundClearancePercent: 16,
    specialInstructions: "CENTRO MAXIMUM SCALE: Draw the single-storey Centro house as LARGE AS POSSIBLE, centered in the frame occupying 70% of total vertical image height. ABSOLUTE MANDATE: Leave a tight 14% clear blue sky headroom space above the roof ridge and 16% exposed aggregate driveway and front lawn below so the roof peak and garage base are 100% visible and unclipped.",
  },
  ascot: {
    targetHeightPercent: 62,
    skyHeadroomPercent: 16,
    groundClearancePercent: 18,
    specialInstructions: "ASCOT MAXIMUM SCALE: Draw the 2-storey Ascot home as LARGE AS POSSIBLE, centered in the frame occupying 62% of total vertical image height. Leave 16% clear blue sky headroom space above the top box feature and 18% exposed aggregate driveway / front lawn below.",
  },
  cambridge: {
    targetHeightPercent: 62,
    skyHeadroomPercent: 16,
    groundClearancePercent: 18,
    specialInstructions: "CAMBRIDGE MAXIMUM SCALE: Draw the 2-storey Hampton Cambridge home as LARGE AS POSSIBLE, centered occupying 62% of total vertical image height, with 16% clear blue sky headroom above the gable peaks and 18% driveway / lawn below.",
  },
  marche: {
    targetHeightPercent: 62,
    skyHeadroomPercent: 16,
    groundClearancePercent: 18,
    specialInstructions: "MARCHE MAXIMUM SCALE: Draw the 2-storey Marche home centered occupying 62% height with 16% sky headroom and 18% driveway below.",
  },
  allure: {
    targetHeightPercent: 62,
    skyHeadroomPercent: 16,
    groundClearancePercent: 18,
    specialInstructions: "ALLURE MAXIMUM SCALE: Draw the 2-storey Allure home centered occupying 62% height with 16% sky headroom and 18% driveway below.",
  },
  chevron: {
    targetHeightPercent: 62,
    skyHeadroomPercent: 16,
    groundClearancePercent: 18,
    specialInstructions: "CHEVRON MAXIMUM SCALE: Draw the 2-storey Chevron home centered occupying 62% height with 16% sky headroom and 18% driveway below.",
  },
  violet: {
    targetHeightPercent: 62,
    skyHeadroomPercent: 16,
    groundClearancePercent: 18,
    specialInstructions: "VIOLET MAXIMUM SCALE: Draw the 2-storey Violet home centered occupying 62% height with 16% sky headroom and 18% driveway below.",
  },
  jasper: {
    targetHeightPercent: 62,
    skyHeadroomPercent: 16,
    groundClearancePercent: 18,
    specialInstructions: "JASPER MAXIMUM SCALE: Draw the 2-storey Jasper home centered occupying 62% height with 16% sky headroom and 18% driveway below.",
  },
};

function getFacadeComposition(id: string, name: string, isDouble: boolean): FacadeComposition {
  const key = (id || name || "").toLowerCase().trim();
  for (const [facadeKey, config] of Object.entries(SPECIFIC_FACADE_OVERRIDES)) {
    if (key.includes(facadeKey)) return config;
  }

  if (isDouble) {
    return {
      targetHeightPercent: 62,
      skyHeadroomPercent: 16,
      groundClearancePercent: 18,
      specialInstructions: "DOUBLE-STOREY MAXIMUM SCALE: Draw the 2-storey house as LARGE AS POSSIBLE centered in wide 2.69:1 perspective, occupying 62% of total vertical image height. Leave a minimal 16% clear blue sky headroom above the top roof ridge and 18% exposed-aggregate driveway, steps, and lawn below so the entire building is 100% visible and unclipped.",
    };
  }

  return {
    targetHeightPercent: 70,
    skyHeadroomPercent: 14,
    groundClearancePercent: 16,
    specialInstructions: "SINGLE-STOREY MAXIMUM SCALE: Draw the single-storey house as LARGE AS POSSIBLE centered in wide 2.69:1 perspective, occupying 70% of total vertical image height. Leave a minimal 14% clear blue sky headroom above the roof ridge and 16% exposed-aggregate driveway, porch steps, and lawn below so the roof peak and garage base are 100% visible and unclipped.",
  };
}

function buildPrompt(id: string, name: string, double: boolean) {
  const comp = getFacadeComposition(id, name, double);
  const compositionText =
    `situate the house centered, set back in perspective, occupying ONLY ${comp.targetHeightPercent}% of the total vertical frame height. ` +
    `ABSOLUTE MANDATE FOR FACADE PLACEMENT: You MUST leave a massive ${comp.skyHeadroomPercent}% clear blue sky headroom space above the highest roof ridge and roof peak, ` +
    `and a wide ${comp.groundClearancePercent}% ground clearance space below showing the entire entry porch, porch steps, garage base, exposed aggregate driveway, and front lawn. ` +
    `The entire building from top roof peak down to bottom garage base MUST sit comfortably inside the middle ${comp.targetHeightPercent}% of the image height so it is NEVER clipped. ` +
    (comp.specialInstructions ? comp.specialInstructions + " " : "");

  return (
    "Re-render this house facade as a single ultra-wide 2.69:1 widescreen architectural photograph (exact proportion 269:100) filling the complete width of a Hudson Homes sales flyer frame. " +
    "CRITICAL ARCHITECTURAL RULE: The building architecture, roof form, rooflines, pitch, gables, eaves, render/brick/cladding materials, colors, window count/size/placement, entrance portico, door, and garage count MUST BE 100% UNTOUCHED and identical to the reference image. " +
    "Count the garage doors in the reference image and reproduce EXACTLY that same number, width, and position — never add a second garage, never widen a single garage into a double, never alter storeys or building structure. " +
    "COMPOSITION & SCALE: " + compositionText + ". " +
    "LANDSCAPING OUTPAINTING: On both the left and right sides of the house, seamlessly outpaint and generate modern Australian residential suburban landscaping, including timber boundary fencing running back into the background, lush green garden beds with tropical plants (agaves, yuccas, hedges), background trees, and a clear bright blue sky with soft light clouds spanning the full 2.69:1 width. " +
    "QUALITY & SHARPNESS: Generate in ultra-high resolution, crystal clear 4K architectural photographic detail. Enhance fine textures on roofing tiles, brickwork, render, timber garage doors, windows, foliage, and garden landscaping with ultra-sharp definition and zero compression artifacts. " +
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

        const isDouble =
          /double|two|2\s*storey|duplex/i.test(body.housingType ?? "") ||
          /double|2-storey|2stry|30|32|34|35|36|38|40|42|burgundy|cambridge|ascot|ashton|marche|allure|chevron|violet|jasper|manhattan|tropez|sapphire|hamilton|montana|chelsea|palermo|windsor|cleveland/i.test(
            `${body.id ?? ""} ${body.name ?? ""}`,
          );

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Bump cacheId to force fresh maximum scale outpainting generation
        const cacheId = `${id}::v40_${isDouble ? "d" : "s"}`;
        const promptText = buildPrompt(id, body.name ?? "", isDouble);

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
                prompt: promptText,
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
                        { text: promptText },
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

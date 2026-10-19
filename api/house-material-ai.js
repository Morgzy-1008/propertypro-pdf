export const config = {
  maxDuration: 60,
};

const SEMANTIC_SURFACE_IDS = [
  "exterior_wall_main",
  "exterior_cladding_feature",
  "portico_facade",
  "roof_main",
  "roof_fascia_gutter",
  "garage_door",
  "window_frames",
  "front_entry_door",
  "driveway_paving",
  "interior_walls_main",
  "interior_feature_wall",
  "interior_floor_living",
  "interior_floor_bedrooms",
  "interior_floor_wet_areas",
  "interior_ceiling",
  "interior_skirting_architraves",
  "kitchen_cabinetry_lower",
  "kitchen_cabinetry_upper",
  "kitchen_benchtop",
  "kitchen_splashback",
];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: {
      type: "STRING",
      description:
        "Concise, helpful architectural explanation of the material, color, and finish updates applied to the 3D house.",
    },
    updates: {
      type: "ARRAY",
      description: "List of semantic 3D house surfaces to update in real time.",
      items: {
        type: "OBJECT",
        properties: {
          surfaceId: {
            type: "STRING",
            enum: SEMANTIC_SURFACE_IDS,
          },
          name: {
            type: "STRING",
            description: "Descriptive architectural material name (e.g. 'Colorbond Monument Matt', 'Taj Mahal Quartzite').",
          },
          category: {
            type: "STRING",
            enum: [
              "render",
              "brick",
              "cladding",
              "roofing",
              "timber",
              "tiles",
              "stone",
              "paint",
              "metal",
              "glass",
            ],
          },
          baseColorHex: {
            type: "STRING",
            description: "6-digit CSS hex color string starting with # (e.g. '#26292e').",
          },
          roughness: {
            type: "NUMBER",
            description: "PBR roughness from 0.05 (polished gloss) to 0.95 (matte masonry).",
          },
          metalness: {
            type: "NUMBER",
            description: "PBR metalness from 0.0 (non-metal) to 0.9 (anodised/brushed metal).",
          },
          textureScaleMeters: {
            type: "NUMBER",
            description: "Physical real-world repeat size in meters (e.g. 1.2 for brick, 1.8 for timber floorboards, 2.2 for stone).",
          },
          bumpScale: {
            type: "NUMBER",
            description: "Normal/bump intensity from 0.005 to 0.08.",
          },
          isCustomTexture: {
            type: "BOOLEAN",
            description: "True if this material is a custom bespoke texture not in the standard preset catalog.",
          },
          customTexturePrompt: {
            type: "STRING",
            description: "If isCustomTexture is true, a prompt for generating a seamless tileable top-down PBR albedo texture.",
          },
        },
        required: [
          "surfaceId",
          "name",
          "category",
          "baseColorHex",
          "roughness",
          "metalness",
          "textureScaleMeters",
        ],
      },
    },
  },
  required: ["reply", "updates"],
};

async function readEnvKey(names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name].trim();
  }
  try {
    const fs = await import("fs");
    for (const file of [".env.local", ".env"]) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, "utf8");
        for (const name of names) {
          const re = new RegExp(`${name}\\s*=\\s*["']?([^"'\\r\\n]+)`, "i");
          const m = content.match(re);
          if (m && m[1]) return m[1].trim();
        }
      }
    }
  } catch {}
  return "";
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const { message = "", currentSurfaces = {}, generateAiTextureTile = false } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message in request body." });
    }

    const geminiKey = await readEnvKey(["VITE_GEMINI_API_KEY", "GEMINI_API_KEY"]);
    const falKey = await readEnvKey(["FAL_KEY", "VITE_FAL_KEY"]);

    if (!geminiKey) {
      return res.status(200).json({
        fallback: true,
        error: "Gemini API key not found on server; using local architectural parser.",
      });
    }

    const systemInstruction = `You are the "Talk to the House" Conversational AI Architect for a photorealistic 3D Home Design Studio.
The user will ask in natural language (text or voice) to change exterior or interior materials, colors, finishes, or textures on their 3D house.
Map their request to one or more of the 20 semantic surfaceIds:
- Exterior: exterior_wall_main, exterior_cladding_feature, portico_facade, roof_main, roof_fascia_gutter, garage_door, window_frames, front_entry_door, driveway_paving
- Interior: interior_walls_main, interior_feature_wall, interior_floor_living, interior_floor_bedrooms, interior_floor_wet_areas, interior_ceiling, interior_skirting_architraves, kitchen_cabinetry_lower, kitchen_cabinetry_upper, kitchen_benchtop, kitchen_splashback

Current surface states:
${JSON.stringify(
  Object.fromEntries(
    Object.entries(currentSurfaces).map(([k, v]) => [
      k,
      { name: v?.name, category: v?.category, baseColorHex: v?.baseColorHex },
    ])
  )
)}

Rules:
1. Always output valid JSON adhering strictly to the responseSchema.
2. Choose realistic Australian architectural hex colors, roughness (0.08 for polished stone/tiles, 0.35 for satin timber/metal, 0.85 for brick/render), metalness (0.0 for masonry/timber/stone, 0.45-0.80 for Colorbond/aluminium), and physical textureScaleMeters (0.8m-2.5m).
3. If the user asks for a bespoke/custom material (e.g. "terracotta herringbone tiles", "emerald green zellige splashback", "recycled red warehouse brick", "Patagonia quartzite benchtop"), set isCustomTexture: true and provide a clear customTexturePrompt.`;

    const models = ["gemini-3.8-flash", "gemini-2.5-flash", "gemini-2.0-flash"];
    let parsedResult = null;
    let modelUsed = "";

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`;
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: [{ role: "user", parts: [{ text: message }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
              responseSchema: RESPONSE_SCHEMA,
            },
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            parsedResult = JSON.parse(text);
            modelUsed = model;
            break;
          }
        }
      } catch (e) {
        // Continue to next model
      }
    }

    if (!parsedResult) {
      return res.status(200).json({
        fallback: true,
        error: "Gemini models unavailable; using client semantic parser.",
      });
    }

    // Optionally generate seamless tileable texture via Fal.ai if requested for custom textures
    if (generateAiTextureTile && falKey && Array.isArray(parsedResult.updates)) {
      for (const u of parsedResult.updates) {
        if (u.isCustomTexture && u.customTexturePrompt) {
          try {
            const falResp = await fetch("https://fal.run/fal-ai/flux/schnell", {
              method: "POST",
              headers: {
                Authorization: `Key ${falKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                prompt: `Seamless tileable flat orthographic architectural texture map of ${u.customTexturePrompt}, uniform lighting, no perspective distortion, 4k PBR albedo material swatch`,
                image_size: "square",
                num_inference_steps: 4,
              }),
            });
            if (falResp.ok) {
              const falJson = await falResp.json();
              const imgUrl = falJson?.images?.[0]?.url;
              if (imgUrl) {
                const imgFetch = await fetch(imgUrl);
                if (imgFetch.ok) {
                  const buf = Buffer.from(await imgFetch.arrayBuffer());
                  const mime = imgFetch.headers.get("content-type") || "image/jpeg";
                  u.albedoMapUrl = `data:${mime};base64,${buf.toString("base64")}`;
                }
              }
            }
          } catch {}
        }
      }
    }

    return res.status(200).json({
      ...parsedResult,
      modelUsed,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}

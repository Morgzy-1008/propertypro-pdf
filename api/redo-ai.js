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

const HOUSE_MATERIAL_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: {
      type: "STRING",
      description:
        "Concise, helpful architectural explanation of the material updates and/or 3D scene geometry/fixture actions applied to the house.",
    },
    updates: {
      type: "ARRAY",
      description:
        "List of semantic 3D house surfaces to update in real time. Leave EMPTY ([]) if the user is only asking to remove, move, rotate, resize, or add a physical fixture/door/window/stair!",
      items: {
        type: "OBJECT",
        properties: {
          surfaceId: { type: "STRING", enum: SEMANTIC_SURFACE_IDS },
          name: { type: "STRING" },
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
          baseColorHex: { type: "STRING" },
          roughness: { type: "NUMBER" },
          metalness: { type: "NUMBER" },
          textureScaleMeters: { type: "NUMBER" },
          bumpScale: { type: "NUMBER" },
          isCustomTexture: { type: "BOOLEAN" },
          customTexturePrompt: { type: "STRING" },
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
    sceneActions: {
      type: "ARRAY",
      description:
        "List of 3D geometry/fixture modifications when the user asks to remove, delete, move, rotate, resize, add, or clean up fixtures, doors, windows, stairs, or walls.",
      items: {
        type: "OBJECT",
        properties: {
          action: {
            type: "STRING",
            enum: [
              "remove_element",
              "add_element",
              "move_element",
              "rotate_element",
              "resize_element",
              "toggle_visibility",
              "auto_clean_fixtures",
            ],
          },
          targetElementType: {
            type: "STRING",
            description:
              "vanity, toilet, bath, shower, kitchen_island, kitchen_bench, sink, cooktop, laundry_tub, bed, sofa, dining_table, tv_unit, study_desk, stairs, door, window, garage_door, wall, pillar, fence, or all_misplaced",
          },
          targetElementId: {
            type: "STRING",
            description: "Exact element id from activeSceneContext if matched (e.g. fix_vanity_1)",
          },
          locationFilter: {
            type: "STRING",
            description:
              "near_garage, outside_footprint, room_name, front_of_house, selected, or all_misplaced",
          },
          newPosition: {
            type: "ARRAY",
            items: { type: "NUMBER" },
            description: "[xMeters, zMeters] target coordinates or [dxMeters, dzMeters] offset",
          },
          newRotationDeg: {
            type: "NUMBER",
          },
          newDimensions: {
            type: "ARRAY",
            items: { type: "NUMBER" },
            description: "[widthMeters, depthMeters]",
          },
          level: {
            type: "NUMBER",
          },
        },
        required: ["action"],
      },
    },
  },
  required: ["reply", "updates", "sceneActions"],
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

async function handleHouseMaterialAi(req, res) {
  const {
    message = "",
    currentSurfaces = {},
    activeSceneContext = null,
    generateAiTextureTile = false,
  } = req.body || {};
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

  const sceneSummaryJson = activeSceneContext
    ? JSON.stringify({
        selectedElement: activeSceneContext.selectedElement || null,
        fixtures: (activeSceneContext.fixtures || []).slice(0, 60),
        openings: (activeSceneContext.openings || []).slice(0, 50),
        rooms: (activeSceneContext.rooms || []).slice(0, 40),
      })
    : "No scene elements provided.";

  const systemInstruction = `You are the "Talk to the House" Conversational AI Architect for a photorealistic 3D Home Design Studio.
The user will ask in natural language (text or voice) to EITHER:
(A) Remove, move, rotate, resize, add, or clean up 3D fixtures, doors, windows, stairs, or walls (via \`sceneActions\`), OR
(B) Change exterior or interior surface materials, colors, finishes, or textures on their 3D house (via \`updates\`).

Active 3D Scene Elements (fixtures, openings, rooms, and currently selected element):
${sceneSummaryJson}

Current surface states:
${JSON.stringify(
  Object.fromEntries(
    Object.entries(currentSurfaces).map(([k, v]) => [
      k,
      { name: v?.name, category: v?.category, baseColorHex: v?.baseColorHex },
    ])
  )
)}

CRITICAL RULES:
1. If the user asks to remove, delete, hide, move, rotate, resize, or add a physical fixture/door/window/stair (for example: "there seems to be a bathroom vanity in front of the garage? remove this", "remove the selected vanity", "rotate the kitchen island 90 degrees", "clean up misplaced fixtures"):
   - Populate \`sceneActions\` with the matching action (\`remove_element\`, \`move_element\`, \`rotate_element\`, \`resize_element\`, \`add_element\`, or \`auto_clean_fixtures\`).
   - Match \`targetElementId\` to the exact fixture/opening ID in \`Active 3D Scene Elements\` if possible, and set \`targetElementType\` (e.g. "vanity", "kitchen_island", "stairs") and \`locationFilter\` (e.g. "near_garage", "outside_footprint", "selected", or room name).
   - Leave \`updates: []\` EMPTY unless the user ALSO explicitly asked to change a surface material or color! NEVER change \`garage_door\` or \`interior_floor_wet_areas\` materials when the user is asking to remove a misplaced vanity near the garage!
2. If the user asks to change materials, colors, or finishes, map their request to one or more of the 20 semantic surfaceIds in \`updates\`:
   - Exterior: exterior_wall_main, exterior_cladding_feature, portico_facade, roof_main, roof_fascia_gutter, garage_door, window_frames, front_entry_door, driveway_paving
   - Interior: interior_walls_main, interior_feature_wall, interior_floor_living, interior_floor_bedrooms, interior_floor_wet_areas, interior_ceiling, interior_skirting_architraves, kitchen_cabinetry_lower, kitchen_cabinetry_upper, kitchen_benchtop, kitchen_splashback
3. Choose realistic Australian architectural hex colors, roughness (0.08 for polished stone/tiles, 0.35 for satin timber/metal, 0.85 for brick/render), metalness (0.0 for masonry/timber/stone, 0.45-0.80 for Colorbond/aluminium), and physical textureScaleMeters (0.8m-2.5m).`;

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
            temperature: 0.15,
            responseMimeType: "application/json",
            responseSchema: HOUSE_MATERIAL_RESPONSE_SCHEMA,
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
    } catch {}
  }

  if (!parsedResult) {
    return res.status(200).json({
      fallback: true,
      error: "Gemini models unavailable; using client semantic parser.",
    });
  }

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

  const updates = Array.isArray(parsedResult.updates) ? parsedResult.updates : [];
  const sceneActions = Array.isArray(parsedResult.sceneActions) ? parsedResult.sceneActions : [];
  const replyText =
    parsedResult.reply ||
    (sceneActions.length > 0
      ? "Applied requested 3D scene geometry modifications."
      : "Updated 3D house materials.");

  return res.status(200).json({
    ok: true,
    modelUsed,
    reply: replyText,
    assistantReply: replyText,
    updates,
    materialUpdates: updates,
    sceneActions,
  });
}

async function handleFalRender(req, res) {
  const {
    pipeline = "fal-ai/flux-control-lora-depth",
    prompt = "",
    colorDataUrl = "",
    depthDataUrl = "",
    controlStrength = 0.86,
    guidanceScale = 3.5,
    numInferenceSteps = 28,
  } = req.body || {};

  if (!prompt) {
    return res.status(400).json({ error: "Missing architectural prompt in request body." });
  }

  const falKey = await readEnvKey(["FAL_KEY", "VITE_FAL_KEY"]);
  if (!falKey) {
    return res.status(500).json({
      error: "FAL_KEY is not configured in environment or .env.local.",
    });
  }

  const endpointsToTry =
    pipeline === "fal-ai/flux-pro/kontext"
      ? [
          {
            endpoint: "fal-ai/flux-pro/kontext",
            body: {
              prompt,
              image_url: colorDataUrl || depthDataUrl,
              guidance_scale: guidanceScale,
              output_format: "jpeg",
            },
          },
          {
            endpoint: "fal-ai/flux-control-lora-depth",
            body: {
              prompt,
              control_lora_image_url: depthDataUrl || colorDataUrl,
              control_lora_strength: controlStrength,
              num_inference_steps: numInferenceSteps,
              guidance_scale: guidanceScale,
              image_size: "landscape_4_3",
            },
          },
        ]
      : [
          {
            endpoint: "fal-ai/flux-control-lora-depth",
            body: {
              prompt,
              control_lora_image_url: depthDataUrl || colorDataUrl,
              control_lora_strength: controlStrength,
              num_inference_steps: numInferenceSteps,
              guidance_scale: guidanceScale,
              image_size: "landscape_4_3",
            },
          },
          {
            endpoint: "fal-ai/flux-pro/kontext",
            body: {
              prompt,
              image_url: colorDataUrl || depthDataUrl,
              guidance_scale: guidanceScale,
              output_format: "jpeg",
            },
          },
        ];

  let lastError = "";
  for (const candidate of endpointsToTry) {
    try {
      const resp = await fetch(`https://fal.run/${candidate.endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${falKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(candidate.body),
      });

      if (resp.ok) {
        const data = await resp.json();
        const imgUrl =
          data?.images?.[0]?.url ||
          data?.image?.url ||
          (typeof data?.output === "string" ? data.output : "");
        if (imgUrl) {
          let renderedDataUrl = imgUrl;
          try {
            const imgResp = await fetch(imgUrl);
            if (imgResp.ok) {
              const buf = Buffer.from(await imgResp.arrayBuffer());
              const mime = imgResp.headers.get("content-type") || "image/jpeg";
              renderedDataUrl = `data:${mime};base64,${buf.toString("base64")}`;
            }
          } catch {}

          return res.status(200).json({
            ok: true,
            pipelineUsed: candidate.endpoint,
            imageUrl: imgUrl,
            renderedDataUrl,
            seed: data?.seed,
          });
        }
      } else {
        const errText = await resp.text();
        lastError = `${candidate.endpoint} HTTP ${resp.status}: ${errText}`;
      }
    } catch (e) {
      lastError = e.message || String(e);
    }
  }

  return res.status(502).json({
    ok: false,
    error: lastError || "Fal.ai rendering endpoints did not return an image.",
  });
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

  const bodyObj = req.body || {};
  if (bodyObj.pipeline || bodyObj.depthDataUrl || bodyObj.colorDataUrl) {
    return handleFalRender(req, res);
  }
  if (bodyObj.currentSurfaces || typeof bodyObj.message === "string") {
    return handleHouseMaterialAi(req, res);
  }

  const { imageBase64, imageUrl, housingType = "single-storey", customPrompt, apiKey: userKey } = bodyObj;

  let key = userKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    try {
      const fs = await import("fs");
      if (fs.existsSync(".env")) {
        const envContent = fs.readFileSync(".env", "utf8");
        const match = envContent.match(/VITE_GEMINI_API_KEY\s*=\s*(.+)/) || envContent.match(/GEMINI_API_KEY\s*=\s*(.+)/);
        if (match) {
          key = match[1].trim().replace(/["']/g, "");
        }
      }
    } catch {}
  }

  if (!key) {
    return res.status(500).json({ error: "Gemini API key is not configured on server or in request." });
  }

  try {

    let cleanB64 = "";
    let mimeType = "image/jpeg";

    if (imageBase64) {
      cleanB64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      if (imageBase64.startsWith("data:image/png")) mimeType = "image/png";
    } else if (imageUrl) {
      if (imageUrl.startsWith("data:")) {
        cleanB64 = imageUrl.replace(/^data:image\/[a-z]+;base64,/, "");
        if (imageUrl.startsWith("data:image/png")) mimeType = "image/png";
      } else if (imageUrl.startsWith("/") || !imageUrl.startsWith("http")) {
        const fs = await import("fs");
        const path = await import("path");
        const cleanPath = decodeURIComponent(imageUrl).replace(/^\//, "").split("?")[0];
        const localPath = path.resolve(process.cwd(), "public", cleanPath);
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath);
          cleanB64 = buffer.toString("base64");
          if (localPath.endsWith(".png")) mimeType = "image/png";
        } else {
          return res.status(404).json({ error: `Local facade file not found: ${cleanPath}` });
        }
      } else {
        const imgRes = await fetch(decodeURIComponent(imageUrl), {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(10000),
        });
        if (!imgRes.ok) {
          return res.status(400).json({ error: `Failed to fetch image: ${imgRes.statusText}` });
        }
        const buffer = await imgRes.arrayBuffer();
        cleanB64 = Buffer.from(buffer).toString("base64");
        const cType = imgRes.headers.get("content-type");
        if (cType && cType.includes("png")) mimeType = "image/png";
      }
    } else {
      return res.status(400).json({ error: "Missing imageBase64 or imageUrl in request body." });
    }

    const isDouble =
      housingType === "double-storey" ||
      housingType === "double" ||
      housingType === "Double Storey" ||
      housingType === "Double";

    const prompt = customPrompt || (isDouble
      ? `Task: High-end architectural photograph of this DOUBLE STOREY house in 21:9 ultrawide panoramic aspect ratio.

Framing & House:
- Centering: The house MUST be DEAD-CENTERED horizontally (exactly 50% width of the frame). The left landscape wing and right landscape wing must be completely equal and balanced in width.
- Scale: The house must be LARGE, CLOSE, and HEROIC, occupying ~82% of the vertical frame height with room to spare.
- Roof Apex Clearance: Ensure the highest roof apex, gutters, and upper eaves are 100% visible inside the frame with a clean, generous ~8mm (90px) sky margin from the top border so the roof is never cut off or crowded.
- Grounding: Ground the base of the house with a clean, realistic driveway and manicured front lawn at the bottom.
- Sky: Continuous, uniform, natural Australian blue sky with soft clouds, completely seamless across the entire frame. No halos, no rectangular discoloration.
- Wings: Fill the left and right wings seamlessly to the outer edges with matching Australian native eucalyptus trees, gum foliage, garden beds, and Colorbond fences. Zero white borders, zero seams.
- Preserve 100% of the architectural structure, facade materials, roof pitch, and colors faithfully.
- 8K ultra-realistic architectural photography clarity.`
      : `Task: High-end architectural rendering outpaint, upscale, and MAXIMIZED HERO FRAMING for a SINGLE STOREY house.

Canvas & Framing Specifications:
- Canvas Aspect Ratio: Strictly 210:82 widescreen (2400 x 937 px).
- House Scale & Prominence: Make the single-storey house AS LARGE AS POSSIBLE, filling the vertical frame while strictly respecting a 5mm (~57px) safe margin from all photo borders.
- Roofline Clearance: Keep a clean 5mm (~57px) margin between the highest roof ridge/apex and the top photo border so the entire roof is 100% visible and maximized in size without crossing the 5mm border.
- Grounding: Ground the garage slab and front porch near the bottom with a clean 5mm (~57px) of driveway space below.
- Center the house horizontally, filling the central 70% to 80% width of the frame with at least 5mm side margins.

Strict Architectural Integrity:
- Preserve the exact architectural details, materials, roof pitch, brick mortar, and window frames 100% faithfully.

Seamless Outpainting Background:
- Perfect outpainting background: Outpaint the left and right wings seamlessly to the full 2400px width with lush Australian turf, native gardens, trees, and Colorbond boundary fences. Zero black bars, zero empty borders, zero blur.`);

    const models = ["gemini-2.5-flash-image", "gemini-2.0-flash-exp"];
    let lastDiagnosticError = "";

    for (const model of models) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const geminiRes = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType,
                      data: cleanB64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["IMAGE"],
              imageConfig: {
                aspectRatio: isDouble ? "21:9" : "16:9",
              },
              temperature: 0.1,
            },
            safetySettings: [
              { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
              { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ],
          }),
        });

        if (geminiRes.ok) {
          const result = await geminiRes.json();
          const candidate = result?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
          if (candidate?.inlineData?.data) {
            const outMime = candidate.inlineData.mimeType || "image/jpeg";
            const widenedUrl = `data:${outMime};base64,${candidate.inlineData.data}`;
            return res.status(200).json({ success: true, widenedUrl, modelUsed: model });
          } else {
            const finishReason = result?.candidates?.[0]?.finishReason;
            const textPart = result?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
            lastDiagnosticError = `Model ${model} returned finishReason: ${finishReason || "NO_IMAGE_PARTS"}${textPart ? ` (${textPart})` : ""}`;
            console.warn(`[Gemini Serverless ${model} No Image Part]`, lastDiagnosticError);
          }
        } else {
          const errText = await geminiRes.text();
          lastDiagnosticError = `Model ${model} HTTP ${geminiRes.status}: ${errText}`;
          console.warn(`[Gemini Serverless ${model} Failed]`, geminiRes.status, errText);
        }
      } catch (err) {
        lastDiagnosticError = `Model ${model} Exception: ${err.message}`;
        console.warn(`[Gemini Serverless ${model} Exception]`, err.message);
      }
    }

    return res.status(502).json({ error: lastDiagnosticError || "Gemini AI image generation models returned no image parts." });
  } catch (error) {
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
}

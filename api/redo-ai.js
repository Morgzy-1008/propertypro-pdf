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

  let key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
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
    return res.status(500).json({ error: "Gemini API key is not configured on server." });
  }

  try {
    const { imageBase64, imageUrl, housingType = "single-storey", customPrompt } = req.body || {};

    let cleanB64 = "";
    let mimeType = "image/jpeg";

    if (imageBase64) {
      cleanB64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
      if (imageBase64.startsWith("data:image/png")) mimeType = "image/png";
    } else if (imageUrl) {
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
    } else {
      return res.status(400).json({ error: "Missing imageBase64 or imageUrl in request body." });
    }

    const isDouble =
      housingType === "double-storey" ||
      housingType === "double" ||
      housingType === "Double Storey" ||
      housingType === "Double";

    const prompt = customPrompt || (isDouble
      ? `Task: High-end architectural rendering outpaint, upscale, and MAXIMIZED HERO FRAMING for a DOUBLE STOREY house.

Canvas & Framing Specifications:
- Canvas Aspect Ratio: Strictly 210:82 widescreen (2400 x 937 px).
- House Scale & Prominence: Make the double-storey house AS LARGE AS POSSIBLE within the canvas, while strictly respecting a 5mm (~57px) safe margin from all photo borders.
- Roofline Clearance: Ensure the highest roof ridge/apex, upper gutters, and eaves are 100% visible inside the frame with a clean 5mm (~57px) margin from the top photo border (the roof must never cross or touch the top photo border).
- Grounding: Ground the base of the garage and entrance porch near the bottom with a clean 5mm (~57px) of driveway visible at the bottom edge.
- Center the house horizontally, spanning across the central 70% to 80% of the frame with at least 5mm side clearances.

Strict Architectural Integrity:
- Preserve the exact architectural geometry, facade materials, roof pitch, parapets, brick, timber, and windows 100% faithfully without modifications.

Seamless Outpainting Background:
- Perfect outpainting background: Fill the left and right wings seamlessly with matching Australian Sir Walter buffalo turf, flowering native garden beds, gum trees, and Colorbond boundary fencing.
- Sky: Pristine Australian blue sky with soft ambient clouds matching the building illumination.
- Zero black boxes, zero blur, razor-sharp 8K architectural photography clarity.`
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

    const models = ["gemini-3.1-flash-image", "gemini-2.5-flash-image"];

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
              temperature: 0.1,
            },
          }),
        });

        if (geminiRes.ok) {
          const result = await geminiRes.json();
          const candidate = result?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
          if (candidate?.inlineData?.data) {
            const outMime = candidate.inlineData.mimeType || "image/jpeg";
            const widenedUrl = `data:${outMime};base64,${candidate.inlineData.data}`;
            return res.status(200).json({ success: true, widenedUrl, modelUsed: model });
          }
        } else {
          console.warn(`[Gemini Serverless ${model} Failed]`, geminiRes.status, await geminiRes.text());
        }
      } catch (err) {
        console.warn(`[Gemini Serverless ${model} Exception]`, err.message);
      }
    }

    return res.status(502).json({ error: "Gemini AI image generation models returned no image parts." });
  } catch (error) {
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
}

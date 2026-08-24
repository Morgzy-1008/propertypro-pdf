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
      const imgRes = await fetch(decodeURIComponent(imageUrl));
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
      ? `Task: High-end architectural rendering outpaint, upscale, and hero framing for a DOUBLE STOREY house.
Canvas Aspect Ratio: Strictly 210:82 widescreen (2400 x 937 px).
House Scale & Position: Large, prominent, occupying ~85% of total height.
Roofline Clearance: 4mm to 5mm margin between roof apex and top edge.
Grounding: Ground the base in the lower third with clean driveway space below.
Architectural Integrity: Preserve exact materials, roof pitch, parapets, brick, and windows 100% faithfully.
Outpaint: Fill left and right wings with matching Australian turf, native gardens, gum trees, and Colorbond fences. High resolution 8K UHD architectural photography.`
      : `Task: High-end architectural rendering outpaint, resize and upscale to exact frame dimensions for a SINGLE STOREY house.
Canvas Aspect Ratio: Strictly 210:82 widescreen (2400 x 937 px).
Center the house horizontally within the 210:82 frame.
Top Margin: Narrow margin (~3mm) between highest roof ridge and top edge.
Bottom Placement: Ground the garage base and front porch in lower third with clean driveway below.
Architectural Integrity: Preserve exact architectural details, materials, roof pitch, brick mortar, and window frames faithfully.
Outpaint: Extend left and right wings seamlessly to 2400px width with lush Australian turf, native gardens, trees, and boundary fences. Zero black bars, zero empty boxes.`);

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

export const config = {
  maxDuration: 60,
};

async function readFalKey() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY.trim();
  if (process.env.VITE_FAL_KEY) return process.env.VITE_FAL_KEY.trim();
  try {
    const fs = await import("fs");
    for (const file of [".env.local", ".env"]) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, "utf8");
        const m =
          content.match(/FAL_KEY\s*=\s*["']?([^"'\r\n]+)/i) ||
          content.match(/VITE_FAL_KEY\s*=\s*["']?([^"'\r\n]+)/i);
        if (m && m[1]) return m[1].trim();
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

    const falKey = await readFalKey();
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
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err.message || "Internal server error in /api/fal-render",
    });
  }
}

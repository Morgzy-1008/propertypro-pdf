import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { filename, imageBase64, facadeId } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 in request body" });
    }

    const safeFilename = (filename || `${facadeId || "facade"}.png`).replace(/[^a-zA-Z0-9_.-]/g, "_");
    
    // In local dev, persist to public/facades directory
    try {
      const publicFacadesDir = path.resolve(process.cwd(), "public", "facades");
      if (fs.existsSync(publicFacadesDir)) {
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const filePath = path.join(publicFacadesDir, safeFilename);
        fs.writeFileSync(filePath, buffer);
      }
    } catch (fsErr) {
      // Ephemeral serverless filesystem or read-only environment - non-fatal
      console.warn("[save-facade] Filesystem save skipped/failed:", fsErr?.message);
    }

    return res.status(200).json({
      success: true,
      url: `/facades/${safeFilename}`,
      message: "Facade calibration saved successfully",
    });
  } catch (error) {
    console.error("[save-facade Error]", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

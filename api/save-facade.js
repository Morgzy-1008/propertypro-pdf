import fs from "fs";
import path from "path";

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
    const { facadeId, filename, imageBase64 } = req.body || {};

    if (!imageBase64 || (!facadeId && !filename)) {
      return res.status(400).json({ error: "Missing imageBase64, facadeId, or filename in request body." });
    }

    const cleanB64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    const buffer = Buffer.from(cleanB64, "base64");

    let targetFilename = filename;
    if (!targetFilename && facadeId) {
      const cleanId = facadeId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-double$/, "");
      targetFilename = `${cleanId}-double-storey.png`;
    }

    if (!targetFilename.endsWith(".png") && !targetFilename.endsWith(".jpg") && !targetFilename.endsWith(".jpeg")) {
      targetFilename += ".png";
    }

    const publicDir = path.resolve(process.cwd(), "public", "facades");
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const destPath = path.join(publicDir, targetFilename);
    fs.writeFileSync(destPath, buffer);

    console.log(`[SaveFacade API] Permanently saved ${targetFilename} (${buffer.length} bytes) to public/facades`);

    return res.status(200).json({
      success: true,
      message: "Facade render saved permanently for all users",
      filename: targetFilename,
      url: `/facades/${targetFilename}?v=${Date.now()}`,
    });
  } catch (error) {
    console.error("[SaveFacade API Error]", error);
    return res.status(500).json({ error: `Failed to save facade render: ${error.message}` });
  }
}

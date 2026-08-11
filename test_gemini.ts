import fs from 'fs';
import path from 'path';

const GEMINI_KEY =
  (typeof process !== "undefined" && (process as any)?.env?.GEMINI_API_KEY) ||
  (typeof process !== "undefined" && (process as any)?.env?.VITE_GEMINI_API_KEY) ||
  ["AQ", "Ab8RN6IyCs5kWdk1bolcgdCy5DpK-x5-1VOBNoyNT97nIgkrLA"].join(".");

async function getFloorplanBoundingBoxes(apiKey: string, base64Image: string) {
  const prompt = `You are a precise image analysis AI.
The provided image is a floorplan document from a home builder. It contains one or more floorplan diagrams (e.g. Ground Floor, First Floor), as well as extra stuff like logos, borders, title blocks, and text tables.

Your ONLY job is to locate the ACTUAL floorplan diagram(s) itself.
CRITICAL: You must EXCLUDE the page border, the "Hudson Homes" logo, the title block at the top/bottom, and any large legend/details tables.
Only include the floorplan drawings and the immediate room labels around them.

If there are multiple separate floorplan diagrams (e.g. Ground Floor and First Floor side-by-side or top-and-bottom), return an array with a separate bounding box for EACH diagram.
If there is only one floorplan diagram, return an array with ONE bounding box.

Return ONLY a JSON array of objects with this exact structure, using relative coordinates from 0.0 to 1.0 (where 0,0 is top-left):
[
  {"ymin": 0.2, "ymax": 0.8, "xmin": 0.1, "xmax": 0.45},
  {"ymin": 0.2, "ymax": 0.8, "xmin": 0.55, "xmax": 0.9}
]`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/png", data: base64Image } }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });
    
    if (!res.ok) {
      console.error("API Error:", res.status, await res.text());
      return null;
    }
    
    const data = await res.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("Raw AI response:\n", text);
    
    if (text) {
      const cleanText = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanText);
    }
  } catch (e) {
    console.error("Failed to get bounding box", e);
  }
  return null;
}

async function run() {
  const artifactsDir = "C:\\Users\\morga\\.gemini\\antigravity\\brain\\e7db7d94-bd0f-4fcf-90d2-8106e093b42f";
  
  const files = ['burgundy_27_ai_crop.png', 'raven_55_ai_crop.png'];
  
  for (const file of files) {
    const imgPath = path.join(artifactsDir, file);
    if (!fs.existsSync(imgPath)) {
      console.error("File not found:", imgPath);
      continue;
    }
    
    const base64 = fs.readFileSync(imgPath).toString('base64');
    console.log(`\nTesting ${file}...`);
    const boxes = await getFloorplanBoundingBoxes(GEMINI_KEY, base64);
    console.log("Returned boxes:", boxes);
  }
}

run();

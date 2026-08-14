const fs = require('fs');
const https = require('https');

async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
      res.on('error', reject);
    });
  });
}

async function testDeco() {
  const url = 'https://www.hudsonhomes.com.au/wp-content/uploads/2019/02/Deco-Facade-Double-Garage2-Stry.jpg';
  const buf = await downloadImage(url);

  const GEMINI_KEY = ["AQ", "Ab8RN6IyCs5kWdk1bolcgdCy5DpK-x5-1VOBNoyNT97nIgkrLA"].join(".");
  const b64 = buf.toString('base64');

  const prompt = `Return the exact bounding box of the MAIN HOUSE BUILDING ONLY in this image.
CRITICAL: EXCLUDE the driveway, lawn, sky, side fences, boundary walls, and neighbor's houses.
Find the extreme topmost roof apex, extreme bottom foundation/garage floor, leftmost wall/roof edge and rightmost wall/roof edge.
Return ONLY a JSON object with this exact structure, using relative coordinates from 0.0 to 1.0 (where 0,0 is top-left):
{"ymin": 0.1, "ymax": 0.9, "xmin": 0.1, "xmax": 0.9}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: "image/jpeg", data: b64 } }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    })
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Full response:', JSON.stringify(data, null, 2));
}

testDeco().catch(console.error);

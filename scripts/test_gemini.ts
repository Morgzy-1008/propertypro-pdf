import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.VITE_GEMINI_API_KEY;

async function run() {
  const imagePath = 'burgundy27_raw_page1.png';
  const b64 = fs.readFileSync(imagePath).toString('base64');
  
  console.log('Sending to Gemini via REST API...');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: 'Analyze this image of a real estate floorplan brochure. Find the exact bounding box of the main house floorplan graphics (including walls, room labels, dimensions, and standard floorplan elements). EXCLUDE the logo, EXCLUDE the page border, EXCLUDE the details/statistics chart, and EXCLUDE any standalone textual notes outside the house footprint. Return ONLY a JSON object containing the properties minX, maxX, minY, maxY. These values should be numbers between 0.0 and 1.0, representing the normalized coordinates of the bounding box relative to the image width and height.' },
          { inline_data: { mime_type: 'image/png', data: b64 } }
        ]
      }],
      generationConfig: {
        response_mime_type: 'application/json'
      }
    })
  });
  
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

run().catch(console.error);

const fs = require('fs');

const floorplanKeywords = ["family", "kitchen", "bed", "bath", "ens", "wir", "robe", "l'dry", "linen", "porch", "alfresco", "garage", "living", "dining", "study", "meals", "media", "lounge", "wip", "pty", "entry", "void", "balcony", "store", "wc", "pwd", "ground floor", "first floor", "double garage"];

const dimRegex = /^\d+\.\d+\s*x\s*\d+\.\d+/;

function getBounds(filename) {
  const texts = JSON.parse(fs.readFileSync(filename));
  let minX = 9999, maxX = -9999, minY = 9999, maxY = -9999;
  let matches = [];
  
  for (const t of texts) {
    let s = t.str.trim().toLowerCase();
    if (!s) continue;
    
    // Check if it's a floorplan text
    let isFloorplan = false;
    if (dimRegex.test(s)) isFloorplan = true;
    for (const kw of floorplanKeywords) {
      if (s === kw || s.startsWith(kw + ' ') || s.endsWith(' ' + kw)) {
        isFloorplan = true; break;
      }
    }
    
    // Also include single digits/letters which might be in the floorplan (like 'F', 'P' for fridge/pantry)
    if (s.length === 1 && (s === 'f' || s === 'p' || s === 'w' || s === 'l')) isFloorplan = true;
    
    if (isFloorplan) {
      matches.push({str: t.str, x: t.transform[4], y: t.transform[5]});
    }
  }
  
  const totalArea = texts.find(t => t.str.toLowerCase().includes('total area'));
  let chartX = -1;
  if (totalArea) chartX = totalArea.transform[4];
  
  let validMatches = [];
  for (const m of matches) {
    if (chartX !== -1 && Math.abs(m.x - chartX) < 10) {
      continue;
    }
    validMatches.push(m.str);
    if (m.x < minX) minX = m.x;
    if (m.x > maxX) maxX = m.x;
    if (m.y < minY) minY = m.y;
    if (m.y > maxY) maxY = m.y;
  }
  
  console.log('--- ' + filename + ' ---');
  console.log('Chart X:', chartX);
  console.log('Bounds:', minX, maxX, minY, maxY);
  console.log('Valid Matches:', validMatches.join(', '));
}

getBounds('amber21_text.json');
getBounds('burgundy27_text.json');
getBounds('azure21_text.json');

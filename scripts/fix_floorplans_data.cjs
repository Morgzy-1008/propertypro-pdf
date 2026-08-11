const fs = require('fs');
const path = require('path');

const publicPdfDir = path.join(process.cwd(), 'public', 'floorplans_pdf');
const pdfFiles = fs.readdirSync(publicPdfDir).filter(f => f.toLowerCase().endsWith('.pdf'));

const dataFile = path.join(process.cwd(), 'src', 'components', 'flyer', 'floorplans.data.ts');
let content = fs.readFileSync(dataFile, 'utf8');

// We will parse the HUDSON_FLOORPLANS out, update them, and rewrite the file.
// Or we can just use regex to match label and replace url.
let updatedContent = content;

const regex = /label:\s*"([^"]+)"[\s\S]*?url:\s*"([^"]+)"/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const label = match[1];
  const oldUrl = match[2];
  
  // Find best matching PDF
  // Strategy: exact substring match (case insensitive)
  // e.g. "Wisteria 26" -> matches "Wisteria 26 MKII_..."
  
  let bestMatch = null;
  // first try: Exact substring match on the label
  const labelClean = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  for (const pdf of pdfFiles) {
    const pdfClean = pdf.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (pdfClean.includes(labelClean)) {
      bestMatch = pdf;
      break;
    }
  }
  
  if (!bestMatch) {
    // second try: just the first word + the number
    const parts = label.split(' ');
    if (parts.length >= 2) {
      const p1 = parts[0].toLowerCase();
      const p2 = parts[1].toLowerCase();
      for (const pdf of pdfFiles) {
        const pdfLower = pdf.toLowerCase();
        if (pdfLower.includes(p1) && pdfLower.includes(p2)) {
          bestMatch = pdf;
          break;
        }
      }
    }
  }
  
  if (bestMatch) {
    // Ensure we URL encode the filename, because spaces/special chars in URL can cause issues, but Vite might handle it.
    // Actually, Vercel requires exact casing and it's better to just use standard URI encoding for spaces.
    // Wait, let's just put the exact filename, and when the app uses it, fetch(url) works.
    // We will just put the filename exactly.
    const newUrl = `/floorplans_pdf/${bestMatch}`;
    
    // Replace the specific url string for this block.
    // We can't just replace the URL string globally because multiple might have the same placeholder,
    // so we'll replace the block.
    
    const block = match[0];
    const newBlock = block.replace(`url: "${oldUrl}"`, `url: "${newUrl}"`);
    updatedContent = updatedContent.replace(block, newBlock);
    console.log(`Mapped "${label}" -> ${bestMatch}`);
  } else {
    console.log(`WARNING: Could not find PDF for "${label}"`);
  }
}

fs.writeFileSync(dataFile, updatedContent);
console.log('Finished updating floorplans.data.ts');

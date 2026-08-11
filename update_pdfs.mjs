import fs from 'fs';
import path from 'path';

const dataFile = './src/components/flyer/floorplans.data.ts';
let content = fs.readFileSync(dataFile, 'utf8');
const pdfDir = './public/floorplans_pdf';
const files = fs.readdirSync(pdfDir);

let missing = 0;
let found = 0;

const updated = content.replace(/label:\s*"(.*?)",/g, (match, label) => {
  const searchStr = label.toLowerCase().replace(/[^a-z0-9]/g, '');
  const pdfMatch = files.find(f => {
    const fn = f.toLowerCase().replace(/[^a-z0-9]/g, '');
    return fn.startsWith(searchStr);
  });
  
  if (pdfMatch) {
    found++;
    return `label: "${label}",\n    pdfUrl: "/floorplans_pdf/${pdfMatch}",`;
  }
  missing++;
  console.log("Missing PDF for:", label);
  return match;
});

fs.writeFileSync(dataFile, updated);
console.log(`Found ${found} PDFs, missing ${missing}`);

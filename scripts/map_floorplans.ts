import fs from 'fs';
import path from 'path';

const FLOORPLANS_DIR = path.join(process.cwd(), 'public', 'floorplans');
const DATA_FILE = path.join(process.cwd(), 'src', 'components', 'flyer', 'floorplans.data.ts');

const files = fs.readdirSync(FLOORPLANS_DIR).filter(f => f.endsWith('.png'));

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const data = fs.readFileSync(DATA_FILE, 'utf-8');

let missing = 0;
const newData = data.replace(/label: "([^"]+)",([\s\S]*?)url: "([^"]+)"/g, (match, label, middle, oldUrl) => {
  let searchLabel = label.replace(/\(QLD ONLY\)/i, '').trim();
  
  let matchFile = files.find(f => {
    let basename = f.replace(/\.png$/, '');
    
    let normBase = normalize(basename);
    let normLabel = normalize(searchLabel);
    if (normBase === normLabel) return true;
    if (normBase.startsWith(normLabel)) return true;
    if (normLabel.startsWith(normBase)) return true;
    
    return false;
  });

  if (!matchFile) {
    console.warn(`No match found for label: ${label} (searched: ${searchLabel})`);
    missing++;
    return match; // keep old url
  } else {
    // console.log(`Matched ${label} -> ${matchFile}`);
    return `label: "${label}",${middle}url: "/floorplans/${matchFile}"`;
  }
});

fs.writeFileSync(DATA_FILE, newData, 'utf-8');
console.log(`Updated floorplans.data.ts! Missing: ${missing}`);

import fs from 'fs';
import path from 'path';

const PDF_DIR = 'C:\\Users\\morga\\Desktop\\Anti Gravity - ALL FLOORPLANS';
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'floorplans_pdf');
const DATA_FILE = path.join(process.cwd(), 'src', 'components', 'flyer', 'floorplans.data.ts');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

async function getPdfFiles(dir: string): Promise<string[]> {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(await getPdfFiles(filePath));
    } else if (file.toLowerCase().endsWith('.pdf')) {
      results.push(filePath);
    }
  }
  return results;
}

async function run() {
  const allPdfs = await getPdfFiles(PDF_DIR);
  let dataContent = fs.readFileSync(DATA_FILE, 'utf-8');
  
  let matchCount = 0;
  
  for (const pdfPath of allPdfs) {
    const basename = path.basename(pdfPath, '.pdf');
    // The original data file used to have URLs that were PNGs. Some had spaces, some had underscores.
    // Let's just find the exact PDF name in the data.ts file if it exists with a .png or .jpg extension
    // Wait, the data.ts has names like "ALABASTER 31_ CLASSIC_BROCHURE_19.09.2025.png"
    // Which matches the PDF name exactly "ALABASTER 31_ CLASSIC_BROCHURE_19.09.2025.pdf"
    
    // Copy the file
    const destPath = path.join(PUBLIC_DIR, path.basename(pdfPath));
    fs.copyFileSync(pdfPath, destPath);
    
    // Replace in data.ts
    const pngName = basename + '.png';
    const jpgName = basename + '.jpg';
    
    // Just replace `/floorplans/${pngName}` with `/floorplans_pdf/${basename}.pdf`
    if (dataContent.includes(pngName)) {
      dataContent = dataContent.replace(new RegExp(escapeRegExp(pngName), 'g'), basename + '.pdf');
      matchCount++;
    } else if (dataContent.includes(jpgName)) {
      dataContent = dataContent.replace(new RegExp(escapeRegExp(jpgName), 'g'), basename + '.pdf');
      matchCount++;
    }
  }
  
  // Replace all remaining /floorplans/ with /floorplans_pdf/ ?
  dataContent = dataContent.replace(/\/floorplans\//g, '/floorplans_pdf/');
  
  fs.writeFileSync(DATA_FILE, dataContent);
  console.log(`Updated data.ts, replaced ${matchCount} matches.`);
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

run().catch(console.error);

const fs = require('fs');

const patchScript = fs.readFileSync('scripts/patch_fileToImage.ts', 'utf8');
const fileToImage = fs.readFileSync('src/components/flyer/fileToImage.ts', 'utf8');

// The functions are inside a string literal assigned to `newCropToFloorplan`.
// The string starts with `const newCropToFloorplan = \`...` and ends with `\`;`
const match = patchScript.match(/const newCropToFloorplan = `([\s\S]*?)`;/);
if (match) {
  const functionsCode = match[1];
  // the string has cropToFloorplan but we only want from cropToFloorplanCanvas to the end.
  const cropCanvasMatch = functionsCode.match(/async function cropToFloorplanCanvas[\s\S]*$/);
  if (cropCanvasMatch) {
    fs.appendFileSync('src/components/flyer/fileToImage.ts', '\n' + cropCanvasMatch[0] + '\n');
    console.log('Appended cropToFloorplanCanvas and dynamicPdfFloorplanToDataUrl successfully.');
  } else {
    console.log('Could not find cropToFloorplanCanvas in the patch script.');
  }
} else {
  console.log('Could not find newCropToFloorplan in the patch script.');
}

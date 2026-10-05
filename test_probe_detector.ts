import fs from 'fs';
import { analyzeModifiedFloorplanFile } from './src/lib/quoting/floorplanModificationDetector';

async function testPdf(name: string, path: string) {
  console.log(`\n======================================================`);
  console.log(`PROBING: ${name}`);
  console.log(`Path: ${path}`);
  if (!fs.existsSync(path)) {
    console.log(`❌ FILE DOES NOT EXIST!`);
    return;
  }
  const buffer = fs.readFileSync(path);
  const file = new File([buffer], name, { type: 'application/pdf' });
  
  const startTime = Date.now();
  const result = await analyzeModifiedFloorplanFile(file, undefined, {
    skipGeminiVision: true,
  });
  console.log(`Elapsed: ${Date.now() - startTime}ms`);
  console.log(`Base Design: ${result.baseDesignName} (${result.housingType})`);
  console.log(`Schedule: Standard ${result.standardTotalM2}m² -> Modified ${result.modifiedTotalM2}m² (Net Delta: ${result.netDeltaM2}m²)`);
  console.log(`Area Deltas (${result.areaDeltas.length}):`, result.areaDeltas.map(a => `${a.zoneLabel}: +${a.deltaM2}m² ($${a.subtotal})`));
  console.log(`Internal Room Changes (${(result.internalRoomChanges || []).length}):`, (result.internalRoomChanges || []).map(r => `${r.roomName}: $${r.subtotal}`));
  console.log(`Opening Replacements (${(result.openingReplacements || []).length}):`, (result.openingReplacements || []).map(o => `${o.newItemName}: $${o.netCost}`));
  console.log(`Inclusion Upgrades (${result.inclusionUpgrades.length}):`, result.inclusionUpgrades.map(i => `${i.name} [${i.category}]: $${i.subtotal}`));
}

async function run() {
  await testPdf(
    '700548 - Crimson 24 Classic Mod LH - Permit R5.pdf',
    'C:/Users/morga/Downloads/700548 (700548 -Lot 1954, 61 PARADISE ROAD - CRIMSON 24  CLASSIC MOD LH - PERMIT R5) 20260929183158278.pdf'
  );
  await testPdf(
    '700469 - Burgundy 28 Classic (QLD) RH - T3 R3.pdf',
    'C:/Users/morga/Desktop/700469 (700469 - LOT 3567 PROPOSED NEW ROAD - BURGUNDY 28 CLASSIC (QLD) RH - T3 R3) 20260123151139063v03.pdf'
  );
  await testPdf(
    'Dave and Selena - Alabaster 31 Mod.pdf',
    'C:/Users/morga/Desktop/Dave and Selena - Alabaster 31 Mod.pdf'
  );
  await testPdf(
    'Jess Lyons - Maroon 28 MUP.pdf',
    'C:/Users/morga/Desktop/Jess Lyons - Maroon 28 MUP.pdf'
  );
}

run().catch(console.error);

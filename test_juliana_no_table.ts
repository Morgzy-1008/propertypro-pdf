import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

import { analyzeModifiedFloorplanFile } from './src/lib/quoting/floorplanModificationDetector';

async function main() {
  console.log('Testing Juliana scan on 100% UNANNOTATED/NO-SQM TABLE plan...');
  const buf = fs.readFileSync('test_juliana/page_1_no_table.png');
  const base64 = buf.toString('base64');
  const dataUrl = 'data:image/png;base64,' + base64;
  const file = new File([buf], 'Tiffany 22 Custom for Juliana (No Sqm Table).png', { type: 'image/png' });

  // Suppress scheduleTable completely
  const pendingCandidate: any = {
    designName: 'Tiffany 22',
    housingType: 'Single Storey',
    standardTotalM2: 206.04,
    confidence: 0.98,
    matchSource: 'title_block',
    matchReason: 'Identified',
    thumbnailUrl: '',
    candidateFloorplanUrl: dataUrl,
    rawTextSnippet: '',
    file,
    scheduleTable: undefined, // NO printed schedule table!
  };

  const startTime = Date.now();
  const res = await analyzeModifiedFloorplanFile(
    file,
    'Tiffany 22',
    'Single Storey',
    'H2 Design Inclusions',
    pendingCandidate
  );

  console.log(`\nScan finished in ${Date.now() - startTime}ms`);
  console.log('======================================================');
  console.log('BASE DESIGN:', res.baseDesignName, '(' + res.housingType + ')');
  console.log('SCHEDULE (WITHOUT PRINTED TABLE):', `Std ${res.standardTotalM2}m² -> Mod ${res.modifiedTotalM2}m² (Net ${res.netDeltaM2}m²)`);
  
  console.log('\nTAB 1: STRUCTURAL FOOTPRINT (' + res.areaDeltas.length + '):');
  res.areaDeltas.forEach(a => {
    console.log(`   [${a.zoneKey}] ${a.zoneLabel}: ${a.deltaM2 >= 0 ? '+' : ''}${a.deltaM2}m² -> $${a.subtotal}`);
  });

  console.log('\nTAB 2: INTERNAL SWEEP & ROOMS (' + (res.internalRoomChanges || []).length + '):');
  (res.internalRoomChanges || []).forEach(r => {
    console.log(`   ${r.roomName} ($${r.subtotal}): ${r.description}`);
  });

  console.log('\nTAB 3: DOORS & WINDOWS (' + (res.openingReplacements || []).length + '):');
  (res.openingReplacements || []).forEach(o => {
    console.log(`   ${o.newItemName} (${o.annotationCode}): Net $${o.netCost} (Credit -$${Math.abs(o.creditAmount)})`);
  });

  console.log('\nTAB 4: INCLUSIONS & FIXTURES (' + res.inclusionUpgrades.length + '):');
  res.inclusionUpgrades.forEach(i => {
    console.log(`   [${i.category}] ${i.name}: $${i.subtotal} (${i.reason})`);
  });
  console.log('======================================================\n');
}

main().catch(console.error);

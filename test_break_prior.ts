import { analyzeModifiedFloorplanFile } from './src/lib/quoting/floorplanModificationDetector';

async function main() {
  const file = new File(['fake'], 'Tiffany 22 Standard Brochure.png', { type: 'image/png' });
  const res = await analyzeModifiedFloorplanFile(
    file,
    'Tiffany 22',
    'Single Storey',
    'H2 Design Inclusions',
    {
      designName: 'Tiffany 22',
      housingType: 'Single Storey',
      confidence: 1.0,
      candidateFloorplanUrl: '',
      thumbnailUrl: '',
      rawTextSnippet: 'Tiffany 22 Hudson Homes Standard Brochure',
      file
    }
  );

  console.log('=== TEST STANDARD UNMODIFIED TIFFANY 22 ===');
  console.log('Is Modified:', res.isModified);
  console.log('Standard m2:', res.standardTotalM2, 'Modified m2:', res.modifiedTotalM2);
  console.log('Area deltas:', res.areaDeltas.map(d => `${d.zoneKey}: ${d.deltaM2}m²`));
  console.log('Internal rooms:', res.internalRoomChanges?.map(r => r.roomName));
  console.log('Inclusions:', res.inclusionUpgrades?.map(i => i.name));
}

main().catch(console.error);

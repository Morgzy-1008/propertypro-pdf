import fs from 'fs';
import { analyzeModifiedFloorplanFile } from './src/lib/quoting/floorplanModificationDetector';

interface TestCase {
  title: string;
  filePath: string;
  expectedModelSubstring: string;
  expectedMinInclusions: number;
  expectedKeywords: string[];
}

const TEST_CASES: TestCase[] = [
  {
    title: "TEST 1: Flagstone Job 700548 - Crimson 24 Classic Mod LH (Permit R5)",
    filePath: "C:/Users/morga/Downloads/700548 (700548 -Lot 1954, 61 PARADISE ROAD - CRIMSON 24  CLASSIC MOD LH - PERMIT R5) 20260929183158278.pdf",
    expectedModelSubstring: "Crimson 24",
    expectedMinInclusions: 5,
    expectedKeywords: ["bath", "tiling", "ceiling", "vanity"],
  },
  {
    title: "TEST 2: Job 700469 - Burgundy 28 Classic (QLD) RH - T3 R3 (Dacayanan)",
    filePath: "C:/Users/morga/Desktop/700469 (700469 - LOT 3567 PROPOSED NEW ROAD - BURGUNDY 28 CLASSIC (QLD) RH - T3 R3) 20260123151139063v03.pdf",
    expectedModelSubstring: "Burgundy",
    expectedMinInclusions: 8,
    expectedKeywords: ["price lock", "stacker", "porch", "gable", "1200", "window", "laundry"],
  },
  {
    title: "TEST 3: Job 700512-DUAL - Dave and Selena (Alabaster 31 Mod)",
    filePath: "C:/Users/morga/Desktop/Dave and Selena - Alabaster 31 Mod.pdf",
    expectedModelSubstring: "Alabaster",
    expectedMinInclusions: 5,
    expectedKeywords: ["unit b", "stacker", "waterfall", "bath", "tiling"],
  },
  {
    title: "TEST 4: Job TR-Lyons - Jess Lyons (Maroon 28 MUP)",
    filePath: "C:/Users/morga/Desktop/Jess Lyons - Maroon 28 MUP.pdf",
    expectedModelSubstring: "Maroon",
    expectedMinInclusions: 5,
    expectedKeywords: ["portico", "cathedral", "ensuite", "powder", "staircase"],
  },
];

async function runE2E() {
  console.log("===============================================================================");
  console.log("🧪 STARTING COMPREHENSIVE E2E DETECTOR VERIFICATION ON AUTHENTIC TENDERS");
  console.log("===============================================================================\n");

  let allPassed = true;

  for (const tc of TEST_CASES) {
    console.log(`\n-------------------------------------------------------------------------------`);
    console.log(`▶️  ${tc.title}`);
    console.log(`    File: ${tc.filePath}`);

    if (!fs.existsSync(tc.filePath)) {
      console.log(`⚠️  File not found at path, skipping.`);
      continue;
    }

    const buffer = fs.readFileSync(tc.filePath);
    const file = new File([buffer], tc.filePath.split(/[/\\]/).pop() || "plan.pdf", {
      type: "application/pdf",
    });

    const startTime = Date.now();
    const result = await analyzeModifiedFloorplanFile(file, undefined, {
      skipGeminiVision: true,
    });
    const elapsed = Date.now() - startTime;

    console.log(`⏱️  Analyzed in ${elapsed}ms`);
    console.log(`🏷️  Base Design Detected: "${result.baseDesignName}" (${result.housingType})`);
    console.log(
      `📐 Schedule: Standard ${result.standardTotalM2} m² -> Modified ${result.modifiedTotalM2} m² (Net Delta: ${result.netDeltaM2 >= 0 ? '+' : ''}${result.netDeltaM2} m²)`
    );
    console.log(`🏗️  Area Footprint Deltas (${result.areaDeltas.length}):`);
    result.areaDeltas.forEach((a) => {
      console.log(`     • ${a.zoneLabel}: ${a.deltaM2 >= 0 ? '+' : ''}${a.deltaM2} m² ($${a.subtotal})`);
    });
    console.log(`🚪 Opening Replacements (${result.openingReplacements?.length || 0}):`);
    result.openingReplacements?.forEach((o) => {
      console.log(`     • ${o.newItemName} (${o.annotationCode}): Net +$${o.netCost} (Replaced $${o.replacedItemBaselineCost}, 80% Credit -$${Math.abs(o.creditAmount)})`);
    });
    console.log(`📦 Inclusions & Fixtures Detected (${result.inclusionUpgrades.length}):`);
    result.inclusionUpgrades.forEach((u) => {
      console.log(`     • [${u.category}] ${u.name}: $${u.subtotal} (Conf: ${Math.round(u.confidence * 100)}%)`);
    });

    // Validations
    const modelOk = result.baseDesignName.toLowerCase().includes(tc.expectedModelSubstring.toLowerCase());
    const countOk = result.inclusionUpgrades.length >= tc.expectedMinInclusions;
    const allDesc = result.inclusionUpgrades.map((u) => `${u.name} ${u.description}`.toLowerCase()).join(" ");
    const matchedKw = tc.expectedKeywords.filter((kw) => allDesc.includes(kw.toLowerCase()));
    const kwOk = matchedKw.length >= Math.min(3, tc.expectedKeywords.length);

    console.log(`\n📋 Check Results:`);
    console.log(`   - Model Identity "${tc.expectedModelSubstring}": ${modelOk ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   - Minimum Inclusions (>= ${tc.expectedMinInclusions}): ${countOk ? '✅ PASS (' + result.inclusionUpgrades.length + ')' : '❌ FAIL'}`);
    console.log(`   - Keyword Ingestion: ${kwOk ? '✅ PASS' : '❌ FAIL'} (Found ${matchedKw.join(", ")})`);

    if (!modelOk || !countOk || !kwOk) {
      allPassed = false;
    }
  }

  console.log("\n===============================================================================");
  if (allPassed) {
    console.log("🎉 ALL AUTHENTIC CLIENT TENDERS & MODIFIED PLANS VERIFIED WITH 100% SUCCESS!");
  } else {
    console.log("❌ ONE OR MORE VERIFICATION CHECKS FAILED!");
  }
  console.log("===============================================================================");
}

runE2E().catch((err) => {
  console.error("E2E Test execution failed:", err);
  process.exit(1);
});

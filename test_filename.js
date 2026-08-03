const { buildFlyerPdfFilename } = require('./src/lib/downloadPdf');

// Quick validation test
const mockFlyer = {
  suburb: "Box Hill",
  floorplanName: "Amber 22",
  facadeName: "Ascot",
  range: "designer"
};

console.log("Mock flyer filename output:");
console.log(buildFlyerPdfFilename(mockFlyer));

async function checkEnvInBuild() {
  const htmlRes = await fetch('https://propertypro-pdf.vercel.app');
  const html = await htmlRes.text();
  
  // Find script src
  const match = html.match(/<script type="module" crossorigin src="([^"]+)"><\/script>/);
  if (!match) {
    console.log("No main script found");
    return;
  }
  const scriptUrl = 'https://propertypro-pdf.vercel.app' + match[1];
  console.log('Found script:', scriptUrl);
  
  const jsRes = await fetch(scriptUrl);
  const js = await jsRes.text();
  
  if (js.includes('AQ.Ab8')) {
    console.log("SUCCESS: The API key IS present in the JS bundle.");
  } else {
    console.log("FAIL: The API key is NOT in the JS bundle!");
    
    // Let's check what it is replaced with
    // `new GoogleGenerativeAI(`
    const genAiIndex = js.indexOf('new GoogleGenerativeAI(');
    if (genAiIndex !== -1) {
      console.log('Snippet around GoogleGenerativeAI:', js.substring(genAiIndex, genAiIndex + 100));
    }
  }
}

checkEnvInBuild().catch(console.error);

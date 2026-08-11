  const fileToImage = 'src/components/flyer/fileToImage.ts';
  const fs = require('fs');
  let content = fs.readFileSync(fileToImage, 'utf-8');
  
  const prepareFloorplanRegex = /export async function prepareFloorplan\(url: string\): Promise<string> \{[\s\S]*?return url;\n\s*\}/;
  
  const newPrepareFloorplan = `export async function prepareFloorplan(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) return url;

  // Local pre-processed high-quality floorplans don't need fetching/cropping/sharpening
  if (url.startsWith("/floorplans/") && !url.toLowerCase().endsWith(".pdf")) {
    return url;
  }

  const cacheKey = \`\${url}::\${FLOORPLAN_PIPELINE_VERSION}\`;
  
  // 1. Check in-memory cache
  const cached = floorplanCache.get(cacheKey);
  if (cached) return cached;
  
  // 2. Check IndexedDB cache
  try {
    const idbCached = await getIdbFloorplan(cacheKey);
    if (idbCached) {
      floorplanCache.set(cacheKey, idbCached);
      return idbCached;
    }
  } catch (err) {
    console.warn("IDB cache read failed", err);
  }

  try {
    let dataUrl = "";
    if (url.toLowerCase().endsWith(".pdf")) {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        const file = new File([blob], "floorplan.pdf", { type: "application/pdf" });
        dataUrl = await dynamicPdfFloorplanToDataUrl(file);
      }
    } else {
      let b64 = "";
      // 1. Try direct fetch
      try {
        const res = await fetch(url);
        if (res.ok) {
          const blob = await res.blob();
          b64 = await blobToBase64(blob);
        }
      } catch {
        /* try CORS proxy */
      }
  
      // 2. Try CORS proxy if direct fetch failed
      if (!b64 || !b64.startsWith("data:image/")) {
        const proxies = [
          \`https://corsproxy.io/?\${encodeURIComponent(url)}\`,
          \`https://api.allorigins.win/raw?url=\${encodeURIComponent(url)}\`,
        ];
        for (const proxyUrl of proxies) {
          try {
            const res = await fetch(proxyUrl);
            if (res.ok) {
              const blob = await res.blob();
              b64 = await blobToBase64(blob);
              if (b64.startsWith("data:image/")) break;
            }
          } catch {
            /* try next proxy */
          }
        }
      }
  
      if (b64 && b64.startsWith("data:image/")) {
        const trimmed = await cropToContent(b64, 0.008);
        dataUrl = await sharpenPlan(trimmed);
      }
    }

    if (dataUrl) {
      floorplanCache.set(cacheKey, dataUrl);
      try {
        await saveIdbFloorplan(cacheKey, dataUrl);
      } catch (err) {
        console.warn("IDB cache write failed", err);
      }
      return dataUrl;
    }
  } catch (err) {
    console.error("[prepareFloorplan Error]", err);
  }
  return url;
}`;

  content = content.replace(prepareFloorplanRegex, newPrepareFloorplan);
  fs.writeFileSync(fileToImage, content);
  console.log('Patched prepareFloorplan successfully.');

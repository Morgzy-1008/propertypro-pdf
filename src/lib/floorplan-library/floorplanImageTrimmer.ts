import { useState, useEffect } from "react";

/**
 * Dynamic Runtime Floorplan Trimmer & IndexedDB Cache
 * Automatically trims excess whitespace borders from floorplan images in the browser
 * using an offscreen Canvas and caches trimmed data in IndexedDB + memory cache.
 */

const DB_NAME = "PropertyProFloorplanCacheDB";
const DB_VERSION = 1;
const STORE_NAME = "floorplan_trimmed_v1";

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB not available"));
  }
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
  return dbPromise;
}

const memoryTrimCache = new Map<string, string>();
const inFlightTrimPromises = new Map<string, Promise<string>>();

/**
 * Reads cached trimmed image from IndexedDB.
 */
async function getIdbTrimmed(url: string): Promise<string | null> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(url);
      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Saves trimmed image to IndexedDB.
 */
async function saveIdbTrimmed(url: string, dataUrl: string): Promise<void> {
  if (!url || !dataUrl) return;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(dataUrl, url);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Trims solid white or transparent borders from a floorplan image off the main thread.
 * Returns the trimmed data URL or the original URL if no trimming is needed or if CORS blocks reading.
 */
export async function trimFloorplanImage(url: string): Promise<string> {
  if (!url) return "";
  if (memoryTrimCache.has(url)) return memoryTrimCache.get(url)!;
  if (inFlightTrimPromises.has(url)) return inFlightTrimPromises.get(url)!;

  const promise = (async () => {
    // 1. Check IndexedDB
    try {
      const cached = await getIdbTrimmed(url);
      if (cached) {
        memoryTrimCache.set(url, cached);
        return cached;
      }
    } catch {}

    // 2. Load image and scan bounding box
    return new Promise<string>((resolve) => {
      if (typeof window === "undefined") return resolve(url);

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const width = img.naturalWidth;
          const height = img.naturalHeight;
          if (!width || !height) return resolve(url);

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (!ctx) return resolve(url);

          ctx.drawImage(img, 0, 0);
          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;

          let minX = width;
          let minY = height;
          let maxX = 0;
          let maxY = 0;

          // Step by 2 pixels for fast detection
          for (let y = 0; y < height; y += 2) {
            for (let x = 0; x < width; x += 2) {
              const idx = (y * width + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];

              // Pixel is considered drawing ink if it has alpha > 20 and is not pure/near-white
              if (a > 20 && (r < 240 || g < 240 || b < 240)) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }

          // If no content found or content already fills > 95% of both dimensions, return original
          const contentW = maxX - minX;
          const contentH = maxY - minY;
          if (contentW <= 50 || contentH <= 50) return resolve(url);

          const paddingX = Math.min(minX, width - maxX);
          const paddingY = Math.min(minY, height - maxY);

          // If less than 20px padding on all sides, trimming isn't needed
          if (paddingX < 20 && paddingY < 20) {
            memoryTrimCache.set(url, url);
            return resolve(url);
          }

          // Add a comfortable 12px breathing margin around the trimmed drawing
          const margin = 12;
          const cropX = Math.max(0, minX - margin);
          const cropY = Math.max(0, minY - margin);
          const cropW = Math.min(width - cropX, contentW + margin * 2);
          const cropH = Math.min(height - cropY, contentH + margin * 2);

          const trimCanvas = document.createElement("canvas");
          trimCanvas.width = cropW;
          trimCanvas.height = cropH;
          const trimCtx = trimCanvas.getContext("2d");
          if (!trimCtx) return resolve(url);

          // Keep background clean white for architectural contrast
          trimCtx.fillStyle = "#ffffff";
          trimCtx.fillRect(0, 0, cropW, cropH);
          trimCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          const trimmedDataUrl = trimCanvas.toDataURL("image/webp", 0.92);
          memoryTrimCache.set(url, trimmedDataUrl);
          saveIdbTrimmed(url, trimmedDataUrl).catch(() => {});
          resolve(trimmedDataUrl);
        } catch {
          // If tainted by CORS, resolve original URL cleanly
          memoryTrimCache.set(url, url);
          resolve(url);
        }
      };

      img.onerror = () => {
        resolve(url);
      };

      img.src = url;
    });
  })();

  inFlightTrimPromises.set(url, promise);
  try {
    const result = await promise;
    return result;
  } finally {
    inFlightTrimPromises.delete(url);
  }
}

/**
 * Synchronous memory cache check for immediate rendering without layout shift.
 */
export function getCachedTrimmedUrl(url: string): string | null {
  return memoryTrimCache.get(url) || null;
}

/**
 * React hook that returns trimmed floorplan URL.
 * Immediately returns cached URL if available, otherwise triggers background trim.
 */
export function useTrimmedFloorplan(url?: string): string {
  const [trimmedUrl, setTrimmedUrl] = useState<string>(() => {
    if (!url) return "";
    return memoryTrimCache.get(url) || url;
  });

  useEffect(() => {
    if (!url) {
      setTrimmedUrl("");
      return;
    }

    const cached = memoryTrimCache.get(url);
    if (cached) {
      setTrimmedUrl(cached);
      return;
    }

    let active = true;
    trimFloorplanImage(url).then((res) => {
      if (active && res) {
        setTrimmedUrl(res);
      }
    });

    return () => {
      active = false;
    };
  }, [url]);

  return trimmedUrl;
}


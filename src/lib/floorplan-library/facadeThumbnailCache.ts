import { useState, useEffect } from "react";
import {
  getIdbThumbnail,
  getIdbThumbnails,
  saveIdbThumbnail,
} from "@/components/flyer/idbFacadeCache";

// In-memory cache for 0ms synchronous access
const memoryThumbnailCache = new Map<string, string>();
const thumbnailListeners = new Map<string, Set<(src: string) => void>>();
const inFlightThumbnailPromises = new Map<string, Promise<string>>();

function subscribeThumbnail(url: string, callback: (src: string) => void): () => void {
  if (!thumbnailListeners.has(url)) {
    thumbnailListeners.set(url, new Set());
  }
  thumbnailListeners.get(url)!.add(callback);
  return () => {
    thumbnailListeners.get(url)?.delete(callback);
    if (thumbnailListeners.get(url)?.size === 0) {
      thumbnailListeners.delete(url);
    }
  };
}

function notifyThumbnail(url: string, src: string) {
  memoryThumbnailCache.set(url, src);
  const listeners = thumbnailListeners.get(url);
  if (listeners) {
    listeners.forEach((cb) => cb(src));
  }
}

// Concurrency-limited background thumbnail task queue (max 3 jobs concurrently)
let activeThumbnailJobs = 0;
const thumbnailJobQueue: Array<() => void> = [];

function runWithConcurrencyLimit<T>(task: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const execute = () => {
      activeThumbnailJobs++;
      task()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeThumbnailJobs--;
          if (thumbnailJobQueue.length > 0) {
            const next = thumbnailJobQueue.shift();
            next?.();
          }
        });
    };
    if (activeThumbnailJobs < 3) {
      execute();
    } else {
      thumbnailJobQueue.push(execute);
    }
  });
}

/**
 * Dynamically downsamples raw 2MB-18MB PNG facade renders into lightweight 25KB WebP thumbnails
 * via browser ImageBitmap + Canvas and permanently caches in IndexedDB and memory.
 */
async function generateThumbnailOffThread(url: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 0));

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const blob = await res.blob();

    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(blob, {
        resizeWidth: 480,
        resizeQuality: "medium",
      });
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        const thumbUrl = canvas.toDataURL("image/webp", 0.82);
        return thumbUrl;
      }
      bitmap.close();
    }
  } catch {
    // Fallback below
  }

  return new Promise<string>((resolve) => {
    if (typeof window === "undefined") return resolve(url);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const targetWidth = 480;
        const targetHeight =
          Math.round((img.naturalHeight / (img.naturalWidth || 1)) * targetWidth) || 180;
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d", { alpha: false });
        if (ctx) {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const thumbUrl = canvas.toDataURL("image/webp", 0.82);
          resolve(thumbUrl);
          return;
        }
      } catch {}
      resolve(url);
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

export async function getOrGenerateFacadeThumbnail(url: string): Promise<string> {
  if (!url) return url;
  if (memoryThumbnailCache.has(url)) {
    return memoryThumbnailCache.get(url)!;
  }
  if (inFlightThumbnailPromises.has(url)) {
    return inFlightThumbnailPromises.get(url)!;
  }

  const promise = (async () => {
    try {
      const cached = await getIdbThumbnail(url);
      if (cached) {
        notifyThumbnail(url, cached);
        return cached;
      }
    } catch {}

    return runWithConcurrencyLimit(async () => {
      if (memoryThumbnailCache.has(url)) {
        return memoryThumbnailCache.get(url)!;
      }
      const thumbUrl = await generateThumbnailOffThread(url);
      notifyThumbnail(url, thumbUrl);
      if (thumbUrl !== url) {
        saveIdbThumbnail(url, thumbUrl).catch(() => {});
      }
      return thumbUrl;
    });
  })();

  inFlightThumbnailPromises.set(url, promise);
  try {
    const result = await promise;
    return result;
  } finally {
    inFlightThumbnailPromises.delete(url);
  }
}

/**
 * React hook to get a fast, cached WebP thumbnail for a facade image URL.
 */
export function useFacadeThumbnail(url: string): string | null {
  const [thumbSrc, setThumbSrc] = useState<string | null>(
    () => memoryThumbnailCache.get(url) || null
  );

  useEffect(() => {
    if (!url) return;
    if (memoryThumbnailCache.has(url)) {
      setThumbSrc(memoryThumbnailCache.get(url)!);
      return;
    }

    const unsubscribe = subscribeThumbnail(url, (src) => {
      setThumbSrc(src);
    });

    getOrGenerateFacadeThumbnail(url).catch(() => {});

    return unsubscribe;
  }, [url]);

  return thumbSrc;
}

/**
 * Batch primes thumbnails for a list of URLs from IndexedDB in a single transaction.
 */
export function primeFacadeThumbnails(urls: string[]): void {
  if (typeof window === "undefined" || !urls || urls.length === 0) return;
  const uncached = urls.filter((u) => u && !memoryThumbnailCache.has(u));
  if (uncached.length === 0) return;

  getIdbThumbnails(uncached)
    .then((results) => {
      Object.entries(results).forEach(([url, thumbData]) => {
        if (thumbData) {
          notifyThumbnail(url, thumbData);
        }
      });
    })
    .catch(() => {});
}

/**
 * Preloads high-resolution images in the browser background cache.
 */
const preloadedUrls = new Set<string>();

export function preloadHighResFacades(urls: string[]): void {
  if (typeof window === "undefined" || !urls || urls.length === 0) return;
  urls.forEach((url) => {
    if (!url || preloadedUrls.has(url)) return;
    preloadedUrls.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  });
}

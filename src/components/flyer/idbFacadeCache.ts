/**
 * IndexedDB Permanent Cache Manager for Facade AI Renders
 * IndexedDB provides gigabytes of persistent browser storage per origin that
 * survives tab closes, browser restarts, and device reboots (unlike localStorage 5MB limit).
 */

const DB_NAME = "PropertyProFacadeCacheDB";
const DB_VERSION = 13; // Upgraded to v13 to ensure both enhanced_facades and facade_thumbnails exist reliably
const STORE_NAME = "enhanced_facades";
const THUMB_STORE_NAME = "facade_thumbnails";

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
      if (!db.objectStoreNames.contains(THUMB_STORE_NAME)) {
        db.createObjectStore(THUMB_STORE_NAME);
      }
    };
  });
  return dbPromise;
}

/** Get cached thumbnail from IndexedDB */
export async function getIdbThumbnail(url: string): Promise<string | null> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(THUMB_STORE_NAME, "readonly");
      const store = tx.objectStore(THUMB_STORE_NAME);
      const request = store.get(url);

      request.onsuccess = () => resolve((request.result as string) || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Batch get cached thumbnails from IndexedDB in a single transaction */
export async function getIdbThumbnails(urls: string[]): Promise<Record<string, string>> {
  if (!urls || urls.length === 0) return {};
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  if (uniqueUrls.length === 0) return {};

  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(THUMB_STORE_NAME, "readonly");
      const store = tx.objectStore(THUMB_STORE_NAME);
      const results: Record<string, string> = {};
      let remaining = uniqueUrls.length;

      for (const url of uniqueUrls) {
        const req = store.get(url);
        req.onsuccess = () => {
          if (req.result) results[url] = req.result as string;
          remaining--;
          if (remaining === 0) resolve(results);
        };
        req.onerror = () => {
          remaining--;
          if (remaining === 0) resolve(results);
        };
      }

      tx.oncomplete = () => resolve(results);
      tx.onerror = () => resolve(results);
    });
  } catch {
    return {};
  }
}

/** Save thumbnail permanently to IndexedDB */
export async function saveIdbThumbnail(url: string, dataUrl: string): Promise<void> {
  if (!url || !dataUrl) return;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(THUMB_STORE_NAME, "readwrite");
      const store = tx.objectStore(THUMB_STORE_NAME);
      const request = store.put(dataUrl, url);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    /* ignore fallback */
  }
}

/** Get cached outpaint render from IndexedDB */
export async function getIdbEnhanced(id: string): Promise<string | null> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve((request.result as string) || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Save outpaint render permanently to IndexedDB */
export async function saveIdbEnhanced(id: string, dataUrl: string): Promise<void> {
  if (!id || !dataUrl) return;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(dataUrl, id);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    /* ignore fallback */
  }
}

/** Evict a single facade from IndexedDB cache */
export async function clearIdbEnhanced(id: string): Promise<void> {
  if (!id) return;
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

/** Clear the entire facade render memory from IndexedDB */
export async function clearAllIdbEnhanced(): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

/** Clear all facade thumbnails from IndexedDB */
export async function clearAllIdbThumbnails(): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve) => {
      const tx = db.transaction(THUMB_STORE_NAME, "readwrite");
      const store = tx.objectStore(THUMB_STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {
    /* ignore */
  }
}

/**
 * IndexedDB Permanent Cache Manager for Facade AI Renders
 * IndexedDB provides gigabytes of persistent browser storage per origin that
 * survives tab closes, browser restarts, and device reboots (unlike localStorage 5MB limit).
 */

const DB_NAME = "PropertyProFacadeCacheDB";
const DB_VERSION = 12; // Upgraded to v12 to include high-speed facade thumbnails
const STORE_NAME = "enhanced_facades";
const THUMB_STORE_NAME = "facade_thumbnails";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
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
}

/** Get cached thumbnail from IndexedDB */
export async function getIdbThumbnail(url: string): Promise<string | null> {
  try {
    const db = await openDB();
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

/** Save thumbnail permanently to IndexedDB */
export async function saveIdbThumbnail(url: string, dataUrl: string): Promise<void> {
  if (!url || !dataUrl) return;
  try {
    const db = await openDB();
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
    const db = await openDB();
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
    const db = await openDB();
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
    const db = await openDB();
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
    const db = await openDB();
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

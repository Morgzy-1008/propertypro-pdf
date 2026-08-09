/**
 * IndexedDB Permanent Cache Manager for Facade AI Renders
 * IndexedDB provides gigabytes of persistent browser storage per origin that
 * survives tab closes, browser restarts, and device reboots (unlike localStorage 5MB limit).
 */

const DB_NAME = "PropertyProFacadeCacheDB";
const DB_VERSION = 1;
const STORE_NAME = "enhanced_facades";

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
    };
  });
}

/** Get cached outpaint render from IndexedDB (survives tab closes & browser restarts) */
export async function getIdbEnhanced(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result as string || null);
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

/** Evict a facade from IndexedDB cache (used when re-doing AI outpainting) */
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

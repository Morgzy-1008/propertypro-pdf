/**
 * IndexedDB Permanent Cache Manager for Processed Floorplans
 */

const DB_NAME = "PropertyProFloorplanCacheDB";
const DB_VERSION = 1;
const STORE_NAME = "processed_floorplans";

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

/** Get cached floorplan from IndexedDB */
export async function getIdbFloorplan(id: string): Promise<string | null> {
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

/** Save floorplan permanently to IndexedDB */
export async function saveIdbFloorplan(id: string, dataUrl: string): Promise<void> {
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

'use client';

const DB_NAME = 'CourseMediaDB';
const STORE_NAME = 'media';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = async (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
};

export const saveMediaToDB = async (fileName: string, blob: Blob) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(blob, fileName);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      console.warn('Failed to access IndexedDB store', err);
      resolve(false);
    }
  });
};

export const saveMediaBulk = async (files: { name: string, blob: Blob }[]) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      for (const file of files) {
        store.put(file.blob, file.name);
      }
      
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    } catch (err) {
      console.warn('Bulk save failed due to IndexedDB issue', err);
      resolve(false);
    }
  });
};

export const getMediaFromDB = async (fileName: string): Promise<string | null> => {
  const db = await getDB();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(fileName);
      getReq.onsuccess = () => {
        const blob = getReq.result;
        if (blob instanceof Blob) resolve(URL.createObjectURL(blob));
        else resolve(null);
      };
      getReq.onerror = () => resolve(null);
    } catch (err) {
      console.warn('Failed to read from IndexedDB', err);
      resolve(null);
    }
  });
};

const DB_NAME = 'MarkdownWorkLogDB';
const DB_VERSION = 1;
const STORE_LOGS = 'logs';
const STORE_SETTINGS = 'settings';

let dbPromise: Promise<IDBDatabase> | null = null;

function initDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_LOGS)) {
        db.createObjectStore(STORE_LOGS, { keyPath: 'date' });
      }
      
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

export async function putLog(date: string, content: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_LOGS], 'readwrite');
    const store = transaction.objectStore(STORE_LOGS);
    const request = store.put({ date, content });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLog(date: string): Promise<string | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_LOGS], 'readonly');
    const store = transaction.objectStore(STORE_LOGS);
    const request = store.get(date);

    request.onsuccess = () => {
      resolve(request.result ? request.result.content : undefined);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getAllLogDates(): Promise<string[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_LOGS], 'readonly');
    const store = transaction.objectStore(STORE_LOGS);
    const request = store.getAllKeys();

    request.onsuccess = () => {
      const dates = (request.result as string[])
        .sort()
        .reverse(); // Newest first
      resolve(dates);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function putSetting(key: string, value: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SETTINGS], 'readwrite');
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.put({ key, value });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSetting(key: string): Promise<string | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_SETTINGS], 'readonly');
    const store = transaction.objectStore(STORE_SETTINGS);
    const request = store.get(key);

    request.onsuccess = () => {
      resolve(request.result ? request.result.value : undefined);
    };
    request.onerror = () => reject(request.error);
  });
}

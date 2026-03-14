const DB_NAME = 'MarkdownWorkLogDB';
const DB_VERSION = 1;
const STORE_LOGS = 'logs';
const STORE_SETTINGS = 'settings';

let dbPromise: Promise<IDBDatabase> | null = null;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  const db = await initDB();
  const transaction = db.transaction([storeName], mode);
  const store = transaction.objectStore(storeName);
  return action(store);
}

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
  await withStore(STORE_LOGS, 'readwrite', async (store) => {
    await requestToPromise(store.put({ date, content }));
  });
}

export async function getLog(date: string): Promise<string | undefined> {
  return withStore(STORE_LOGS, 'readonly', async (store) => {
    const result = await requestToPromise(store.get(date));
    return result ? (result as { content: string }).content : undefined;
  });
}

export async function getAllLogDates(): Promise<string[]> {
  return withStore(STORE_LOGS, 'readonly', async (store) => {
    const dates = (await requestToPromise(store.getAllKeys()) as string[])
      .sort()
      .reverse();
    return dates;
  });
}

export async function putSetting(key: string, value: string): Promise<void> {
  await withStore(STORE_SETTINGS, 'readwrite', async (store) => {
    await requestToPromise(store.put({ key, value }));
  });
}

export async function getSetting(key: string): Promise<string | undefined> {
  return withStore(STORE_SETTINGS, 'readonly', async (store) => {
    const result = await requestToPromise(store.get(key));
    return result ? (result as { value: string }).value : undefined;
  });
}

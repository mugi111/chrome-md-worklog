/// <reference types="chrome" />
import { getLog, putLog, getAllLogDates, getSetting, putSetting } from './db';

export const LOG_PREFIX = 'log_';
const TEMPLATE_KEY = 'settings_template';

export async function loadLog(date: string): Promise<string> {
  const content = await getLog(date);
  return content || '';
}

export async function saveLogDirect(date: string, content: string): Promise<void> {
  await putLog(date, content);
}

// Simple debounce implementation
let timeoutId: number | null = null;
export function saveLogDebounced(date: string, content: string, delay = 500): void {
  if (timeoutId !== null) {
    clearTimeout(timeoutId);
  }
  timeoutId = window.setTimeout(() => {
    saveLogDirect(date, content).catch(err => {
      console.error('Failed to save log', err);
    });
  }, delay);
}

export async function getAllLogs(): Promise<string[]> {
  return await getAllLogDates();
}

export async function loadTemplate(): Promise<string | undefined> {
  return await getSetting(TEMPLATE_KEY);
}

export async function saveTemplate(content: string): Promise<void> {
  await putSetting(TEMPLATE_KEY, content);
}

export async function migrateFromChromeStorage(): Promise<void> {
  const migrationRanKey = 'indexeddb_migration_complete';
  const check = await chrome.storage.local.get(migrationRanKey);
  if (check[migrationRanKey]) {
    return; // Already migrated
  }

  console.log('Migrating data from chrome.storage.local to IndexedDB...');
  const allData = await chrome.storage.local.get(null);
  
  for (const [key, value] of Object.entries(allData)) {
    if (key.startsWith(LOG_PREFIX)) {
      const date = key.substring(LOG_PREFIX.length);
      await putLog(date, value as string);
    } else if (key === TEMPLATE_KEY) {
      await putSetting(TEMPLATE_KEY, value as string);
    }
  }

  // Mark migration as complete
  await chrome.storage.local.set({ [migrationRanKey]: true });
  console.log('Migration complete!');
}

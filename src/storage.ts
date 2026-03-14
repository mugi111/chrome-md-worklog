/// <reference types="chrome" />
import { getLog, putLog, getAllLogDates, getSetting, putSetting } from './db';

export const LOG_PREFIX = 'log_';
const TEMPLATE_KEY = 'settings_template';
const MIGRATION_COMPLETE_KEY = 'indexeddb_migration_complete';

type PendingSave = {
  content: string;
  timeoutId: number;
};

const pendingSaves = new Map<string, PendingSave>();

export async function loadLog(date: string): Promise<string> {
  const content = await getLog(date);
  return content || '';
}

export async function saveLogDirect(date: string, content: string): Promise<void> {
  await putLog(date, content);
}

export function saveLogDebounced(date: string, content: string, delay = 500): void {
  const existingSave = pendingSaves.get(date);
  if (existingSave) {
    clearTimeout(existingSave.timeoutId);
  }

  const timeoutId = window.setTimeout(() => {
    pendingSaves.delete(date);
    saveLogDirect(date, content).catch((err) => {
      console.error('Failed to save log', err);
    });
  }, delay);

  pendingSaves.set(date, { content, timeoutId });
}

export async function flushPendingSave(date: string): Promise<void> {
  const pendingSave = pendingSaves.get(date);
  if (!pendingSave) {
    return;
  }

  clearTimeout(pendingSave.timeoutId);
  pendingSaves.delete(date);
  await saveLogDirect(date, pendingSave.content);
}

export async function flushAllPendingSaves(): Promise<void> {
  const dates = Array.from(pendingSaves.keys());
  await Promise.all(dates.map((date) => flushPendingSave(date)));
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
  const check = await chrome.storage.local.get(MIGRATION_COMPLETE_KEY);
  if (check[MIGRATION_COMPLETE_KEY]) {
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
  await chrome.storage.local.set({ [MIGRATION_COMPLETE_KEY]: true });
  console.log('Migration complete!');
}

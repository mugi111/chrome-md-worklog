/// <reference types="chrome" />
export const LOG_PREFIX = 'log_';

export async function loadLog(date: string): Promise<string> {
  const key = `${LOG_PREFIX}${date}`;
  const result = await chrome.storage.local.get(key);
  return (result[key] as string) || '';
}

export async function saveLogDirect(date: string, content: string): Promise<void> {
  const key = `${LOG_PREFIX}${date}`;
  await chrome.storage.local.set({ [key]: content });
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

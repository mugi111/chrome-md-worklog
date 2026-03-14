import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadDbModule() {
  vi.resetModules();
  return import('../src/db');
}

describe('db', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { indexedDB: IDBFactory }).indexedDB = new IDBFactory();
  });

  it('stores and loads a log by date', async () => {
    const db = await loadDbModule();

    await db.putLog('2026-03-14', 'worked on tests');

    await expect(db.getLog('2026-03-14')).resolves.toBe('worked on tests');
  });

  it('returns log dates in reverse chronological order', async () => {
    const db = await loadDbModule();

    await db.putLog('2026-03-12', 'older');
    await db.putLog('2026-03-14', 'newer');
    await db.putLog('2026-03-13', 'middle');

    await expect(db.getAllLogDates()).resolves.toEqual([
      '2026-03-14',
      '2026-03-13',
      '2026-03-12',
    ]);
  });

  it('stores and loads settings by key', async () => {
    const db = await loadDbModule();

    await db.putSetting('settings_template', '# default');

    await expect(db.getSetting('settings_template')).resolves.toBe('# default');
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getLogMock = vi.fn();
const putLogMock = vi.fn();
const getAllLogDatesMock = vi.fn();
const getSettingMock = vi.fn();
const putSettingMock = vi.fn();

vi.mock('../src/db', () => ({
  getLog: getLogMock,
  putLog: putLogMock,
  getAllLogDates: getAllLogDatesMock,
  getSetting: getSettingMock,
  putSetting: putSettingMock,
}));

function createChromeStorage(initialData: Record<string, unknown> = {}) {
  const store = { ...initialData };

  return {
    storage: {
      local: {
        get: vi.fn(async (key: string | null) => {
          if (key === null) {
            return { ...store };
          }

          return { [key]: store[key] };
        }),
        set: vi.fn(async (values: Record<string, unknown>) => {
          Object.assign(store, values);
        }),
      },
    },
  };
}

async function loadStorageModule() {
  vi.resetModules();
  return import('../src/storage');
}

describe('storage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (globalThis as typeof globalThis & { window: typeof globalThis }).window = globalThis;
    getLogMock.mockResolvedValue(undefined);
    getAllLogDatesMock.mockResolvedValue([]);
    getSettingMock.mockResolvedValue(undefined);
    putLogMock.mockResolvedValue(undefined);
    putSettingMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('debounces saves per date and writes only the latest content', async () => {
    const storage = await loadStorageModule();

    storage.saveLogDebounced('2026-03-14', 'first draft', 500);
    storage.saveLogDebounced('2026-03-14', 'final draft', 500);

    await vi.advanceTimersByTimeAsync(499);
    expect(putLogMock).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(putLogMock).toHaveBeenCalledTimes(1);
    expect(putLogMock).toHaveBeenCalledWith('2026-03-14', 'final draft');
  });

  it('keeps pending saves isolated by date', async () => {
    const storage = await loadStorageModule();

    storage.saveLogDebounced('2026-03-14', 'today', 500);
    storage.saveLogDebounced('2026-03-13', 'yesterday', 500);

    await storage.flushAllPendingSaves();

    expect(putLogMock).toHaveBeenCalledTimes(2);
    expect(putLogMock).toHaveBeenCalledWith('2026-03-14', 'today');
    expect(putLogMock).toHaveBeenCalledWith('2026-03-13', 'yesterday');
  });

  it('flushes the active date before its timer fires', async () => {
    const storage = await loadStorageModule();

    storage.saveLogDebounced('2026-03-14', 'unsaved changes', 500);
    await storage.flushPendingSave('2026-03-14');
    await vi.advanceTimersByTimeAsync(500);

    expect(putLogMock).toHaveBeenCalledTimes(1);
    expect(putLogMock).toHaveBeenCalledWith('2026-03-14', 'unsaved changes');
  });

  it('migrates logs and template from chrome.storage.local once', async () => {
    const chromeMock = createChromeStorage({
      'log_2026-03-14': 'hello',
      settings_template: '# template',
    });
    (globalThis as typeof globalThis & { chrome: typeof chromeMock }).chrome = chromeMock;

    const storage = await loadStorageModule();
    await storage.migrateFromChromeStorage();

    expect(putLogMock).toHaveBeenCalledWith('2026-03-14', 'hello');
    expect(putSettingMock).toHaveBeenCalledWith('settings_template', '# template');
    expect(chromeMock.storage.local.set).toHaveBeenCalledWith({ indexeddb_migration_complete: true });
  });

  it('skips migration when the completion flag already exists', async () => {
    const chromeMock = createChromeStorage({
      indexeddb_migration_complete: true,
      'log_2026-03-14': 'hello',
    });
    (globalThis as typeof globalThis & { chrome: typeof chromeMock }).chrome = chromeMock;

    const storage = await loadStorageModule();
    await storage.migrateFromChromeStorage();

    expect(putLogMock).not.toHaveBeenCalled();
    expect(putSettingMock).not.toHaveBeenCalled();
  });
});

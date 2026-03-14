import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadExportModule() {
  vi.resetModules();
  return import('../src/export');
}

describe('exportLogAsMarkdown', () => {
  const createObjectURLMock = vi.fn(() => 'blob:worklog');
  const revokeObjectURLMock = vi.fn();
  const downloadMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (globalThis as typeof globalThis & { chrome: unknown }).chrome = {
      downloads: {
        download: downloadMock,
      },
      runtime: {
        lastError: null,
      },
    };

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURLMock,
    });

    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURLMock,
    });
  });

  it('skips download when content is empty', async () => {
    const { exportLogAsMarkdown } = await loadExportModule();

    await expect(exportLogAsMarkdown('2026-03-14', '')).resolves.toBeUndefined();
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('downloads the markdown file with the expected filename', async () => {
    downloadMock.mockImplementation((_options: unknown, callback: (id: number) => void) => {
      callback(1);
    });

    const { exportLogAsMarkdown } = await loadExportModule();
    await exportLogAsMarkdown('2026-03-14', '# Work Log');

    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(downloadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'blob:worklog',
        filename: 'worklog_2026-03-14.md',
        saveAs: true,
      }),
      expect.any(Function),
    );
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:worklog');
  });

  it('rejects when chrome reports a download error', async () => {
    downloadMock.mockImplementation((_options: unknown, callback: (id: number) => void) => {
      (globalThis as typeof globalThis & { chrome: { runtime: { lastError: { message: string } } } }).chrome.runtime.lastError = {
        message: 'Download failed',
      };
      callback(1);
    });

    const { exportLogAsMarkdown } = await loadExportModule();

    await expect(exportLogAsMarkdown('2026-03-14', '# Work Log')).rejects.toThrow('Download failed');
  });
});

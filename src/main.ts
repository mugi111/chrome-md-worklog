import './style.css'
import { createEditor } from './editor';
import { getTodayDateString } from './utils';
import {
  flushAllPendingSaves,
  flushPendingSave,
  loadLog,
  loadTemplate,
  migrateFromChromeStorage,
  saveLogDebounced,
  saveTemplate,
} from './storage';
import { DEFAULT_TEMPLATE } from './template';

type DestroyableEditor = {
  destroy: () => void;
};

type AppElements = {
  container: HTMLElement;
  datePicker: HTMLInputElement;
  exportButton: HTMLButtonElement;
  settingsButton: HTMLButtonElement;
  openTabButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  modal: HTMLDivElement;
  templateEditor: HTMLTextAreaElement;
  cancelButton: HTMLButtonElement;
  saveButton: HTMLButtonElement;
};

let currentEditor: DestroyableEditor | null = null;
let currentDate = getTodayDateString();

function getRequiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }

  return element as T;
}

function renderAppShell(root: HTMLElement): AppElements {
  root.innerHTML = `
    <div class="title-bar">
      <div class="title-bar-left">
        <img src="/icon.svg" alt="MD Work Log" class="logo-icon" />
        Markdown Work Log
      </div>
      <div class="title-bar-right">
        <button id="settings-btn" class="icon-btn" title="Template Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </button>
        <button id="open-tab-btn" class="icon-btn" title="Open in New Tab">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </button>
        <button id="close-btn" class="icon-btn" title="Close Panel">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
    </div>

    <div class="toolbar">
      <div class="date-input-wrapper">
        <input type="date" id="date-picker" title="Select arbitrary date" max="2100-12-31" />
      </div>
      <button id="export-btn" class="action-btn" title="Export as Markdown">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        Export
      </button>
    </div>

    <main id="editor-container"></main>

    <footer>
      <span>MARKDOWN MODE</span>
      <span>Saved locally</span>
    </footer>

    <div id="settings-modal" class="modal hidden" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div class="modal-content">
        <h2 id="settings-title">Template Settings</h2>
        <p class="modal-description">Template changes apply only when a log is empty.</p>
        <textarea id="template-editor" rows="12" spellcheck="false"></textarea>
        <div class="modal-actions">
          <button id="settings-cancel-btn" class="action-btn" type="button">Cancel</button>
          <button id="settings-save-btn" class="action-btn primary-btn" type="button">Save Template</button>
        </div>
      </div>
    </div>
  `;

  return {
    container: getRequiredElement<HTMLElement>('editor-container'),
    datePicker: getRequiredElement<HTMLInputElement>('date-picker'),
    exportButton: getRequiredElement<HTMLButtonElement>('export-btn'),
    settingsButton: getRequiredElement<HTMLButtonElement>('settings-btn'),
    openTabButton: getRequiredElement<HTMLButtonElement>('open-tab-btn'),
    closeButton: getRequiredElement<HTMLButtonElement>('close-btn'),
    modal: getRequiredElement<HTMLDivElement>('settings-modal'),
    templateEditor: getRequiredElement<HTMLTextAreaElement>('template-editor'),
    cancelButton: getRequiredElement<HTMLButtonElement>('settings-cancel-btn'),
    saveButton: getRequiredElement<HTMLButtonElement>('settings-save-btn'),
  };
}

function openModal(modal: HTMLDivElement): void {
  modal.classList.remove('hidden');
}

function closeModal(modal: HTMLDivElement): void {
  modal.classList.add('hidden');
}

async function getEditorContent(date: string): Promise<string> {
  let content = await loadLog(date);
  if (!content.trim()) {
    const customTemplate = await loadTemplate();
    content = customTemplate ?? DEFAULT_TEMPLATE;
  }

  return content;
}

async function renderEditor(container: HTMLElement, date: string) {
  container.innerHTML = '';

  const content = await getEditorContent(date);
  currentEditor = await createEditor(container, content, (markdown) => {
    saveLogDebounced(date, markdown);
  });
}

async function switchDate(container: HTMLElement, nextDate: string): Promise<void> {
  if (nextDate === currentDate) {
    return;
  }

  await flushPendingSave(currentDate);
  currentDate = nextDate;
  currentEditor?.destroy();
  await renderEditor(container, currentDate);
}

function bindEvents(elements: AppElements): void {
  elements.datePicker.value = currentDate;
  elements.datePicker.addEventListener('change', (event) => {
    const nextDate = (event.target as HTMLInputElement).value;
    if (!nextDate) {
      return;
    }

    switchDate(elements.container, nextDate).catch((err) => console.error(err));
  });

  elements.exportButton.addEventListener('click', async () => {
    await flushPendingSave(currentDate);
    const content = await loadLog(currentDate);
    if (content.trim()) {
      import('./export').then(({ exportLogAsMarkdown }) => {
        exportLogAsMarkdown(currentDate, content).catch((err) => console.error('Export failed', err));
      });
    }
  });

  elements.settingsButton.addEventListener('click', async () => {
    const currentTemplate = await loadTemplate();
    elements.templateEditor.value = currentTemplate ?? DEFAULT_TEMPLATE;
    openModal(elements.modal);
  });

  elements.openTabButton.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  });

  elements.closeButton.addEventListener('click', () => {
    flushAllPendingSaves()
      .catch((err) => console.error('Failed to flush pending saves', err))
      .finally(() => window.close());
  });

  elements.cancelButton.addEventListener('click', () => {
    closeModal(elements.modal);
  });

  elements.saveButton.addEventListener('click', async () => {
    await saveTemplate(elements.templateEditor.value);
    closeModal(elements.modal);
    alert('Template saved! Note: Changes apply to new logs only.');
  });
}

async function init() {
  await migrateFromChromeStorage();

  const appRoot = getRequiredElement<HTMLDivElement>('app');
  const elements = renderAppShell(appRoot);
  bindEvents(elements);

  window.addEventListener('beforeunload', () => {
    flushAllPendingSaves().catch((err) => {
      console.error('Failed to flush pending saves', err);
    });
  });

  await renderEditor(elements.container, currentDate);
}

init();


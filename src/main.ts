import './style.css'
import { createEditor } from './editor';
import { getTodayDateString } from './utils';
import { loadLog, saveLogDebounced, loadTemplate, saveTemplate, migrateFromChromeStorage } from './storage';
import { DEFAULT_TEMPLATE } from './template';

let currentEditor: any = null;
let currentDate: string = getTodayDateString();

async function renderEditor(date: string) {
  const container = document.getElementById('editor-container');
  if (!container) return;
  
  // Clear existing
  container.innerHTML = '';
  
  let content = await loadLog(date);
  if (!content.trim()) {
    const customTemplate = await loadTemplate();
    content = customTemplate ?? DEFAULT_TEMPLATE;
  }
  
  currentEditor = await createEditor(container, content, (markdown) => {
    saveLogDebounced(date, markdown);
  });
}

async function init() {
  await migrateFromChromeStorage();
  
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <div class="title-bar">
      <div class="title-bar-left">
        <div class="logo-icon">M</div>
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
  `;

  const datePicker = document.getElementById('date-picker') as HTMLInputElement;

  if (datePicker) {
    datePicker.value = currentDate;
    datePicker.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.value) {
        currentDate = target.value;
        if (currentEditor) currentEditor.destroy();
        renderEditor(currentDate).catch(err => console.error(err));
      }
    });
  }

  document.getElementById('export-btn')?.addEventListener('click', async () => {
    const content = await loadLog(currentDate);
    if (content.trim()) {
      import('./export').then(({ exportLogAsMarkdown }) => {
        exportLogAsMarkdown(currentDate, content).catch(err => console.error('Export failed', err));
      });
    }
  });

  // Settings Modal Logic
  const settingsBtn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('close-btn');
  const modal = document.getElementById('settings-modal');
  const cancelBtn = document.getElementById('settings-cancel-btn');
  const saveBtn = document.getElementById('settings-save-btn');
  const templateEditor = document.getElementById('template-editor') as HTMLTextAreaElement;

  settingsBtn?.addEventListener('click', async () => {
    if (modal && templateEditor) {
      const currentTemplate = await loadTemplate();
      templateEditor.value = currentTemplate ?? DEFAULT_TEMPLATE;
      modal.style.display = 'flex';
    }
  });

  const openTabBtn = document.getElementById('open-tab-btn');
  openTabBtn?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  });

  closeBtn?.addEventListener('click', () => {
    window.close();
  });

  cancelBtn?.addEventListener('click', () => {
    if (modal) modal.style.display = 'none';
  });

  saveBtn?.addEventListener('click', async () => {
    if (modal && templateEditor) {
      await saveTemplate(templateEditor.value);
      modal.style.display = 'none';
      alert('Template saved! Note: Changes apply to new logs only.');
    }
  });

  await renderEditor(currentDate);
}

init();



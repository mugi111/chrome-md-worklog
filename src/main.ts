import './style.css'
import { createEditor } from './editor';
import { getTodayDateString } from './utils';
import { loadLog, saveLogDebounced, loadTemplate, saveTemplate } from './storage';
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
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <header>
      <div style="display: flex; gap: 8px; align-items: center; width: 100%; justify-content: space-between;">
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="date" id="date-picker" title="Select arbitrary date" max="2100-12-31" style="padding: 2px 4px; border-radius: 4px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-color);" />
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button id="settings-btn" title="Template Settings">⚙️</button>
          <button id="export-btn" title="Export as Markdown">Export</button>
        </div>
      </div>
    </header>
    <main id="editor-container"></main>
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



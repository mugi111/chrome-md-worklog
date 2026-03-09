import './style.css'
import { createEditor } from './editor';
import { getTodayDateString } from './utils';
import { loadLog, saveLogDebounced, getAllLogs } from './storage';
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
    content = DEFAULT_TEMPLATE;
  }
  
  currentEditor = await createEditor(container, content, (markdown) => {
    saveLogDebounced(date, markdown);
  });
}

async function init() {
  const allLogs = await getAllLogs();
  if (!allLogs.includes(currentDate)) {
    allLogs.unshift(currentDate);
  }
  
  const optionsHtml = allLogs.map(date => 
    `<option value="${date}" ${date === currentDate ? 'selected' : ''}>${date}</option>`
  ).join('');

  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <header>
      <h1>Work Log</h1>
      <div style="display: flex; gap: 8px;">
        <select id="history-selector" aria-label="Select history date">
          ${optionsHtml}
        </select>
        <button id="export-btn" title="Export as Markdown">Export</button>
      </div>
    </header>
    <main id="editor-container"></main>
  `;

  document.getElementById('history-selector')?.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
    currentDate = target.value;
    if (currentEditor) {
      currentEditor.destroy(); // destroy previous editor if milkdown supports it
    }
    renderEditor(currentDate).catch(err => console.error(err));
  });

  document.getElementById('export-btn')?.addEventListener('click', async () => {
    const content = await loadLog(currentDate);
    if (content.trim()) {
      import('./export').then(({ exportLogAsMarkdown }) => {
        exportLogAsMarkdown(currentDate, content).catch(err => console.error('Export failed', err));
      });
    }
  });

  await renderEditor(currentDate);
}

init();



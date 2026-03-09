import './style.css'
import { createEditor } from './editor';
import { getTodayDateString } from './utils';
import { loadLog, saveLogDebounced } from './storage';

async function init() {
  const today = getTodayDateString();
  
  document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
    <header>
      <h1>Work Log</h1>
      <span id="date-display">${today}</span>
    </header>
    <main id="editor-container"></main>
  `;

  const container = document.getElementById('editor-container');
  if (container) {
    const initialContent = await loadLog(today);
    createEditor(container, initialContent, (markdown) => {
      saveLogDebounced(today, markdown);
    }).catch(err => console.error('Failed to initialize editor', err));
  }
}

init();



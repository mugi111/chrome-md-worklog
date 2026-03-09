import './style.css'
import { createEditor } from './editor';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header>
    <h1>Work Log</h1>
    <span id="date-display">${new Date().toISOString().split('T')[0]}</span>
  </header>
  <main id="editor-container">
  </main>
`

const container = document.getElementById('editor-container');
if (container) {
  createEditor(container, '# Loading...', (markdown) => {
    console.log('Editor content updated:', markdown);
  }).catch(err => console.error('Failed to initialize editor', err));
}


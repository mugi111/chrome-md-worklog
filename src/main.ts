import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header>
    <h1>Work Log</h1>
    <span id="date-display">${new Date().toISOString().split('T')[0]}</span>
  </header>
  <main id="editor-container">
    <div class="placeholder-text">
      <p>Milkdown editor will be loaded here in Phase 2.</p>
    </div>
  </main>
`

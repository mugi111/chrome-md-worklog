export async function exportLogAsMarkdown(date: string, content: string): Promise<void> {
  if (!content) return;
  
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const filename = `worklog_${date}.md`;
  
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url,
      filename,
      saveAs: true // Let the user choose where to save or use default
    }, (_downloadId) => {
      URL.revokeObjectURL(url);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

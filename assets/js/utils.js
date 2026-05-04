export function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function richText(value = '') {
  return escapeHtml(value).replaceAll('\n', '<br>');
}

export function debounce(fn, wait = 80) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export function downloadText(filename, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function typeset(element = document.body) {
  if (window.MathJax?.typesetPromise) {
    try {
      await window.MathJax.typesetPromise([element]);
    } catch (error) {
      console.warn('MathJax typeset failed:', error);
    }
  }
}

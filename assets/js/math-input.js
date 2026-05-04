import { state } from './state.js';
import { debounce, escapeHtml, typeset } from './utils.js';

export function attachMathInputs(container) {
  container.querySelectorAll('[data-answer-input]').forEach(input => {
    input.addEventListener('focus', () => {
      state.activeInput = input;
    });
    input.addEventListener('input', debounce(() => updatePreview(input), 80));
    updatePreview(input);
  });

  container.querySelectorAll('[data-insert]').forEach(button => {
    button.addEventListener('click', () => {
      const input = state.activeInput || container.querySelector('[data-answer-input]');
      if (!input) return;
      insertAtCursor(input, button.dataset.insert || '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    });
  });
}

export function paletteHtml() {
  const template = document.querySelector('#mathPaletteTemplate');
  return template ? template.innerHTML : '';
}

function updatePreview(input) {
  const id = input.dataset.previewTarget;
  if (!id) return;
  const preview = document.getElementById(id);
  if (!preview) return;
  const value = input.value.trim();
  preview.innerHTML = value ? `\\(${escapeHtml(value)}\\)` : '<span class="meta">Live math preview appears here.</span>';
  typeset(preview);
}

function insertAtCursor(input, insertText) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const before = input.value.slice(0, start);
  const after = input.value.slice(end);
  input.value = `${before}${insertText}${after}`;

  const placeholderIndex = insertText.indexOf('□');
  if (placeholderIndex >= 0) {
    const caret = start + placeholderIndex;
    input.setSelectionRange(caret, caret + 1);
  } else {
    const caret = start + insertText.length;
    input.setSelectionRange(caret, caret);
  }
}

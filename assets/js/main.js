import { state, resetState } from './state.js';
import { packetFromFile, packetFromUrl, blankPacketTemplate } from './packet.js';
import { renderApp } from './render.js';
import { downloadText } from './utils.js';

const packetFile = document.querySelector('#packetFile');
const loadSample = document.querySelector('#loadSample');
const downloadTemplate = document.querySelector('#downloadTemplate');
const practiceMode = document.querySelector('#practiceMode');
const reviewMode = document.querySelector('#reviewMode');
const themeToggle = document.querySelector('#themeToggle');

packetFile.addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const packet = await packetFromFile(file);
    resetState(packet);
    renderApp();
  } catch (error) {
    alert(error.message || 'Could not load packet.');
  }
});

loadSample.addEventListener('click', async () => {
  try {
    const packet = await packetFromUrl('./question-packets/sample-grade9-12.json');
    resetState(packet);
    renderApp();
  } catch (error) {
    alert(`${error.message}\n\nIf you opened index.html directly from your computer, upload the sample JSON manually or use VS Code Live Server/GitHub Pages.`);
  }
});

downloadTemplate.addEventListener('click', () => {
  downloadText('blank-math-packet.json', JSON.stringify(blankPacketTemplate, null, 2));
});

practiceMode.addEventListener('click', () => {
  if (!state.packet) return;
  state.mode = 'practice';
  renderApp();
});

reviewMode.addEventListener('click', () => {
  if (!state.packet) return;
  state.mode = 'review';
  renderApp();
});

themeToggle.addEventListener('click', () => {
  const html = document.documentElement;
  const nextTheme = html.dataset.theme === 'dark' ? 'light' : 'dark';
  html.dataset.theme = nextTheme;
  localStorage.setItem('open-math-theme', nextTheme);
});

const savedTheme = localStorage.getItem('open-math-theme');
if (savedTheme) {
  document.documentElement.dataset.theme = savedTheme;
}

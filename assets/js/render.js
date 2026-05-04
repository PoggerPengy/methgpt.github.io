import { state } from './state.js';
import { gradeQuestion, readableAnswer } from './grading.js';
import { attachMathInputs, paletteHtml } from './math-input.js';
import { escapeHtml, richText, typeset } from './utils.js';

const els = {
  workspace: () => document.querySelector('#workspace'),
  packetSummary: () => document.querySelector('#packetSummary'),
  questionList: () => document.querySelector('#questionList'),
  questionArea: () => document.querySelector('#questionArea'),
  progressPill: () => document.querySelector('#progressPill'),
  practiceMode: () => document.querySelector('#practiceMode'),
  reviewMode: () => document.querySelector('#reviewMode')
};

export function renderApp() {
  if (!state.packet) return;
  els.workspace().classList.remove('hidden');
  renderSummary();
  renderList();
  if (state.mode === 'review') renderReviewAll();
  else renderQuestion();
}

export function renderSummary() {
  const packet = state.packet;
  const completed = Object.values(state.results).filter(result => result.status === 'correct').length;
  const totalPoints = packet.questions.reduce((sum, q) => sum + Number(q.points || 1), 0);
  const summary = els.packetSummary();
  summary.classList.remove('hidden');
  summary.innerHTML = `
    <div class="panel-heading">
      <div>
        <span class="level-pill">${escapeHtml(packet.level)}</span>
        <h2>${escapeHtml(packet.title)}</h2>
        <p>${richText(packet.description || 'No description provided.')}</p>
      </div>
      <div class="meta">
        <strong>${packet.questions.length}</strong> questions<br>
        <strong>${totalPoints}</strong> total point${totalPoints === 1 ? '' : 's'}<br>
        <strong>${completed}</strong> completed
      </div>
    </div>
  `;
}

export function renderList() {
  const packet = state.packet;
  const completed = Object.values(state.results).filter(result => result.status === 'correct').length;
  els.progressPill().textContent = `${completed} / ${packet.questions.length}`;
  els.practiceMode().classList.toggle('active', state.mode === 'practice');
  els.reviewMode().classList.toggle('active', state.mode === 'review');

  els.questionList().innerHTML = packet.questions.map((question, index) => {
    const result = state.results[question.id];
    const status = result?.status || '';
    return `
      <li>
        <button type="button" class="${index === state.currentIndex && state.mode === 'practice' ? 'active' : ''}" data-go-question="${index}">
          <span class="q-number">${index + 1}</span>
          <span class="q-title">${escapeHtml(question.title)}</span>
          <span class="status-dot ${status}" title="${escapeHtml(status || 'unanswered')}"></span>
        </button>
      </li>
    `;
  }).join('');

  els.questionList().querySelectorAll('[data-go-question]').forEach(button => {
    button.addEventListener('click', () => {
      state.mode = 'practice';
      state.currentIndex = Number(button.dataset.goQuestion);
      renderApp();
    });
  });
}

export function renderQuestion() {
  const question = state.packet.questions[state.currentIndex];
  const result = state.results[question.id];
  const questionArea = els.questionArea();
  questionArea.innerHTML = `
    <article>
      <div class="question-header">
        <div>
          <span class="type-pill">${typeLabel(question.type)}</span>
          <h2>${state.currentIndex + 1}. ${escapeHtml(question.title)}</h2>
          <p class="meta">${Number(question.points || 1)} point${Number(question.points || 1) === 1 ? '' : 's'}</p>
        </div>
        <div class="nav-actions">
          <button id="prevQuestion" class="secondary-btn" type="button" ${state.currentIndex === 0 ? 'disabled' : ''}>Previous</button>
          <button id="nextQuestion" class="secondary-btn" type="button" ${state.currentIndex === state.packet.questions.length - 1 ? 'disabled' : ''}>Next</button>
        </div>
      </div>
      ${questionContentHtml(question)}
      ${answerHtml(question)}
      <div class="answer-actions">
        <button id="checkAnswer" type="button">Check answer</button>
        <button id="clearAnswer" class="secondary-btn" type="button">Clear</button>
        ${question.hint ? '<button id="showHint" class="secondary-btn" type="button">Hint</button>' : ''}
      </div>
      <div id="hintBox" class="hint-box hidden">${richText(question.hint || '')}</div>
      <div id="feedbackArea">${result ? feedbackHtml(question, result) : ''}</div>
      <p class="footer-note">Use plain answers like <code>3/4</code> or LaTeX answers like <code>\\frac{3}{4}</code>. For expression questions, exact accepted forms are defined by the packet.</p>
    </article>
  `;

  wireQuestionEvents(questionArea, question);
  attachMathInputs(questionArea);
  typeset(questionArea);
}

function questionContentHtml(question) {
  const table = question.table ? tableHtml(question.table) : '';
  const math = question.math ? `<div class="math-display">\\[${escapeHtml(question.math)}\\]</div>` : '';
  const image = question.image ? `<img class="question-image" src="${escapeHtml(question.image.src)}" alt="${escapeHtml(question.image.alt || '')}" />` : '';
  return `
    <div class="question-body">
      ${question.prompt ? `<p>${richText(question.prompt)}</p>` : ''}
      ${math}
      ${table}
      ${image}
    </div>
  `;
}

function tableHtml(table) {
  const headers = Array.isArray(table.headers) ? table.headers : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];
  return `
    <table class="question-table">
      ${headers.length ? `<thead><tr>${headers.map(cell => `<th>${richText(cell)}</th>`).join('')}</tr></thead>` : ''}
      <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${richText(cell)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  `;
}

function answerHtml(question) {
  const existing = state.responses[question.id] ?? '';

  if (question.type === 'multiple_choice') {
    return `
      <div class="choice-grid" role="radiogroup" aria-label="Multiple choice answers">
        ${(question.options || []).map((option, index) => {
          const id = option.id || String.fromCharCode(65 + index);
          const label = option.text || option.label || option.value || id;
          return `
            <label class="choice-card">
              <input type="radio" name="choice-${escapeHtml(question.id)}" value="${escapeHtml(id)}" ${existing === id ? 'checked' : ''} />
              <span><strong>${escapeHtml(id)}.</strong> ${richText(label)}</span>
            </label>
          `;
        }).join('')}
      </div>
    `;
  }

  if (question.type === 'multi_part') {
    return `
      <div class="answer-block">
        ${(question.parts || []).map((part, index) => {
          const partId = part.id || `part${index + 1}`;
          const saved = state.responses[question.id]?.[partId] || '';
          const previewId = `preview-${escapeHtml(question.id)}-${escapeHtml(partId)}`;
          return `
            <label for="answer-${escapeHtml(question.id)}-${escapeHtml(partId)}">${escapeHtml(part.label || `Part ${index + 1}`)}</label>
            ${part.prompt ? `<p>${richText(part.prompt)}</p>` : ''}
            <textarea id="answer-${escapeHtml(question.id)}-${escapeHtml(partId)}" class="answer-input" data-answer-input data-part-id="${escapeHtml(partId)}" data-preview-target="${previewId}" placeholder="Type your answer here">${escapeHtml(saved)}</textarea>
            ${paletteHtml()}
            <div id="${previewId}" class="preview-box"></div>
          `;
        }).join('')}
      </div>
    `;
  }

  const previewId = `preview-${escapeHtml(question.id)}`;
  return `
    <div class="answer-block">
      <label for="answer-${escapeHtml(question.id)}">Your answer</label>
      <textarea id="answer-${escapeHtml(question.id)}" class="answer-input" data-answer-input data-preview-target="${previewId}" placeholder="Example: \\frac{3}{4}, x=5, y=2x-1">${escapeHtml(existing)}</textarea>
      ${paletteHtml()}
      <div id="${previewId}" class="preview-box"></div>
    </div>
  `;
}

function wireQuestionEvents(container, question) {
  container.querySelector('#prevQuestion')?.addEventListener('click', () => {
    state.currentIndex = Math.max(0, state.currentIndex - 1);
    renderApp();
  });
  container.querySelector('#nextQuestion')?.addEventListener('click', () => {
    state.currentIndex = Math.min(state.packet.questions.length - 1, state.currentIndex + 1);
    renderApp();
  });
  container.querySelector('#showHint')?.addEventListener('click', () => {
    container.querySelector('#hintBox')?.classList.toggle('hidden');
  });
  container.querySelector('#clearAnswer')?.addEventListener('click', () => {
    delete state.responses[question.id];
    delete state.results[question.id];
    renderApp();
  });
  container.querySelector('#checkAnswer')?.addEventListener('click', () => {
    const response = collectResponse(container, question);
    state.responses[question.id] = response;
    const result = gradeQuestion(question, response);
    state.results[question.id] = result;
    renderApp();
  });
}

function collectResponse(container, question) {
  if (question.type === 'multiple_choice') {
    return container.querySelector(`input[name="choice-${CSS.escape(question.id)}"]:checked`)?.value || '';
  }

  if (question.type === 'multi_part') {
    const response = {};
    container.querySelectorAll('[data-answer-input][data-part-id]').forEach(input => {
      response[input.dataset.partId] = input.value;
    });
    return response;
  }

  return container.querySelector('[data-answer-input]')?.value || '';
}

function feedbackHtml(question, result) {
  const status = result.status || (result.correct ? 'correct' : 'wrong');
  const showSolution = status !== 'correct' || state.packet.settings?.showSolutionOnCorrect !== false;
  return `
    <div class="feedback ${status}">
      <h3>${escapeHtml(result.message || (result.correct ? 'Correct.' : 'Not quite.'))}</h3>
      ${question.type === 'multi_part' && Array.isArray(result.partResults) ? partFeedbackHtml(question, result) : ''}
      ${showSolution ? solutionHtml(question) : ''}
    </div>
  `;
}

function partFeedbackHtml(question, result) {
  return `<ul class="solution-list">${(question.parts || []).map((part, index) => {
    const partResult = result.partResults[index];
    return `<li><strong>${escapeHtml(part.label || `Part ${index + 1}`)}:</strong> ${partResult.correct ? 'Correct' : 'Not quite'}.</li>`;
  }).join('')}</ul>`;
}

function solutionHtml(question) {
  if (Array.isArray(question.solution) && question.solution.length) {
    return `
      <h4>Solution</h4>
      <ol class="solution-list">
        ${question.solution.map(step => `<li>${richText(step)}</li>`).join('')}
      </ol>
    `;
  }

  if (question.answer?.value !== undefined) {
    return `<p><strong>Accepted answer:</strong> ${richText(readableAnswer(question.answer))}</p>`;
  }

  return '';
}

export function renderReviewAll() {
  const questionArea = els.questionArea();
  questionArea.innerHTML = `
    <div class="question-header">
      <div>
        <span class="type-pill">Review mode</span>
        <h2>All questions</h2>
        <p class="meta">Read the whole packet at once. Switch back to Practice to answer one-by-one.</p>
      </div>
    </div>
    ${state.packet.questions.map((question, index) => `
      <article class="review-card">
        <h3>${index + 1}. ${escapeHtml(question.title)}</h3>
        ${questionContentHtml(question)}
      </article>
    `).join('')}
  `;
  typeset(questionArea);
}

function typeLabel(type) {
  const labels = {
    multiple_choice: 'Multiple choice',
    short: 'Short answer',
    numeric: 'Numeric',
    expression: 'Expression',
    multi_part: 'Multi-part'
  };
  return labels[type] || type;
}

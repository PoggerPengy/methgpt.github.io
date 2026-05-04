function normalizeRaw(input = '') {
  return String(input)
    .trim()
    .replaceAll('−', '-')
    .replaceAll('–', '-')
    .replaceAll('—', '-')
    .replaceAll('\\left', '')
    .replaceAll('\\right', '')
    .replaceAll('\\,', '')
    .replaceAll('\\ ', '')
    .replaceAll('$', '')
    .replaceAll('\\(', '')
    .replaceAll('\\)', '')
    .replaceAll(' ', '')
    .toLowerCase();
}

function latexFracToSlash(value) {
  let output = normalizeRaw(value);
  let previous;
  const fracPattern = /\\frac\{([^{}]+)\}\{([^{}]+)\}/g;
  do {
    previous = output;
    output = output.replace(fracPattern, '($1)/($2)');
  } while (output !== previous);
  return output;
}

function stripEquationLeftSide(value) {
  const normalized = latexFracToSlash(value);
  if (normalized.includes('=')) {
    return normalized.split('=').at(-1);
  }
  return normalized;
}

function safeNumberExpression(value) {
  return stripEquationLeftSide(value)
    .replaceAll('\\pi', String(Math.PI))
    .replaceAll('π', String(Math.PI))
    .replaceAll('^', '**');
}

export function parseNumber(value) {
  const expr = safeNumberExpression(value);
  if (!/^[0-9+\-*/().eE\s]+$/.test(expr)) return Number.NaN;
  try {
    const result = Function(`"use strict"; return (${expr});`)();
    return Number.isFinite(result) ? result : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function expectedValues(answer = {}) {
  const values = [];
  if (answer.value !== undefined) values.push(answer.value);
  if (Array.isArray(answer.equivalents)) values.push(...answer.equivalents);
  if (Array.isArray(answer.accept)) values.push(...answer.accept);
  return values.map(String);
}

function compareExact(userValue, answer) {
  const user = latexFracToSlash(userValue);
  return expectedValues(answer).some(expected => latexFracToSlash(expected) === user);
}

function compareNumeric(userValue, answer) {
  const userNumber = parseNumber(userValue);
  const expectedNumber = parseNumber(answer.value);
  const tolerance = Number(answer.tolerance ?? 0.000001);
  return Number.isFinite(userNumber) && Number.isFinite(expectedNumber) && Math.abs(userNumber - expectedNumber) <= tolerance;
}

function compareExpression(userValue, answer) {
  // This is not a full CAS. It checks accepted forms after strong normalization.
  const user = latexFracToSlash(userValue)
    .replaceAll('*', '')
    .replaceAll('·', '')
    .replaceAll('\\cdot', '')
    .replaceAll('\\sqrt', 'sqrt');
  return expectedValues(answer).some(expected => {
    const expectedNorm = latexFracToSlash(expected)
      .replaceAll('*', '')
      .replaceAll('·', '')
      .replaceAll('\\cdot', '')
      .replaceAll('\\sqrt', 'sqrt');
    return expectedNorm === user;
  });
}

export function gradeSingle(response, answer = {}, fallbackMode = 'exact') {
  const mode = answer.mode || fallbackMode;
  if (response === undefined || String(response).trim() === '') {
    return { correct: false, status: 'blank', message: 'No answer entered yet.' };
  }

  let correct = false;
  if (mode === 'numeric') correct = compareNumeric(response, answer);
  else if (mode === 'expression') correct = compareExpression(response, answer);
  else correct = compareExact(response, answer);

  return {
    correct,
    status: correct ? 'correct' : 'wrong',
    message: correct ? 'Correct.' : 'Not quite.'
  };
}

export function gradeQuestion(question, response) {
  if (question.type === 'multi_part') {
    const parts = question.parts || [];
    const partResults = parts.map((part, index) => {
      const partResponse = response?.[part.id || `part${index + 1}`] ?? '';
      return gradeSingle(partResponse, part.answer || {}, part.type === 'numeric' ? 'numeric' : 'exact');
    });
    const correctCount = partResults.filter(item => item.correct).length;
    const allCorrect = correctCount === parts.length;
    return {
      correct: allCorrect,
      partial: correctCount > 0 && !allCorrect,
      status: allCorrect ? 'correct' : correctCount > 0 ? 'partial' : 'wrong',
      message: allCorrect ? 'Correct.' : `${correctCount} / ${parts.length} parts correct.`,
      partResults
    };
  }

  if (question.type === 'multiple_choice') {
    const result = gradeSingle(response, question.answer || {}, 'exact');
    return { ...result, status: result.correct ? 'correct' : 'wrong' };
  }

  const fallbackMode = question.type === 'numeric' ? 'numeric' : question.type === 'expression' ? 'expression' : 'exact';
  const result = gradeSingle(response, question.answer || {}, fallbackMode);
  return { ...result, status: result.correct ? 'correct' : 'wrong' };
}

export function readableAnswer(answer = {}) {
  if (answer.value !== undefined) return String(answer.value);
  if (Array.isArray(answer.accept) && answer.accept.length) return String(answer.accept[0]);
  return 'See solution.';
}

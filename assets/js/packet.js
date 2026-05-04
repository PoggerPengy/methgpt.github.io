const SUPPORTED_TYPES = new Set(['multiple_choice', 'short', 'numeric', 'expression', 'multi_part']);

export async function packetFromFile(file) {
  const text = await file.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error('That file is not valid JSON. Use a .json question packet.');
  }
  return normalizePacket(json);
}

export async function packetFromUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not load packet: ${response.status}`);
  }
  return normalizePacket(await response.json());
}

export function normalizePacket(packet) {
  validatePacket(packet);
  const questions = packet.questions.map((question, index) => ({
    ...question,
    id: question.id || `q${index + 1}`,
    title: question.title || `Question ${index + 1}`,
    type: question.type || inferType(question),
    points: Number.isFinite(Number(question.points)) ? Number(question.points) : 1
  }));

  return {
    version: packet.version || '1.0',
    title: packet.title || 'Untitled Math Packet',
    description: packet.description || '',
    level: packet.level || 'Mixed level',
    settings: {
      showHints: true,
      allowRetry: true,
      ...packet.settings
    },
    questions
  };
}

export function validatePacket(packet) {
  if (!packet || typeof packet !== 'object') {
    throw new Error('The packet must be a JSON object.');
  }
  if (!Array.isArray(packet.questions) || packet.questions.length === 0) {
    throw new Error('The packet must contain a non-empty questions array.');
  }
  packet.questions.forEach((question, index) => {
    const type = question.type || inferType(question);
    if (!SUPPORTED_TYPES.has(type)) {
      throw new Error(`Question ${index + 1} has unsupported type "${type}".`);
    }
    if (!question.prompt && !question.math && !question.parts) {
      throw new Error(`Question ${index + 1} needs a prompt, math field, or parts.`);
    }
    if (type === 'multiple_choice' && !Array.isArray(question.options)) {
      throw new Error(`Question ${index + 1} is multiple choice but has no options array.`);
    }
    if (type === 'multi_part' && !Array.isArray(question.parts)) {
      throw new Error(`Question ${index + 1} is multi_part but has no parts array.`);
    }
  });
}

function inferType(question) {
  if (Array.isArray(question.parts)) return 'multi_part';
  if (Array.isArray(question.options)) return 'multiple_choice';
  return 'short';
}

export const blankPacketTemplate = {
  version: '1.0',
  title: 'New Math Packet',
  description: 'Replace this with the packet description.',
  level: 'Grade 9-12',
  settings: {
    showHints: true,
    allowRetry: true
  },
  questions: [
    {
      id: 'q1',
      type: 'short',
      title: 'Sample short answer',
      prompt: 'Solve for x: \\(2x + 5 = 17\\)',
      answer: {
        mode: 'exact',
        value: '6',
        equivalents: ['x=6', 'x = 6']
      },
      hint: 'Subtract 5 from both sides first.',
      solution: [
        '\\ (2x + 5 = 17\\)',
        '\\ (2x = 12\\)',
        '\\ (x = 6\\)'
      ]
    }
  ]
};

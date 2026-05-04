export const state = {
  packet: null,
  currentIndex: 0,
  mode: 'practice',
  responses: {},
  results: {},
  activeInput: null
};

export function resetState(packet) {
  state.packet = packet;
  state.currentIndex = 0;
  state.mode = 'practice';
  state.responses = {};
  state.results = {};
  state.activeInput = null;
}

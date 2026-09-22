import { Engine } from './core/Engine.js';

function initGame() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;
  const engine = new Engine(canvas);
  engine.run();

  // Expose on window for debugging & testing
  window.DiliFighter = engine;
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

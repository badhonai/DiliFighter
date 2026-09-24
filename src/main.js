import { Engine } from './core/Engine.js';
import { OrientationGuard } from './ui/OrientationGuard.js';
import { HelpMenu } from './ui/HelpMenu.js';

function initGame() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  new OrientationGuard();

  const engine = new Engine(canvas);
  new HelpMenu(engine);
  engine.run();

  // Expose on window for debugging & testing
  window.DiliFighter = engine;
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

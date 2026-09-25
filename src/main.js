import { GAME_CONFIG } from './config.js';
import { Engine } from './core/Engine.js';
import { HomeScreen } from './ui/HomeScreen.js';
import { HelpMenu } from './ui/HelpMenu.js';
import { SettingsMenu } from './ui/SettingsMenu.js';
import { DifficultySelect } from './ui/DifficultySelect.js';

function initGame() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  // Engine idles in attract mode behind the title screen until the player
  // presses PLAY NOW and picks a difficulty.
  const engine = new Engine(canvas, { autoStart: false });
  const helpMenu = new HelpMenu(engine);
  new SettingsMenu(engine, helpMenu);

  const difficultySelect = new DifficultySelect((difficulty) => {
    engine.beginMatch(difficulty);
  });

  new HomeScreen({
    onPlay: () => difficultySelect.show(),
    onHelp: () => helpMenu.open(),
    version: GAME_CONFIG.VERSION,
  });

  engine.run();

  // Expose on window for debugging & testing
  window.DiliFighter = engine;
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

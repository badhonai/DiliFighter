import { Difficulty } from '../core/Difficulty.js';

export class PauseMenu {
  constructor(engine) {
    this.engine = engine;
    this.isPaused = false;
    this.overlayEl = null;

    this.createDOM();
  }

  static ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M8 5h3.2v14H8zM12.8 5H16v14h-3.2z" fill="currentColor"/></svg>';
  static ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';

  createDOM() {
    // Persistent pause/play icon button in the top-left icon column
    this.toggleBtn = document.createElement('button');
    this.toggleBtn.id = 'pause-toggle-btn';
    this.toggleBtn.type = 'button';
    this.toggleBtn.setAttribute('aria-label', 'Pause or resume the battle');
    this.toggleBtn.innerHTML = PauseMenu.ICON_PAUSE;
    document.body.appendChild(this.toggleBtn);
    this.toggleBtn.addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.togglePause();
    });

    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'modal-overlay';
    this.overlayEl.id = 'pause-modal';

    this.overlayEl.innerHTML = `
      <div class="modal-card">
        <h2 class="modal-title">⚔️ BATTLE PAUSED</h2>

        <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 10px;">
          <button id="btn-resume" class="btn-action">RESUME BATTLE</button>
          <button id="btn-restart" class="btn-action btn-secondary">RESTART MATCH</button>
        </div>

        <div style="margin-top: 22px;">
          <h4 style="color: #38bdf8; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Difficulty — pick any time</h4>
          <div style="display: flex; justify-content: center; gap: 10px;">
            <button id="diff-easy" class="btn-action btn-secondary">EASY</button>
            <button id="diff-medium" class="btn-action btn-secondary">MEDIUM</button>
            <button id="diff-hard" class="btn-action btn-secondary">HARD</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay').appendChild(this.overlayEl);

    // Event listeners
    document.getElementById('btn-resume').addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.togglePause(false);
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.togglePause(false);
      this.engine.restartMatch();
    });

    // Difficulty segmented control
    const refreshDiff = () => {
      for (const name of Difficulty.all()) {
        const el = document.getElementById('diff-' + name);
        const active = Difficulty.current === name;
        el.style.borderColor = active ? '#22d3ee' : '';
        el.style.color = active ? '#22d3ee' : '';
        el.style.boxShadow = active ? '0 0 14px rgba(34, 211, 238, 0.45)' : '';
      }
    };
    for (const name of Difficulty.all()) {
      document.getElementById('diff-' + name).addEventListener('click', () => {
        Difficulty.set(name);
        this.engine.soundEngine.playUIClick();
        refreshDiff();
      });
    }
    refreshDiff();
  }

  togglePause(forceState = null) {
    this.isPaused = forceState !== null ? forceState : !this.isPaused;
    if (this.isPaused) {
      this.overlayEl.classList.add('active');
    } else {
      this.overlayEl.classList.remove('active');
    }
    if (this.toggleBtn) {
      this.toggleBtn.innerHTML = this.isPaused ? PauseMenu.ICON_PLAY : PauseMenu.ICON_PAUSE;
    }
    this.engine.soundEngine.setPaused(this.isPaused);
    this.engine.soundEngine.playUIClick();
    return this.isPaused;
  }
}

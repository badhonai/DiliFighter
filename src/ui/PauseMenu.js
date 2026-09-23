export class PauseMenu {
  constructor(engine) {
    this.engine = engine;
    this.isPaused = false;
    this.overlayEl = null;

    this.createDOM();
  }

  createDOM() {
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'modal-overlay';
    this.overlayEl.id = 'pause-modal';

    this.overlayEl.innerHTML = `
      <div class="modal-card">
        <h2 class="modal-title">⚔️ BATTLE PAUSED</h2>
        
        <div style="margin-bottom: 24px; text-align: left; background: rgba(0,0,0,0.4); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
          <h4 style="color: #38bdf8; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Keyboard Controls:</h4>
          <ul style="list-style: none; font-size: 13px; color: #cbd5e1; line-height: 1.8;">
            <li><strong>A / D (or Arrows)</strong>: Move Left / Right</li>
            <li><strong>W (or Up)</strong>: Jump / High Attack Modifier</li>
            <li><strong>S (or Down)</strong>: Crouch / Low Guard</li>
            <li><strong>J (or Z)</strong>: Punch / Dao Slashes (Combo: J, J, J)</li>
            <li><strong>K (or X)</strong>: Kicks (S + K = Low Dragon Sweep!)</li>
            <li><strong>L (or C)</strong>: Throw Shadow Kunai</li>
            <li><strong>Space (or U)</strong>: Unleash Shadow Mode (at 100% meter)</li>
          </ul>
        </div>

        <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 10px;">
          <button id="btn-resume" class="btn-action">RESUME BATTLE</button>
          <button id="btn-sound" class="btn-action btn-secondary">AUDIO: ON</button>
          <button id="btn-restart" class="btn-action btn-secondary">RESTART MATCH</button>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay').appendChild(this.overlayEl);

    // Event listeners
    document.getElementById('btn-resume').addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.togglePause(false);
    });

    const soundBtn = document.getElementById('btn-sound');
    soundBtn.addEventListener('click', () => {
      const isMuted = this.engine.soundEngine.toggleMute();
      soundBtn.textContent = isMuted ? 'AUDIO: OFF' : 'AUDIO: ON';
    });

    document.getElementById('btn-restart').addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.togglePause(false);
      this.engine.restartMatch();
    });
  }

  togglePause(forceState = null) {
    this.isPaused = forceState !== null ? forceState : !this.isPaused;
    if (this.isPaused) {
      this.overlayEl.classList.add('active');
    } else {
      this.overlayEl.classList.remove('active');
    }
    this.engine.soundEngine.setPaused(this.isPaused);
    this.engine.soundEngine.playUIClick();
    return this.isPaused;
  }
}

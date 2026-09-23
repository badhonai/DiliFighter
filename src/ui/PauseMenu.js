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
        
        <div style="margin-bottom: 24px; text-align: left; background: rgba(0,0,0,0.4); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
          <h4 style="color: #38bdf8; margin-bottom: 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Keyboard Controls:</h4>
          <ul style="list-style: none; font-size: 13px; color: #cbd5e1; line-height: 1.8;">
            <li><strong>A / D (or Arrows)</strong>: Move Left / Right</li>
            <li><strong>Double-tap ← / →</strong>: Dash</li>
            <li><strong>W (or Up)</strong>: Jump / High Attack Modifier</li>
            <li><strong>S (or Down)</strong>: Crouch / Low Guard</li>
            <li><strong>V (or ;)</strong>: Hold to Block</li>
            <li><strong>J (or Z)</strong>: Punch / Dao Slashes (Combo: J, J, J)</li>
            <li><strong>K (or X)</strong>: Kicks (S + K = Low Dragon Sweep!)</li>
            <li><strong>I (or B)</strong>: Heavy Attack (Mountain Splitter)</li>
            <li><strong>L (or C)</strong>: Throw Shadow Kunai</li>
            <li><strong>Space (or U)</strong>: Unleash Shadow Mode (at 100% meter)</li>
            <li><strong>Esc (or P)</strong>: Pause / Resume</li>
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
    if (this.toggleBtn) {
      this.toggleBtn.innerHTML = this.isPaused ? PauseMenu.ICON_PLAY : PauseMenu.ICON_PAUSE;
    }
    this.engine.soundEngine.setPaused(this.isPaused);
    this.engine.soundEngine.playUIClick();
    return this.isPaused;
  }
}

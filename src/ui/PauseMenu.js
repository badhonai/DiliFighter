/**
 * PauseMenu — the ONLY in-fight UI icons:
 *   [←]  back to lobby
 *   [II] pause / resume
 * The pause overlay holds resume, restart and the utility settings
 * (controls guide, music, fullscreen). Difficulty is fixed per level —
 * there is no difficulty picker anywhere.
 */
export class PauseMenu {
  constructor(engine) {
    this.engine = engine;
    this.isPaused = false;
    this.overlayEl = null;
    this.helpMenu = null; // injected by main.js

    this.createDOM();
  }

  static ICON_PAUSE = '<svg viewBox="0 0 24 24"><path d="M8 5h3.2v14H8zM12.8 5H16v14h-3.2z" fill="currentColor"/></svg>';
  static ICON_PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
  static ICON_BACK = '<svg viewBox="0 0 24 24"><path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2z" fill="currentColor"/></svg>';

  createDOM() {
    // Back-to-lobby icon
    this.backBtn = document.createElement('button');
    this.backBtn.id = 'back-lobby-btn';
    this.backBtn.type = 'button';
    this.backBtn.setAttribute('aria-label', 'Back to lobby');
    this.backBtn.innerHTML = PauseMenu.ICON_BACK;
    document.body.appendChild(this.backBtn);
    this.backBtn.addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      if (this.isPaused) this.togglePause(false);
      if (this.engine.exitToLobby) this.engine.exitToLobby();
    });

    // Pause / resume icon
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
        <h2 class="modal-title">BATTLE PAUSED</h2>

        <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 10px;">
          <button id="btn-resume" class="btn-action">RESUME BATTLE</button>
          <button id="btn-restart" class="btn-action btn-secondary">RESTART MATCH</button>
        </div>

        <div class="pause-settings">
          <button class="settings-row" id="pm-guide" type="button">
            <span class="settings-label">CONTROLS GUIDE</span>
            <span class="settings-value settings-link">OPEN</span>
          </button>
          <button class="settings-row" id="pm-music" type="button">
            <span class="settings-label">MUSIC</span>
            <span class="settings-value" id="pm-music-state">ON</span>
          </button>
          <button class="settings-row" id="pm-fs" type="button">
            <span class="settings-label">FULLSCREEN</span>
            <span class="settings-value" id="pm-fs-state">ENTER</span>
          </button>
        </div>
      </div>
    `;

    document.getElementById('ui-overlay').appendChild(this.overlayEl);

    document.getElementById('btn-resume').addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.togglePause(false);
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.togglePause(false);
      this.engine.restartMatch();
    });

    document.getElementById('pm-guide').addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.togglePause(false);
      if (this.helpMenu) this.helpMenu.open();
    });
    document.getElementById('pm-music').addEventListener('click', () => {
      this.engine.soundEngine.toggleMusic();
      this.engine.soundEngine.playUIClick();
      this.syncMusic();
    });
    document.getElementById('pm-fs').addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.toggleFullscreen();
    });

    document.addEventListener('fullscreenchange', () => this.syncFullscreen());
    document.addEventListener('webkitfullscreenchange', () => this.syncFullscreen());
  }

  syncMusic() {
    const el = document.getElementById('pm-music-state');
    if (!el) return;
    const on = this.engine.soundEngine.musicEnabled;
    el.textContent = on ? 'ON' : 'OFF';
    el.classList.toggle('dim', !on);
  }

  isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  syncFullscreen() {
    const el = document.getElementById('pm-fs-state');
    if (el) el.textContent = this.isFullscreen() ? 'EXIT' : 'ENTER';
  }

  toggleFullscreen() {
    if (this.isFullscreen()) {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) exit.call(document).catch(() => {});
    } else {
      const el = document.documentElement;
      const request = el.requestFullscreen || el.webkitRequestFullscreen;
      if (request) request.call(el).catch(() => {});
    }
    this.syncFullscreen();
  }

  togglePause(forceState = null) {
    this.isPaused = forceState !== null ? forceState : !this.isPaused;
    if (this.isPaused) {
      this.syncMusic();
      this.syncFullscreen();
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

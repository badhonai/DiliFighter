import { GAME_CONFIG } from '../config.js';

/**
 * SettingsMenu — a single gear button (top-left) that gathers every utility
 * that used to clutter the left icon column: controls guide, music toggle
 * and fullscreen. Clean HUD, everything one tap away.
 */
export class SettingsMenu {
  /**
   * @param {Engine} engine
   * @param {HelpMenu} helpMenu
   */
  constructor(engine, helpMenu) {
    this.engine = engine;
    this.helpMenu = helpMenu;

    this.createDOM();
    this.bindEvents();
  }

  static ICON_GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.6 5.2.1-1.7-.1-1.7 2-1.5-1.9-3.3-2.4.9a8 8 0 0 0-2.9-1.7L15 2h-3.8l-.4 2.7a8 8 0 0 0-2.9 1.7l-2.4-.9L3.6 8.8l2 1.5-.2 1.7.2 1.7-2 1.5 1.9 3.3 2.4-.9a8 8 0 0 0 2.9 1.7L11.2 22h3.8l.4-2.7a8 8 0 0 0 2.9-1.7l2.4.9 1.9-3.3-2-1.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

  createDOM() {
    // Single persistent gear button
    this.btn = document.createElement('button');
    this.btn.id = 'settings-btn';
    this.btn.type = 'button';
    this.btn.setAttribute('aria-label', 'Settings');
    this.btn.innerHTML = SettingsMenu.ICON_GEAR;
    document.body.appendChild(this.btn);

    // Settings panel
    this.overlay = document.createElement('div');
    this.overlay.id = 'settings-modal';
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = `
      <div class="modal-card settings-card">
        <button id="settings-close-btn" type="button" aria-label="Close Settings">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
        <h2 class="modal-title">SETTINGS</h2>

        <button class="settings-row" id="settings-guide-row" type="button">
          <span class="settings-label">CONTROLS GUIDE</span>
          <span class="settings-value settings-link">OPEN</span>
        </button>

        <button class="settings-row" id="settings-music-row" type="button">
          <span class="settings-label">MUSIC</span>
          <span class="settings-value" id="settings-music-state">ON</span>
        </button>

        <button class="settings-row" id="settings-fs-row" type="button">
          <span class="settings-label">FULLSCREEN</span>
          <span class="settings-value" id="settings-fs-state">ENTER</span>
        </button>

        <div class="settings-footer">DILIFIGHTER v${GAME_CONFIG.VERSION}</div>
      </div>
    `;
    document.body.appendChild(this.overlay);

    this.musicState = this.overlay.querySelector('#settings-music-state');
    this.fsState = this.overlay.querySelector('#settings-fs-state');
  }

  bindEvents() {
    this.btn.addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.toggle();
    });
    this.overlay.querySelector('#settings-close-btn').addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.close();
    });
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    this.overlay.querySelector('#settings-guide-row').addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.close();
      this.helpMenu.open();
    });

    this.overlay.querySelector('#settings-music-row').addEventListener('click', () => {
      this.engine.soundEngine.toggleMusic();
      this.engine.soundEngine.playUIClick();
      this.syncMusic();
    });

    this.overlay.querySelector('#settings-fs-row').addEventListener('click', () => {
      this.engine.soundEngine.playUIClick();
      this.toggleFullscreen();
    });

    document.addEventListener('fullscreenchange', () => this.syncFullscreen());
    document.addEventListener('webkitfullscreenchange', () => this.syncFullscreen());
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });
  }

  isOpen() {
    return this.overlay.classList.contains('active');
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  open() {
    this.syncMusic();
    this.syncFullscreen();
    this.overlay.classList.add('active');
    // Reading settings is not fighting: hold the match (mirrors help modal).
    // Never pause from the title screen — there is nothing to pause yet.
    const e = this.engine;
    if (e.matchState !== 'HOME' && e.pauseMenu && !e.pauseMenu.isPaused) {
      e.pauseMenu.togglePause(true);
    }
  }

  close() {
    this.overlay.classList.remove('active');
  }

  syncMusic() {
    const on = this.engine.soundEngine.musicEnabled;
    this.musicState.textContent = on ? 'ON' : 'OFF';
    this.musicState.classList.toggle('dim', !on);
  }

  isFullscreen() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  syncFullscreen() {
    this.fsState.textContent = this.isFullscreen() ? 'EXIT' : 'ENTER';
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
}

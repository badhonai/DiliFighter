/**
 * HelpMenu
 * A small persistent "?" button (top-right, next to the fullscreen toggle) that
 * opens the full controls guide as a modal. Keeps the in-game HUD clean.
 */
export class HelpMenu {
  constructor() {
    this.createDOM();
    this.bindEvents();
  }

  createDOM() {
    // Persistent "?" help button
    this.helpBtn = document.createElement('button');
    this.helpBtn.id = 'help-toggle-btn';
    this.helpBtn.type = 'button';
    this.helpBtn.setAttribute('aria-label', 'Open Controls Guide');
    this.helpBtn.textContent = '?';
    document.body.appendChild(this.helpBtn);

    const base = import.meta.env.BASE_URL;
    const icon = (name) => `<img class="help-icon" src="${base}icons/${name}.svg" alt="" draggable="false" />`;

    // Guide modal
    this.overlay = document.createElement('div');
    this.overlay.id = 'help-modal';
    this.overlay.innerHTML = `
      <div class="help-card">
        <button id="help-close-btn" type="button" aria-label="Close Guide">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
        <h2 class="help-title">CONTROLS</h2>

        <div class="help-section">
          <h3>MOBILE</h3>
          <div class="help-row">${icon('joystick')}<p>Left bottom joystick — move, jump (up), crouch (down)</p></div>
          <div class="help-row">${icon('punch')}<p>Punch — quick strike</p></div>
          <div class="help-row">${icon('kick')}<p>Kick — heavy strike</p></div>
          <div class="help-row">${icon('ranged')}<p>Kunai — ranged projectile</p></div>
          <div class="help-row">${icon('shadow')}<p>Shadow Mode — unleash when the cyan bar is full</p></div>
        </div>

        <div class="help-section">
          <h3>KEYBOARD</h3>
          <div class="help-grid">
            <span class="help-key">A / D</span><p>Move</p>
            <span class="help-key">W</span><p>Jump</p>
            <span class="help-key">S</span><p>Crouch</p>
            <span class="help-key">J</span><p>Punch</p>
            <span class="help-key">K</span><p>Kick</p>
            <span class="help-key">L</span><p>Kunai</p>
            <span class="help-key">SPACE</span><p>Shadow Mode</p>
            <span class="help-key">ESC</span><p>Pause</p>
          </div>
        </div>

        <p class="help-credit">Icons by game-icons.net (CC BY 3.0) — Lorc &amp; Delapouite</p>
      </div>
    `;
    document.body.appendChild(this.overlay);
  }

  bindEvents() {
    this.helpBtn.addEventListener('click', () => this.open());
    this.overlay.querySelector('#help-close-btn').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });
  }

  isOpen() {
    return this.overlay.classList.contains('active');
  }

  open() {
    this.overlay.classList.add('active');
  }

  close() {
    this.overlay.classList.remove('active');
  }
}

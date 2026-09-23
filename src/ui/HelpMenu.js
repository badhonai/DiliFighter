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
        <h2 class="help-title">HOW TO PLAY</h2>

        <div class="help-section">
          <h3>THE GOAL</h3>
          <p class="help-text">Defeat your opponent in a <strong>best-of-3</strong> duel.
          Win a round by dropping their gold <strong>health bar</strong> to zero (K.O.),
          or by having more health when the timer runs out. First to 2 round wins takes the match.</p>
        </div>

        <div class="help-section">
          <h3>MOBILE</h3>
          <div class="help-row">${icon('joystick')}<p><strong>Left joystick</strong> — walk left/right, push <strong>up to jump</strong>, hold <strong>down to crouch</strong> (blocks low hits)</p></div>
          <div class="help-row">${icon('punch')}<p><strong>Punch</strong> — fast strike, good for starting combos</p></div>
          <div class="help-row">${icon('kick')}<p><strong>Kick</strong> — slower, heavy damage</p></div>
          <div class="help-row">${icon('ranged')}<p><strong>Kunai</strong> — throw a blade from a distance</p></div>
          <div class="help-row">${icon('shadow')}<p><strong>Shadow Mode</strong> — tap when the cyan bar is full to transform</p></div>
        </div>

        <div class="help-section">
          <h3>KEYBOARD</h3>
          <div class="help-grid">
            <span class="help-key">A / D</span><p>Walk left / right</p>
            <span class="help-key">W</span><p>Jump</p>
            <span class="help-key">S</span><p>Crouch (blocks low hits)</p>
            <span class="help-key">J</span><p>Punch</p>
            <span class="help-key">K</span><p>Kick</p>
            <span class="help-key">L</span><p>Throw kunai</p>
            <span class="help-key">SPACE</span><p>Shadow Mode</p>
            <span class="help-key">ESC</span><p>Pause</p>
          </div>
        </div>

        <div class="help-section">
          <h3>TIPS</h3>
          <p class="help-text">Hold <strong>away from your opponent</strong> to block high attacks,
          and crouch to block low ones. Blocking and landing hits fill your <strong>cyan Shadow
          bar</strong> — when it's full and glowing, unleash Shadow Mode for
          <strong>boosted speed and damage</strong> for a limited time.</p>
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

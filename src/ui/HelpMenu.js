/**
 * HelpMenu — the controls guide as a TABBED modal (Goal / Mobile / Keyboard /
 * Tips). Nothing scrolls: every section fits behind one of four tabs, so
 * players never miss content hidden below a fold.
 */
export class HelpMenu {
  constructor(engine = null) {
    this.engine = engine;
    this.tab = 'goal';
    this.createDOM();
    this.bindEvents();
  }

  createDOM() {
    const base = import.meta.env.BASE_URL;
    const icon = (name) => `<img class="help-icon" src="${base}icons/${name}.svg" alt="" draggable="false" />`;

    this.overlay = document.createElement('div');
    this.overlay.id = 'help-modal';
    this.overlay.innerHTML = `
      <div class="help-card">
        <button id="help-close-btn" type="button" aria-label="Close Guide">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
        </button>
        <h2 class="help-title">HOW TO PLAY</h2>

        <div class="help-tabs">
          <button class="help-tab active" data-tab="goal" type="button">GOAL</button>
          <button class="help-tab" data-tab="mobile" type="button">MOBILE</button>
          <button class="help-tab" data-tab="keys" type="button">KEYBOARD</button>
          <button class="help-tab" data-tab="tips" type="button">TIPS</button>
        </div>

        <div class="help-body">
          <div class="help-page" data-page="goal">
            <p class="help-text">Defeat your opponent in a <strong>best-of-3</strong> duel.
            Win a round by dropping their gold <strong>health bar</strong> to zero (K.O.),
            or by having more health when the timer runs out. First to 2 round wins takes the match.</p>
            <img class="help-hero" src="${base}characters/dili_portrait.jpg" alt="Dili — the bubble-helmet hero" draggable="false" />
          </div>

          <div class="help-page" data-page="mobile" hidden>
            <div class="help-row">${icon('joystick')}<p><strong>Left stick</strong> — walk · <strong>up</strong> jump · <strong>down</strong> crouch · <strong>2× tap</strong> dash</p></div>
            <div class="help-row">${icon('punch')}<p><strong>Punch</strong> — fast strike, starts combos</p></div>
            <div class="help-row">${icon('kick')}<p><strong>Kick</strong> — slower, heavier damage</p></div>
            <div class="help-row">${icon('block')}<p><strong>Shield (hold)</strong> — block high &amp; mid attacks</p></div>
            <div class="help-row">${icon('heavy')}<p><strong>Heavy</strong> — slow smash, huge knockback</p></div>
            <div class="help-row">${icon('ranged')}<p><strong>Kunai</strong> — throw a blade from range</p></div>
            <div class="help-row">${icon('shadow')}<p><strong>Shadow Mode</strong> — tap when the cyan bar is full</p></div>
          </div>

          <div class="help-page" data-page="keys" hidden>
            <div class="help-grid">
              <span class="help-key">A / D</span><p>Walk (←→ work too)</p>
              <span class="help-key">W</span><p>Jump</p>
              <span class="help-key">S</span><p>Crouch (guards low)</p>
              <span class="help-key">A+A / D+D</span><p>Dash</p>
              <span class="help-key">V or ;</span><p>Block (hold)</p>
              <span class="help-key">J or Z</span><p>Punch</p>
              <span class="help-key">K or X</span><p>Kick</p>
              <span class="help-key">I or B</span><p>Heavy smash</p>
              <span class="help-key">L or C</span><p>Throw kunai</p>
              <span class="help-key">SPACE</span><p>Shadow Mode</p>
              <span class="help-key">ESC</span><p>Pause</p>
            </div>
          </div>

          <div class="help-page" data-page="tips" hidden>
            <p class="help-text"><strong>Hold the shield</strong> to block high &amp; mid attacks and
            <strong>crouch</strong> to guard low ones. Blocking and landing hits fill your
            <strong>cyan Shadow bar</strong> — when it glows, unleash Shadow Mode for
            <strong>boosted speed and damage</strong>. Dash in to close gaps, then open with a Heavy smash.</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);
  }

  bindEvents() {
    this.overlay.querySelector('#help-close-btn').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    this.overlay.querySelectorAll('.help-tab').forEach((tab) => {
      tab.addEventListener('click', () => this.showTab(tab.dataset.tab));
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });
  }

  showTab(id) {
    this.tab = id;
    this.overlay.querySelectorAll('.help-tab').forEach((t) =>
      t.classList.toggle('active', t.dataset.tab === id));
    this.overlay.querySelectorAll('.help-page').forEach((p) => {
      p.hidden = p.dataset.page !== id;
    });
  }

  isOpen() {
    return this.overlay.classList.contains('active');
  }

  open() {
    this.showTab('goal');
    this.overlay.classList.add('active');
    // Reading the manual is not fighting: pause the match behind it.
    // Never pause from the title screen — there is nothing to pause yet.
    if (
      this.engine &&
      this.engine.matchState !== 'HOME' &&
      this.engine.pauseMenu &&
      !this.engine.pauseMenu.isPaused
    ) {
      this.engine.pauseMenu.togglePause(true);
    }
  }

  close() {
    this.overlay.classList.remove('active');
  }
}

/**
 * HomeScreen — the title screen and entry gate.
 *
 * One big "PLAY NOW" button instead of a "please rotate" instruction:
 * tapping it requests fullscreen AND locks the device to landscape (Screen
 * Orientation API), so players never touch their phone's control panel.
 * Where orientation locking is impossible (e.g. iOS Safari), a minimal
 * rotate hint appears only as a fallback — and only AFTER the tap.
 *
 * Flow: PLAY NOW -> fullscreen + landscape lock -> DifficultySelect.
 */
export class HomeScreen {
  /**
   * @param {{onPlay: () => void, onHelp: () => void, version?: string}} opts
   */
  constructor({ onPlay, onHelp, version = '' }) {
    this.onPlay = onPlay;
    this.onHelp = onHelp;
    this.started = false;

    this.isMobile = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

    this.createDOM(version);
    this.bindEvents();
  }

  isPortrait() {
    return window.innerHeight > window.innerWidth;
  }

  createDOM(version) {
    this.el = document.createElement('div');
    this.el.id = 'home-screen';
    this.el.innerHTML = `
      <div class="home-card">
        <div class="home-kicker">SHADOW REALM ARENA</div>
        <h1 class="home-logo">DILI<span>FIGHTER</span></h1>
        <p class="home-tagline">Fast-paced martial arts combat</p>

        <button id="play-now-btn" class="btn-action btn-hero" type="button">
          <svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
          PLAY NOW
        </button>

        <button id="home-help-btn" class="home-link" type="button">HOW TO PLAY</button>

        ${version ? `<div class="home-version">v${version}</div>` : ''}
      </div>

      <div class="home-rotate-hint" id="home-rotate-hint">
        <div class="rotate-card">
          <div class="rotate-icon"><img src="${import.meta.env.BASE_URL}icons/phone.svg" alt="" draggable="false" /></div>
          <h2>Rotate to Continue</h2>
          <p>Your device locks orientation here — just turn it sideways.</p>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);

    this.rotateHint = this.el.querySelector('#home-rotate-hint');
  }

  bindEvents() {
    this.el.querySelector('#play-now-btn').addEventListener('click', () => this.play());
    this.el.querySelector('#home-help-btn').addEventListener('click', () => this.onHelp());

    // Fallback path: once the player physically rotates into landscape we
    // continue automatically — no second tap needed.
    const recheck = () => {
      if (this.pendingRotate && !this.isPortrait()) {
        this.pendingRotate = false;
        this.rotateHint.classList.remove('active');
        this.finish();
      }
    };
    window.addEventListener('resize', recheck);
    window.addEventListener('orientationchange', recheck);
  }

  /** User gesture handler: go immersive, then hand off to difficulty select. */
  async play() {
    if (this.started) return;

    await this.enterImmersive();

    if (this.isMobile && this.isPortrait()) {
      // Orientation lock unavailable (iOS) — ask once, proceed on rotation.
      this.pendingRotate = true;
      this.rotateHint.classList.add('active');
      return;
    }
    this.finish();
  }

  finish() {
    if (this.started) return;
    this.started = true;
    this.el.classList.add('leaving');
    setTimeout(() => this.el.remove(), 420);
    this.onPlay();
  }

  /** Fullscreen + landscape lock. Every step is best-effort — the game must
   *  remain playable wherever the browser refuses (iOS, iframes, …). */
  async enterImmersive() {
    const el = document.documentElement || document.body;
    const request = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (request) {
      try { await request.call(el); } catch { /* denied — keep going */ }
    }
    try {
      if (typeof screen !== 'undefined' && screen.orientation && screen.orientation.lock) {
        await screen.orientation.lock('landscape');
      }
    } catch { /* unsupported (iOS) or denied — fallback handles it */ }
  }

  hide() {
    this.el.remove();
  }
}

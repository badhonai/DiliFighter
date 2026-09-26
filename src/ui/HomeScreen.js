/**
 * HomeScreen — the title screen and entry gate.
 *
 * One big "PLAY NOW" button instead of a "please rotate" instruction:
 * tapping it requests fullscreen AND locks the device to landscape (Screen
 * Orientation API), so players never touch their phone's control panel.
 * Where orientation locking is impossible (e.g. iOS Safari), a minimal
 * rotate hint appears only as a fallback — and only AFTER the tap.
 *
 * Flow: PLAY -> fullscreen + landscape lock -> the lobby hub.
 */
export class HomeScreen {
  /**
   * @param {{onPlay: () => void, onHelp: () => void, onLobby?: () => void,
   *          version?: string}} opts
   */
  constructor({ onPlay, onHelp, onLobby = null, version = '' }) {
    this.onPlay = onPlay;
    this.onHelp = onHelp;
    this.onLobby = onLobby;
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
        <img class="home-mascot" src="${import.meta.env.BASE_URL}brand/dili_happy.gif" alt="" draggable="false" />
        <div class="home-kicker">SHADOW REALM ARENA</div>
        <h1 class="home-logo">DILI<span>FIGHTER</span></h1>
        <p class="home-tagline">Fast-paced martial arts combat</p>

        <div class="home-actions">
          <button id="play-now-btn" class="btn-action btn-hero" type="button">
            <svg class="play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>
            PLAY
          </button>
        </div>

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
    this.el.querySelector('#play-now-btn').addEventListener('click', () => this.leave('play'));
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

  /** User gesture handler: go immersive, then hand off to the destination. */
  async leave(dest) {
    if (this.started) return;
    this.dest = dest;

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
    setTimeout(() => this.el.classList.add('hidden'), 420);
    if (this.dest === 'lobby' && this.onLobby) this.onLobby();
    else this.onPlay();
  }

  /** Re-show the title screen (e.g. after signing out). */
  show() {
    this.started = false;
    this.pendingRotate = false;
    this.dest = null;
    this.rotateHint.classList.remove('active');
    this.el.classList.remove('leaving', 'hidden');
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

/**
 * OrientationGuard
 * - Blocks play on mobile with a "rotate device" prompt while in portrait mode.
 * - Shows a "Tap to Play" button once in landscape (satisfies browser rules that
 *   fullscreen can only be requested from a direct user gesture).
 * - Provides a persistent manual fullscreen toggle button (mobile + desktop).
 */
export class OrientationGuard {
  constructor() {
    this.isMobile = this.detectMobile();
    this.hasStarted = false;

    this.createDOM();
    this.bindEvents();
    this.update();
  }

  detectMobile() {
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  }

  isPortrait() {
    return window.innerHeight > window.innerWidth;
  }

  createDOM() {
    // "Please rotate your device" overlay
    this.rotateOverlay = document.createElement('div');
    this.rotateOverlay.id = 'rotate-overlay';
    this.rotateOverlay.innerHTML = `
      <div class="rotate-card">
        <div class="rotate-icon">📱</div>
        <h2>Rotate Your Device</h2>
        <p>DiliFighter plays best in landscape mode.</p>
      </div>
    `;
    document.body.appendChild(this.rotateOverlay);

    // "Tap to Play" overlay (landscape, not yet started)
    this.tapOverlay = document.createElement('div');
    this.tapOverlay.id = 'tap-to-play-overlay';
    this.tapOverlay.innerHTML = `
      <button id="tap-to-play-btn" class="btn-action">▶ TAP TO PLAY</button>
    `;
    document.body.appendChild(this.tapOverlay);

    // Persistent manual fullscreen toggle
    this.fsBtn = document.createElement('button');
    this.fsBtn.id = 'fullscreen-toggle-btn';
    this.fsBtn.type = 'button';
    this.fsBtn.setAttribute('aria-label', 'Toggle Fullscreen');
    this.fsBtn.innerHTML = '⛶';
    document.body.appendChild(this.fsBtn);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.update());
    window.addEventListener('orientationchange', () => this.update());
    document.addEventListener('fullscreenchange', () => this.updateFullscreenIcon());
    document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenIcon());

    document.getElementById('tap-to-play-btn').addEventListener('click', () => {
      this.hasStarted = true;
      this.requestFullscreen();
      this.update();
    });

    this.fsBtn.addEventListener('click', () => {
      this.toggleFullscreen();
    });
  }

  requestFullscreen() {
    const el = document.documentElement;
    const request = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (request) {
      request.call(el).catch(() => {
        // Fullscreen can be denied/unsupported (e.g. iOS Safari) — game remains playable regardless.
      });
    }
  }

  exitFullscreen() {
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
    if (exit) {
      exit.call(document).catch(() => {});
    }
  }

  toggleFullscreen() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (isFullscreen) {
      this.exitFullscreen();
    } else {
      this.requestFullscreen();
    }
  }

  updateFullscreenIcon() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    this.fsBtn.innerHTML = isFullscreen ? '⛝' : '⛶';
  }

  update() {
    const portrait = this.isPortrait();

    if (this.isMobile && portrait) {
      this.rotateOverlay.classList.add('active');
      this.tapOverlay.classList.remove('active');
      this.hasStarted = false;
    } else if (this.isMobile && !this.hasStarted) {
      this.rotateOverlay.classList.remove('active');
      this.tapOverlay.classList.add('active');
    } else {
      this.rotateOverlay.classList.remove('active');
      this.tapOverlay.classList.remove('active');
    }
  }
}

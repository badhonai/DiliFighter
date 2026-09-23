/**
 * MusicToggle — the small music on/off button stacked under the "?" manual
 * button (third icon in the top-left column). Toggles ONLY the music bus;
 * combat SFX stay live. State is persisted by SoundEngine and reflected here.
 */
export class MusicToggle {
  constructor(soundEngine) {
    this.soundEngine = soundEngine;

    this.btn = document.createElement('button');
    this.btn.id = 'music-toggle-btn';
    this.btn.type = 'button';
    this.btn.setAttribute('aria-label', 'Toggle Music');
    document.body.appendChild(this.btn);

    this.sync();
    this.btn.addEventListener('click', () => {
      this.soundEngine.toggleMusic();
      this.soundEngine.playUIClick();
      this.sync();
    });
  }

  sync() {
    const on = this.soundEngine.musicEnabled;
    this.btn.classList.toggle('off', !on);
    this.btn.title = on ? 'Music: ON' : 'Music: OFF';
    this.btn.innerHTML = MusicToggle.icon(on);
  }

  static icon(on) {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 18V5l11-2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="6.5" cy="18" r="2.6" fill="currentColor"/>
      <circle cx="17.5" cy="16" r="2.6" fill="currentColor"/>
      <line x1="3" y1="21.5" x2="21.5" y2="3" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" style="display:${on ? 'none' : 'block'}"/>
    </svg>`;
  }
}

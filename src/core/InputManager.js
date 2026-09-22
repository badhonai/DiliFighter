import { GAME_CONFIG } from '../config.js';

export class InputManager {
  constructor() {
    this.keysDown = new Set();
    this.justPressed = new Set();
    this.virtualAxes = { x: 0, y: 0 };
    this.virtualButtons = {
      punch: false,
      kick: false,
      ranged: false,
      shadow: false,
    };
    this.virtualJustPressed = new Set();
    this.touchActive = false;

    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('keydown', (e) => {
      // Don't capture standard browser reload / dev tools
      if (e.key === 'F5' || e.key === 'F12' || (e.ctrlKey && e.key === 'r')) return;
      
      const code = e.code;
      if (!this.keysDown.has(code)) {
        this.justPressed.add(code);
      }
      this.keysDown.add(code);

      // Prevent scrolling on space / arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown.delete(e.code);
    });

    // Touch detection
    window.addEventListener('touchstart', () => {
      this.touchActive = true;
    }, { passive: true });
  }

  // Update called at the end of every frame to reset justPressed
  update() {
    this.justPressed.clear();
    this.virtualJustPressed.clear();
  }

  isActionDown(actionName) {
    const keyList = GAME_CONFIG.KEYS[actionName.toUpperCase()];
    if (keyList && keyList.some(k => this.keysDown.has(k))) return true;

    // Check virtual inputs
    if (actionName === 'move_left') return this.virtualAxes.x < -0.3;
    if (actionName === 'move_right') return this.virtualAxes.x > 0.3;
    if (actionName === 'jump') return this.virtualAxes.y < -0.4;
    if (actionName === 'crouch') return this.virtualAxes.y > 0.4;
    if (actionName === 'punch') return this.virtualButtons.punch;
    if (actionName === 'kick') return this.virtualButtons.kick;
    if (actionName === 'ranged') return this.virtualButtons.ranged;
    if (actionName === 'shadow') return this.virtualButtons.shadow;

    return false;
  }

  isActionJustPressed(actionName) {
    const keyList = GAME_CONFIG.KEYS[actionName.toUpperCase()];
    if (keyList && keyList.some(k => this.justPressed.has(k))) return true;

    return this.virtualJustPressed.has(actionName.toLowerCase());
  }

  setVirtualAxis(x, y) {
    this.virtualAxes.x = x;
    this.virtualAxes.y = y;
  }

  setVirtualButton(buttonName, pressed) {
    const btn = buttonName.toLowerCase();
    if (pressed && !this.virtualButtons[btn]) {
      this.virtualJustPressed.add(btn);
    }
    this.virtualButtons[btn] = pressed;
  }
}

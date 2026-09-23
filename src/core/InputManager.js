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
    // Digital state derived from the analog stick, with hysteresis so the
    // fighter doesn't flicker between states near the dead zone edge.
    // Rising edges (e.g. pushing up to jump) fire justPressed events,
    // which the raw axis alone could never produce.
    this.axisState = { left: false, right: false, up: false, down: false };
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

    // Check virtual inputs (digital axis state with hysteresis)
    if (actionName === 'move_left') return this.axisState.left;
    if (actionName === 'move_right') return this.axisState.right;
    if (actionName === 'jump') return this.axisState.up;
    if (actionName === 'crouch') return this.axisState.down;
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
    const ENTER = 0.35, EXIT = 0.2;
    const ENTER_Y = 0.45, EXIT_Y = 0.28;
    const s = this.axisState;

    // Hysteresis: state flips ON at ENTER, OFF at EXIT (prevents dead-zone flicker)
    s.left = x < -ENTER ? true : x > -EXIT ? false : s.left;
    s.right = x > ENTER ? true : x < EXIT ? false : s.right;
    const wasUp = s.up;
    s.up = y < -ENTER_Y ? true : y > -EXIT_Y ? false : s.up;
    s.down = y > ENTER_Y ? true : y < EXIT_Y ? false : s.down;

    // Rising edge of "up" = a jump press the stick alone could never express
    if (s.up && !wasUp) {
      this.virtualJustPressed.add('jump');
    }

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

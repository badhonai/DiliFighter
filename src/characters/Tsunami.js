import { Fighter } from '../entities/Fighter.js';
import { handlePlayerInput } from './PlayerControls.js';
import { runAI } from './AiBrain.js';

/**
 * TSUNAMI — the crimson storm samurai. Heavyweight: hits harder than Dili
 * but walks a touch slower. The campaign boss; also playable once unlocked.
 */
export class Tsunami extends Fighter {
  constructor(x = 930, y = 580, opts = {}) {
    super({
      name: 'TSUNAMI',
      isPlayer: opts.isPlayer !== undefined ? opts.isPlayer : false,
      x,
      y,
      direction: opts.direction !== undefined ? opts.direction : -1,
    });

    // Character stats — the powerhouse
    this.walkSpeed = 250;
    this.shadowWalkSpeed = 315;
    this.jumpPower = 600;
    this.damageMult = 1.12;

    this.aiTimer = 0;
    this.decisionInterval = 0.25; // Evaluates tactical choices 4x per second
    // Defense may only trigger once per window — frame-perfect reaction
    // guards every frame made the player's attacks feel hopeless.
    this.defendCooldown = 0;
  }

  handleInput(input, soundEngine) {
    handlePlayerInput(this, input, soundEngine);
  }

  updateAI(dt, player, soundEngine) {
    runAI(this, dt, player, soundEngine);
  }
}

import { Fighter } from '../entities/Fighter.js';
import { handlePlayerInput } from './PlayerControls.js';
import { runAI } from './AiBrain.js';

/**
 * DILI — the bubble-helmet hero. Balanced all-rounder: full speed,
 * standard damage. Playable by default; also serves as an AI opponent
 * when the player picks Tsunami.
 */
export class Dili extends Fighter {
  constructor(x = 350, y = 580, opts = {}) {
    super({
      name: 'DILI',
      isPlayer: opts.isPlayer !== undefined ? opts.isPlayer : true,
      x,
      y,
      direction: opts.direction !== undefined ? opts.direction : 1,
    });

    // Character stats
    this.walkSpeed = 265;
    this.shadowWalkSpeed = 330;
    this.jumpPower = 600;
    this.damageMult = 1.0;

    this.chainTimeout = 0;
    // Buffered attack press ({action, time}) — see PlayerControls
    this.inputBuffer = null;
  }

  handleInput(input, soundEngine) {
    handlePlayerInput(this, input, soundEngine);
  }

  updateAI(dt, player, soundEngine) {
    runAI(this, dt, player, soundEngine);
  }
}

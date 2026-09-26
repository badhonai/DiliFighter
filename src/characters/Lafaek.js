import { Fighter } from '../entities/Fighter.js';
import { handlePlayerInput } from './PlayerControls.js';
import { runAI } from './AiBrain.js';

/**
 * LAFAEK — the Crocodile Guardian (Timorese crocodile legend).
 * Slow titan: heaviest hits, thickest hide. Unlocks at campaign level 5.
 */
export class Lafaek extends Fighter {
  constructor(x = 350, y = 580, opts = {}) {
    super({
      name: 'LAFAEK',
      isPlayer: opts.isPlayer !== undefined ? opts.isPlayer : true,
      x,
      y,
      direction: opts.direction !== undefined ? opts.direction : 1,
    });
    this.charId = 'lafaek';

    // Character stats — the tank
    this.walkSpeed = 225;
    this.shadowWalkSpeed = 285;
    this.jumpPower = 560;
    this.damageMult = 1.22;

    this.chainTimeout = 0;
    this.inputBuffer = null;
  }

  handleInput(input, soundEngine) {
    handlePlayerInput(this, input, soundEngine);
  }

  updateAI(dt, player, soundEngine) {
    runAI(this, dt, player, soundEngine);
  }
}

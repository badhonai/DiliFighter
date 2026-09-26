import { Fighter } from '../entities/Fighter.js';
import { handlePlayerInput } from './PlayerControls.js';
import { runAI } from './AiBrain.js';

/**
 * MANU — the Dawn Runner. Fastest feet in the realm: quick slashes,
 * light damage. Unlocks at campaign level 7.
 */
export class Manu extends Fighter {
  constructor(x = 350, y = 580, opts = {}) {
    super({
      name: 'MANU',
      isPlayer: opts.isPlayer !== undefined ? opts.isPlayer : true,
      x,
      y,
      direction: opts.direction !== undefined ? opts.direction : 1,
    });
    this.charId = 'manu';

    // Character stats — the speedster
    this.walkSpeed = 300;
    this.shadowWalkSpeed = 370;
    this.jumpPower = 640;
    this.damageMult = 0.88;

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

import { Fighter } from '../entities/Fighter.js';
import { MOVES } from '../combat/FrameData.js';

export class Tsunami extends Fighter {
  constructor(x = 930, y = 580) {
    super({
      name: 'TSUNAMI',
      isPlayer: false,
      x,
      y,
      direction: -1
    });

    this.aiTimer = 0;
    this.decisionInterval = 0.25; // Evaluates tactical choices 4x per second
  }

  updateAI(dt, player, soundEngine) {
    if (this.state === 'HIT_STUN' || this.state === 'KNOCKDOWN' || this.state === 'DEAD') {
      return;
    }

    this.aiTimer -= dt;
    const dist = Math.abs(this.x - player.x);
    const toPlayerDir = Math.sign(player.x - this.x);

    // 1. Auto-activate Shadow Mode when energy reaches 100%
    if (this.shadowSystem.isReady() && dist < 320) {
      this.shadowSystem.activate();
      soundEngine.playShadowActivate();
      return;
    }

    // 2. If in Shadow Mode, unleash shadow attacks aggressively
    if (this.shadowSystem.isActive && this.state !== 'ATTACKING') {
      if (dist < 180 && Math.random() < 0.4) {
        this.startAttack(MOVES.SHADOW_ERUPTION);
        return;
      } else if (dist > 180 && dist < 450 && Math.random() < 0.35) {
        this.startAttack(MOVES.SHADOW_DASH);
        return;
      }
    }

    // 3. Counter player jumping with anti-air
    if (player.state === 'JUMP' && dist < 160 && this.state !== 'ATTACKING') {
      this.startAttack(MOVES.PUNCH_UP);
      return;
    }

    // 4. Defensive Reaction: Block or Dodge if player is attacking in close range
    if (player.state === 'ATTACKING' && dist < 170 && this.state !== 'ATTACKING') {
      const roll = Math.random();
      if (roll < 0.45) {
        this.state = 'BLOCK';
        this.vx = 0;
        return;
      } else if (roll < 0.65) {
        // Low sweep counter
        this.startAttack(MOVES.KICK_DOWN);
        return;
      }
    }

    // 5. Periodic tactical repositioning and attack selection
    if (this.aiTimer <= 0) {
      this.aiTimer = this.decisionInterval + Math.random() * 0.2;

      // Close combat range (< 120px)
      if (dist < 120) {
        const attackChoice = Math.random();
        if (attackChoice < 0.35) {
          this.startAttack(MOVES.PUNCH_1);
        } else if (attackChoice < 0.6) {
          this.startAttack(MOVES.KICK_1);
        } else if (attackChoice < 0.8) {
          this.startAttack(MOVES.KICK_DOWN);
        } else {
          // Backpedal to reset spacing
          this.vx = -toPlayerDir * 150;
          this.state = 'WALK_BACK';
        }
      } 
      // Mid range (120px - 260px)
      else if (dist >= 120 && dist <= 260) {
        const choice = Math.random();
        if (choice < 0.3) {
          this.startAttack(MOVES.PUNCH_FORWARD);
        } else if (choice < 0.55) {
          this.startAttack(MOVES.KICK_FORWARD);
        } else if (choice < 0.8) {
          // Advance forward
          this.vx = toPlayerDir * 190;
          this.state = 'WALK_FORWARD';
        } else if (this.rangedCooldown <= 0 && Math.random() < 0.5) {
          this.startAttack(MOVES.RANGED_THROW);
          this.rangedCooldown = 2.4;
        }
      } 
      // Far range (> 260px)
      else {
        const roll = Math.random();
        if (roll < 0.75) {
          // Close the gap
          this.vx = toPlayerDir * 230;
          this.state = 'WALK_FORWARD';
        } else if (this.rangedCooldown <= 0) {
          this.startAttack(MOVES.RANGED_THROW);
          this.rangedCooldown = 2.4;
        }
      }
    }
  }
}

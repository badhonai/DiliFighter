import { Fighter } from '../entities/Fighter.js';
import { MOVES } from '../combat/FrameData.js';
import { GAME_CONFIG } from '../config.js';

export class Dili extends Fighter {
  constructor(x = 350, y = 580) {
    super({
      name: 'DILI',
      isPlayer: true,
      x,
      y,
      direction: 1
    });

    this.chainTimeout = 0;
  }

  handleInput(input, soundEngine) {
    if (this.state === 'HIT_STUN' || this.state === 'KNOCKDOWN' || this.state === 'DEAD') {
      return;
    }

    const isMovingLeft = input.isActionDown('move_left');
    const isMovingRight = input.isActionDown('move_right');
    const isJumping = input.isActionJustPressed('jump');
    const isCrouching = input.isActionDown('crouch');

    const isPunch = input.isActionJustPressed('punch');
    const isKick = input.isActionJustPressed('kick');
    const isRanged = input.isActionJustPressed('ranged');
    const isShadow = input.isActionJustPressed('shadow');
    const isHeavy = input.isActionJustPressed('heavy');
    const isBlocking = input.isActionDown('block');
    const dashDir = input.consumeDash();

    // --- Shadow Mode Activation & Abilities ---
    if (isShadow) {
      if (this.shadowSystem.isReady()) {
        this.shadowSystem.activate();
        soundEngine.playShadowActivate();
        return;
      }
      // If already in shadow form, trigger Shadow Dash
      if (this.shadowSystem.isActive) {
        this.startAttack(MOVES.SHADOW_DASH);
        return;
      }
    }

    // --- Attack Executions ---
    if (isPunch) {
      if (this.shadowSystem.isActive && isCrouching) {
        this.startAttack(MOVES.SHADOW_ERUPTION);
      } else if (input.isActionDown('jump')) {
        this.startAttack(MOVES.PUNCH_UP);
      } else if (isCrouching) {
        this.startAttack(MOVES.PUNCH_DOWN);
      } else if ((this.direction === 1 && isMovingRight) || (this.direction === -1 && isMovingLeft)) {
        this.startAttack(MOVES.PUNCH_FORWARD);
      } else {
        // Punch combo chaining (1 -> 2 -> 3)
        if (this.state === 'ATTACKING' && this.attackPhase === 'recovery') {
          this.punchChainIndex = (this.punchChainIndex + 1) % 3;
        } else if (this.state !== 'ATTACKING') {
          this.punchChainIndex = 0;
        }

        const chain = [MOVES.PUNCH_1, MOVES.PUNCH_2, MOVES.PUNCH_3];
        this.startAttack(chain[this.punchChainIndex]);
      }
      return;
    }

    if (isKick) {
      if (input.isActionDown('jump')) {
        this.startAttack(MOVES.KICK_UP);
      } else if (isCrouching) {
        this.startAttack(MOVES.KICK_DOWN); // Dragon sweep
      } else if ((this.direction === 1 && isMovingRight) || (this.direction === -1 && isMovingLeft)) {
        this.startAttack(MOVES.KICK_FORWARD);
      } else {
        if (this.state === 'ATTACKING' && this.attackPhase === 'recovery') {
          this.kickChainIndex = (this.kickChainIndex + 1) % 2;
        } else if (this.state !== 'ATTACKING') {
          this.kickChainIndex = 0;
        }

        const chain = [MOVES.KICK_1, MOVES.KICK_2];
        this.startAttack(chain[this.kickChainIndex]);
      }
      return;
    }

    if (isRanged && this.rangedCooldown <= 0) {
      if (this.startAttack(MOVES.RANGED_THROW)) {
        this.rangedCooldown = 1.8;
      }
      return;
    }

    if (isHeavy) {
      this.startAttack(MOVES.HEAVY_SMASH);
      return;
    }

    // --- Movement / Neutral States ---
    if (this.state === 'ATTACKING') return;

    // Double-tap dash (startDash validates state/ground)
    if (dashDir !== 0 && this.startDash(dashDir)) {
      return;
    }
    if (this.state === 'DASH') return; // hold the burst velocity

    // Jump
    if (isJumping && this.y >= 575) {
      this.vy = -560;
      this.state = 'JUMP';
      soundEngine.playJump();
      return;
    }

    // Crouch (also guards low attacks)
    if (isCrouching && this.y >= 575) {
      this.state = 'CROUCH';
      this.vx = 0;
      this.moveSpeed = 0;
      return;
    }

    // Block: hold the shield to guard high/mid attacks (grounded)
    if (isBlocking && this.y >= 575) {
      this.state = 'BLOCK';
      this.vx = 0;
      this.moveSpeed = 0;
      return;
    }
    if (this.state === 'BLOCK' && !isBlocking) {
      this.state = 'IDLE';
    }

    // Walk Left / Right — accelerate smoothly toward the target speed
    // instead of snapping 0<->walkSpeed in one frame (fixes jerky movement)
    const walkSpeed = this.shadowSystem.isActive ? 280 : 220;
    const targetSpeed = isMovingRight ? walkSpeed : isMovingLeft ? -walkSpeed : 0;
    const blend = 1 - Math.exp(-18 * GAME_CONFIG.FIXED_TIMESTEP); // ~55ms ramp
    this.moveSpeed += (targetSpeed - this.moveSpeed) * blend;
    // Snap to a full stop so the fighter doesn't micro-crawl forever
    if (targetSpeed === 0 && Math.abs(this.moveSpeed) < 14) this.moveSpeed = 0;
    this.vx = this.moveSpeed;
    if (this.moveSpeed > 8) {
      this.state = this.direction === 1 ? 'WALK_FORWARD' : 'WALK_BACK';
    } else if (this.moveSpeed < -8) {
      this.state = this.direction === -1 ? 'WALK_FORWARD' : 'WALK_BACK';
    } else if (this.y >= 575) {
      this.state = 'IDLE';
    }
  }
}

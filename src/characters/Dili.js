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
    // Buffered attack press ({action, time}) — see handleInput
    this.inputBuffer = null;
  }

  handleInput(input, soundEngine) {
    const now = performance.now();

    // INPUT BUFFER: presses made while stunned/knocked down/attacking are
    // remembered for a short window and executed the first moment the
    // fighter can act — mashing during enemy pressure is never eaten.
    const pressList = [
      ['punch', input.isActionJustPressed('punch')],
      ['kick', input.isActionJustPressed('kick')],
      ['heavy', input.isActionJustPressed('heavy')],
      ['ranged', input.isActionJustPressed('ranged')],
    ];
    for (const [action, pressed] of pressList) {
      if (pressed) this.inputBuffer = { action, time: now };
    }
    if (this.inputBuffer && now - this.inputBuffer.time > 220) this.inputBuffer = null;
    const takeBuffered = (action) => {
      if (this.inputBuffer && this.inputBuffer.action === action) {
        this.inputBuffer = null;
        return true;
      }
      return false;
    };

    if (this.state === 'HIT_STUN' || this.state === 'KNOCKDOWN' || this.state === 'DEAD') {
      return;
    }

    const isMovingLeft = input.isActionDown('move_left');
    const isMovingRight = input.isActionDown('move_right');
    const isJumping = input.isActionJustPressed('jump');
    const isCrouching = input.isActionDown('crouch');

    const isPunch = takeBuffered('punch');
    const isKick = takeBuffered('kick');
    const isRanged = takeBuffered('ranged');
    const isShadow = input.isActionJustPressed('shadow');
    const isHeavy = takeBuffered('heavy');
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
    // ALWAYS moveable: even mid-attack (45% speed) or while blocking (50%),
    // so the fighter never feels locked in place. Hitstun/knockdown still lock.
    const busyMult = this.state === 'ATTACKING' ? 0.45 : this.state === 'BLOCK' ? 0.5 : 1;

    // Double-tap dash (startDash validates state/ground)
    if (dashDir !== 0 && this.startDash(dashDir)) {
      return;
    }
    if (this.state === 'DASH') return; // hold the burst velocity

    // Air drift: steer a little mid-jump so jumps feel controllable
    if (this.state === 'JUMP' && this.y < 575) {
      const airTarget = isMovingRight ? 210 : isMovingLeft ? -210 : this.vx;
      this.vx += (airTarget - this.vx) * 0.06;
      return;
    }

    // Jump (attacks stay committed — no jump-cancelling swings)
    if (isJumping && this.y >= 575 && this.state !== 'ATTACKING') {
      this.vy = -600;
      this.state = 'JUMP';
      soundEngine.playJump();
      return;
    }

    // Crouch (also guards low attacks) — never cancels an attack
    if (isCrouching && this.y >= 575 && this.state !== 'ATTACKING') {
      this.state = 'CROUCH';
      this.vx = 0;
      this.moveSpeed = 0;
      return;
    }

    // Block: hold the shield to guard high/mid attacks (grounded).
    // Blocking no longer roots you — the walk section below lets you
    // shuffle at half speed while guarding.
    if (isBlocking && this.y >= 575 && this.state !== 'ATTACKING') {
      this.state = 'BLOCK';
    } else if (this.state === 'BLOCK' && !isBlocking) {
      this.state = 'IDLE';
    }

    // Walk Left / Right — accelerate smoothly toward the target speed
    // instead of snapping 0<->walkSpeed in one frame (fixes jerky movement).
    // Analog stick: tilt further = walk faster; a gentle nudge = a calm step.
    const walkSpeed = this.shadowSystem.isActive ? 330 : 265;
    const axisX = input.getVirtualAxis ? input.getVirtualAxis().x : 0;
    const mag = Math.abs(axisX) > 0.05 ? Math.min(1, Math.abs(axisX)) : 1;
    const ease = 0.5 + 0.5 * mag;
    const targetSpeed = (isMovingRight ? walkSpeed : isMovingLeft ? -walkSpeed : 0) * ease;
    const blend = 1 - Math.exp(-26 * GAME_CONFIG.FIXED_TIMESTEP); // ~38ms ramp
    this.moveSpeed += (targetSpeed - this.moveSpeed) * blend;
    // Snap to a full stop so the fighter doesn't micro-crawl forever
    if (targetSpeed === 0 && Math.abs(this.moveSpeed) < 24) this.moveSpeed = 0;
    this.vx = this.moveSpeed * busyMult;
    if (this.state !== 'ATTACKING' && this.state !== 'BLOCK') {
      if (this.moveSpeed > 8) {
        this.state = this.direction === 1 ? 'WALK_FORWARD' : 'WALK_BACK';
      } else if (this.moveSpeed < -8) {
        this.state = this.direction === -1 ? 'WALK_FORWARD' : 'WALK_BACK';
      } else if (this.y >= 575) {
        this.state = 'IDLE';
      }
    }
  }
}

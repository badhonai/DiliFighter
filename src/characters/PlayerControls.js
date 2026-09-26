/**
 * PlayerControls — the human control scheme, shared by every playable
 * character (Dili, Tsunami, …). Extracted verbatim from the original Dili
 * implementation so all fighters feel equally crisp; per-character
 * differences come from stat fields (walkSpeed, damageMult, …).
 */
import { MOVES } from '../combat/FrameData.js';
import { GAME_CONFIG } from '../config.js';

export function handlePlayerInput(fighter, input, soundEngine) {
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
    if (pressed) fighter.inputBuffer = { action, time: now };
  }
  if (fighter.inputBuffer && now - fighter.inputBuffer.time > 220) fighter.inputBuffer = null;
  const takeBuffered = (action) => {
    if (fighter.inputBuffer && fighter.inputBuffer.action === action) {
      fighter.inputBuffer = null;
      return true;
    }
    return false;
  };

  if (fighter.state === 'HIT_STUN' || fighter.state === 'KNOCKDOWN' || fighter.state === 'DEAD') {
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
    if (fighter.shadowSystem.isReady()) {
      fighter.shadowSystem.activate();
      soundEngine.playShadowActivate();
      return;
    }
    // If already in shadow form, trigger Shadow Dash
    if (fighter.shadowSystem.isActive) {
      fighter.startAttack(MOVES.SHADOW_DASH);
      return;
    }
  }

  // --- Attack Executions ---
  if (isPunch) {
    if (fighter.shadowSystem.isActive && isCrouching) {
      fighter.startAttack(MOVES.SHADOW_ERUPTION);
    } else if (input.isActionDown('jump')) {
      fighter.startAttack(MOVES.PUNCH_UP);
    } else if (isCrouching) {
      fighter.startAttack(MOVES.PUNCH_DOWN);
    } else if ((fighter.direction === 1 && isMovingRight) || (fighter.direction === -1 && isMovingLeft)) {
      fighter.startAttack(MOVES.PUNCH_FORWARD);
    } else {
      // Punch combo chaining (1 -> 2 -> 3)
      if (fighter.state === 'ATTACKING' && fighter.attackPhase === 'recovery') {
        fighter.punchChainIndex = (fighter.punchChainIndex + 1) % 3;
      } else if (fighter.state !== 'ATTACKING') {
        fighter.punchChainIndex = 0;
      }

      const chain = [MOVES.PUNCH_1, MOVES.PUNCH_2, MOVES.PUNCH_3];
      fighter.startAttack(chain[fighter.punchChainIndex]);
    }
    return;
  }

  if (isKick) {
    if (input.isActionDown('jump')) {
      fighter.startAttack(MOVES.KICK_UP);
    } else if (isCrouching) {
      fighter.startAttack(MOVES.KICK_DOWN); // Dragon sweep
    } else if ((fighter.direction === 1 && isMovingRight) || (fighter.direction === -1 && isMovingLeft)) {
      fighter.startAttack(MOVES.KICK_FORWARD);
    } else {
      if (fighter.state === 'ATTACKING' && fighter.attackPhase === 'recovery') {
        fighter.kickChainIndex = (fighter.kickChainIndex + 1) % 2;
      } else if (fighter.state !== 'ATTACKING') {
        fighter.kickChainIndex = 0;
      }

      const chain = [MOVES.KICK_1, MOVES.KICK_2];
      fighter.startAttack(chain[fighter.kickChainIndex]);
    }
    return;
  }

  if (isRanged && fighter.rangedCooldown <= 0) {
    if (fighter.startAttack(MOVES.RANGED_THROW)) {
      fighter.rangedCooldown = 1.8;
    }
    return;
  }

  if (isHeavy) {
    fighter.startAttack(MOVES.HEAVY_SMASH);
    return;
  }

  // --- Movement / Neutral States ---
  // ALWAYS moveable: even mid-attack (45% speed) or while blocking (50%),
  // so the fighter never feels locked in place. Hitstun/knockdown still lock.
  const busyMult = fighter.state === 'ATTACKING' ? 0.45 : fighter.state === 'BLOCK' ? 0.5 : 1;

  // Double-tap dash (startDash validates state/ground)
  if (dashDir !== 0 && fighter.startDash(dashDir)) {
    return;
  }
  if (fighter.state === 'DASH') return; // hold the burst velocity

  // Air drift: steer a little mid-jump so jumps feel controllable
  if (fighter.state === 'JUMP' && fighter.y < 575) {
    const airTarget = isMovingRight ? 210 : isMovingLeft ? -210 : fighter.vx;
    fighter.vx += (airTarget - fighter.vx) * 0.06;
    return;
  }

  // Jump (attacks stay committed — no jump-cancelling swings)
  if (isJumping && fighter.y >= 575 && fighter.state !== 'ATTACKING') {
    fighter.vy = -fighter.jumpPower;
    fighter.state = 'JUMP';
    soundEngine.playJump();
    return;
  }

  // Crouch (also guards low attacks) — never cancels an attack
  if (isCrouching && fighter.y >= 575 && fighter.state !== 'ATTACKING') {
    fighter.state = 'CROUCH';
    fighter.vx = 0;
    fighter.moveSpeed = 0;
    return;
  }

  // Block: hold the shield to guard high/mid attacks (grounded).
  if (isBlocking && fighter.y >= 575 && fighter.state !== 'ATTACKING') {
    fighter.state = 'BLOCK';
  } else if (fighter.state === 'BLOCK' && !isBlocking) {
    fighter.state = 'IDLE';
  }

  // Walk Left / Right — analog stick with a response curve that reaches
  // full speed at ~85% deflection, and ASYMMETRIC responsiveness:
  // near-instant stops and direction reversals, slightly softer build-up.
  const walkSpeed = fighter.shadowSystem.isActive ? fighter.shadowWalkSpeed : fighter.walkSpeed;
  const axisX = input.getVirtualAxis ? input.getVirtualAxis().x : 0;
  const rawMag = Math.abs(axisX);
  const mag = rawMag > 0.05 ? Math.min(1, rawMag / 0.85) : 1;
  const ease = 0.5 + 0.5 * mag;
  const targetSpeed = (isMovingRight ? walkSpeed : isMovingLeft ? -walkSpeed : 0) * ease;

  let rate;
  if (targetSpeed === 0) {
    rate = 70; // crisp stop — no sliding when the stick is released
  } else if (Math.sign(targetSpeed) !== Math.sign(fighter.moveSpeed)) {
    rate = 60; // fast direction reversal — turn on a dime
  } else {
    rate = 42; // quick build-up
  }
  const blend = 1 - Math.exp(-rate * GAME_CONFIG.FIXED_TIMESTEP);
  fighter.moveSpeed += (targetSpeed - fighter.moveSpeed) * blend;
  if (targetSpeed === 0 && Math.abs(fighter.moveSpeed) < 30) fighter.moveSpeed = 0;
  fighter.vx = fighter.moveSpeed * busyMult;
  if (fighter.state !== 'ATTACKING' && fighter.state !== 'BLOCK') {
    if (fighter.moveSpeed > 8) {
      fighter.state = fighter.direction === 1 ? 'WALK_FORWARD' : 'WALK_BACK';
    } else if (fighter.moveSpeed < -8) {
      fighter.state = fighter.direction === -1 ? 'WALK_FORWARD' : 'WALK_BACK';
    } else if (fighter.y >= 575) {
      fighter.state = 'IDLE';
    }
  }
}

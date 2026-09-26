/**
 * AiBrain — the opponent brain, shared by any fighter class. Extracted
 * verbatim from the original Tsunami implementation so both Dili and
 * Tsunami can serve as AI opponents (needed for character select).
 */
import { MOVES } from '../combat/FrameData.js';
import { Difficulty } from '../core/Difficulty.js';

export function runAI(fighter, dt, player, soundEngine) {
  if (fighter.state === 'HIT_STUN' || fighter.state === 'KNOCKDOWN' || fighter.state === 'DEAD') {
    return;
  }

  fighter.aiTimer -= dt;
  fighter.defendCooldown = Math.max(0, (fighter.defendCooldown || 0) - dt);
  const dist = Math.abs(fighter.x - player.x);
  const toPlayerDir = Math.sign(player.x - fighter.x);

  // Per-level modifiers (campaign) scale the base difficulty preset and the
  // AI's foot speed. Defined early: every branch below may read them.
  const M = fighter.aiMods || {};
  const basePreset = Difficulty.preset;
  const D = {
    decision: basePreset.decision * (M.decision ?? 1),
    attackBias: basePreset.attackBias * (M.attackBias ?? 1),
    defendBias: basePreset.defendBias * (M.defendBias ?? 1),
    dashIn: basePreset.dashIn * (M.dashIn ?? 1),
    aiDamage: basePreset.aiDamage,
    playerDamage: basePreset.playerDamage,
  };
  const spd = M.speed ?? 1;

  // Like the player, the AI can step while swinging — keeps both fighters
  // feeling alive instead of rooting mid-attack.
  if (fighter.state === 'ATTACKING') {
    if (dist > 140) fighter.vx = toPlayerDir * 90 * spd;
    return;
  }

  // 1. Auto-activate Shadow Mode when energy reaches 100%
  if (fighter.shadowSystem.isReady() && dist < 320) {
    fighter.shadowSystem.activate();
    soundEngine.playShadowActivate();
    return;
  }

  // 2. If in Shadow Mode, unleash shadow attacks aggressively
  if (fighter.shadowSystem.isActive && fighter.state !== 'ATTACKING') {
    if (dist < 180 && Math.random() < 0.4) {
      fighter.startAttack(MOVES.SHADOW_ERUPTION);
      return;
    } else if (dist > 180 && dist < 450 && Math.random() < 0.35) {
      fighter.startAttack(MOVES.SHADOW_DASH);
      return;
    }
  }

  // 3. Counter player jumping with anti-air
  if (player.state === 'JUMP' && dist < 160 && fighter.state !== 'ATTACKING') {
    fighter.startAttack(MOVES.PUNCH_UP);
    return;
  }

  // 4. Defensive Reaction: Block or Dodge if player is attacking in close
  //    range — but only once per cooldown window, like a human read, not
  //    a frame-perfect machine-gun guard. Odds scale with difficulty.
  if (player.state === 'ATTACKING' && dist < 170 && fighter.state !== 'ATTACKING' && fighter.defendCooldown <= 0) {
    fighter.defendCooldown = 0.7;
    const roll = Math.random();
    if (roll < 0.35 * D.defendBias) {
      fighter.state = 'BLOCK';
      fighter.vx = 0;
      return;
    } else if (roll < (0.35 + 0.15 * D.defendBias)) {
      // Low sweep counter
      fighter.startAttack(MOVES.KICK_DOWN);
      return;
    }
  }

  // 5. Periodic tactical repositioning and attack selection.
  if (fighter.aiTimer <= 0) {
    fighter.aiTimer = D.decision + Math.random() * 0.2;
    const bias = Math.min(1.4, D.attackBias);

    // Close combat range (< 120px)
    if (dist < 120) {
      const attackChoice = Math.random();
      if (attackChoice < 0.3 * bias) {
        fighter.startAttack(MOVES.PUNCH_1);
      } else if (attackChoice < 0.55 * bias) {
        fighter.startAttack(MOVES.KICK_1);
      } else if (attackChoice < 0.72 * bias) {
        fighter.startAttack(MOVES.KICK_DOWN);
      } else if (attackChoice < 0.85 * bias) {
        fighter.startAttack(MOVES.HEAVY_SMASH);
      } else {
        // Backpedal to reset spacing
        fighter.vx = -toPlayerDir * 150 * spd;
        fighter.state = 'WALK_BACK';
      }
    }
    // Mid range (120px - 260px)
    else if (dist >= 120 && dist <= 260) {
      const choice = Math.random();
      if (choice < 0.3 * bias) {
        fighter.startAttack(MOVES.PUNCH_FORWARD);
      } else if (choice < 0.5 * bias) {
        fighter.startAttack(MOVES.KICK_FORWARD);
      } else if (choice < 0.62 * bias) {
        fighter.startAttack(MOVES.HEAVY_SMASH);
      } else if (choice < 0.8) {
        // Advance forward
        fighter.vx = toPlayerDir * 225 * spd;
        fighter.state = 'WALK_FORWARD';
      } else if (fighter.rangedCooldown <= 0 && Math.random() < 0.5) {
        fighter.startAttack(MOVES.RANGED_THROW);
        fighter.rangedCooldown = 2.4;
      }
    }
    // Far range (> 260px)
    else {
      const roll = Math.random();
      if (roll < 0.6) {
        // Close the gap
        fighter.vx = toPlayerDir * 270 * spd;
        fighter.state = 'WALK_FORWARD';
      } else if (roll < 0.6 + 0.18 * D.dashIn && dist < 600) {
        // Dash-in to pressure
        if (fighter.startDash(toPlayerDir)) return;
      } else if (fighter.rangedCooldown <= 0) {
        fighter.startAttack(MOVES.RANGED_THROW);
        fighter.rangedCooldown = 2.4;
      }
    }
  }
}

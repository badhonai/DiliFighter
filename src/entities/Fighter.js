import { GAME_CONFIG } from '../config.js';
import { Hitbox } from '../combat/Hitbox.js';
import { MOVES } from '../combat/FrameData.js';
import { ShadowSystem } from '../combat/ShadowSystem.js';
import { FighterRenderer } from './FighterRenderer.js';
import { Projectile } from './Projectile.js';

export class Fighter {
  constructor({ name, isPlayer = false, x = 300, y = 580, direction = 1 }) {
    this.name = name;
    this.isPlayer = isPlayer;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    // Smoothed horizontal speed used by player walk input (ramps toward the
    // target instead of snapping, so movement doesn't start/stop as a hard pop)
    this.moveSpeed = 0;
    this.direction = direction; // 1 = right, -1 = left

    // Stats
    this.health = GAME_CONFIG.MATCH.MAX_HEALTH;
    this.maxHealth = GAME_CONFIG.MATCH.MAX_HEALTH;
    this.roundsWon = 0;

    // Subsystems
    this.shadowSystem = new ShadowSystem(this);
    this.renderer = new FighterRenderer(this);

    // State machine
    this.state = 'IDLE';
    this.animTime = 0;
    this.actionProgress = 0; // 0 to 1

    // Attack State
    this.currentMove = null;
    this.attackPhase = null; // 'startup' | 'active' | 'recovery'
    this.frameTimer = 0;
    // Brief invulnerability after recovering from stun/knockdown — breaks
    // frame-perfect stun-locks so the defender always gets a chance to act.
    this.invincibleTimer = 0;
    this.hasHitOpponent = false;
    this.comboCount = 0;
    this.comboResetTimer = 0;
    this.punchChainIndex = 0;
    this.kickChainIndex = 0;
    // Double-tap dash state
    this.dashTimer = 0;
    this.dashDir = 0;
    this.dashFxDone = false;

    // Defense & Stun
    this.stunDuration = 0;
    this.isBlocking = false;
    this.isCrouching = false;
    this.hitStop = 0; // frame freeze on impact

    // Ranged cooldown
    this.rangedCooldown = 0;

    // AI specific properties
    this.aiTimer = 0;
    this.aiNextAction = 'idle';
  }

  getHurtboxes() {
    const S = GAME_CONFIG.FIGHTER_SCALE;
    const isCrouching = this.state === 'CROUCH';
    const isKnockedDown = this.state === 'KNOCKDOWN';

    if (isKnockedDown) {
      // Grounded prone hurtbox
      return [
        new Hitbox(this.x, this.y, 70 * S, 25 * S, 'hurtbox')
      ];
    }

    if (isCrouching) {
      return [
        new Hitbox(this.x, this.y - 40 * S, 42 * S, 35 * S, 'hurtbox'), // Torso
        new Hitbox(this.x, this.y, 48 * S, 40 * S, 'hurtbox'),          // Legs
      ];
    }

    // Standing / standard hurtboxes
    return [
      new Hitbox(this.x, this.y - 75 * S, 34 * S, 26 * S, 'hurtbox'),  // Head
      new Hitbox(this.x, this.y - 45 * S, 44 * S, 40 * S, 'hurtbox'),  // Torso
      new Hitbox(this.x, this.y, 42 * S, 45 * S, 'hurtbox'),           // Legs
    ];
  }

  getActiveHitbox() {
    if (this.state !== 'ATTACKING' || this.attackPhase !== 'active' || !this.currentMove) {
      return null;
    }

    const m = this.currentMove;
    if (!m.hitbox) return null;

    // Reach stays at authored values — only the BODY scales visually, so
    // melee attacks can never hit from absurd distances.
    const hx = this.x + m.hitbox.offsetX * this.direction;
    const hy = this.y + m.hitbox.offsetY;

    return new Hitbox(hx, hy, m.hitbox.w, m.hitbox.h, 'hitbox', {
      damage: m.damage * (this.shadowSystem.isActive ? 1.3 : 1.0),
      knockbackX: m.knockback.x * this.direction,
      knockbackY: m.knockback.y,
      stunFrames: m.stunFrames,
      isHeavy: m.isHeavy,
      isShadow: this.shadowSystem.isActive || m.isShadow,
      isLow: m.height === 'LOW',
      isHigh: m.height === 'HIGH',
      isKnockdown: m.isKnockdown || false,
    });
  }

  /** Quick burst dash from a double-tap. Cancelled by attacks/stun. */
  startDash(dir) {
    if (this.state === 'HIT_STUN' || this.state === 'KNOCKDOWN' || this.state === 'DEAD' || this.state === 'ATTACKING') return false;
    if (this.y < GAME_CONFIG.PHYSICS.GROUND_Y - 5) return false;
    this.state = 'DASH';
    this.dashDir = dir;
    this.dashTimer = 0.16;
    this.dashFxDone = false;
    this.vx = dir * 1050;
    this.moveSpeed = 0;
    return true;
  }

  startAttack(move) {
    if (this.state === 'HIT_STUN' || this.state === 'KNOCKDOWN' || this.state === 'DEAD') return false;
    if (this.state === 'ATTACKING' && this.attackPhase !== 'recovery') return false;

    this.currentMove = move;
    this.state = 'ATTACKING';
    this.attackPhase = 'startup';
    this.frameTimer = move.startup;
    this.hasHitOpponent = false;
    this.actionProgress = 0;

    // Apply movement impulse if specified
    if (move.lungeSpeed) {
      this.vx = move.lungeSpeed * this.direction;
    }

    return true;
  }

  takeHit(hitbox, attacker, soundEngine, particleSystem) {
    if (this.state === 'DEAD') return;

    // Recovery grace: attacks whiff for a moment right after stun/knockdown
    if (this.invincibleTimer > 0) return 'evaded';

    const props = hitbox.properties;
    const isShadow = props.isShadow;

    // Check for blocking
    const canBlockHigh = !props.isLow && (this.state === 'BLOCK' || (this.state === 'IDLE' && Math.sign(attacker.x - this.x) !== this.direction));
    const canBlockLow = props.isLow && (this.state === 'CROUCH');

    if (canBlockHigh || canBlockLow) {
      // Successful Block
      this.health = Math.max(0, this.health - Math.floor(props.damage * 0.15));
      this.shadowSystem.addEnergy(GAME_CONFIG.MATCH.SHADOW_GAIN_ON_BLOCK);
      attacker.shadowSystem.addEnergy(GAME_CONFIG.MATCH.SHADOW_GAIN_ON_HIT * 0.4);

      // Block particles and metallic sound
      soundEngine.playBladeClash();
      particleSystem.emitBlockSpark(this.x + 20 * this.direction, this.y - 50, 8);

      // Pushback
      this.vx = props.knockbackX * 0.35;
      return 'blocked';
    }

    // Successful Clean Hit!
    this.health = Math.max(0, this.health - props.damage);
    this.shadowSystem.addEnergy(GAME_CONFIG.MATCH.SHADOW_GAIN_ON_DAMAGE);
    attacker.shadowSystem.addEnergy(GAME_CONFIG.MATCH.SHADOW_GAIN_ON_HIT);

    // Hit sounds
    soundEngine.playHit(props.isHeavy);

    // Hit sparks
    particleSystem.emitHitSpark(this.x, this.y - 50, props.isHeavy ? 18 : 10, props.isHeavy, isShadow);

    // Apply Knockback & Stun
    this.vx = props.knockbackX;
    this.vy = props.knockbackY;

    if (this.health <= 0) {
      this.die();
      return 'ko';
    }

    if (props.isKnockdown || props.isHeavy && this.vy < -200) {
      this.state = 'KNOCKDOWN';
      this.stunDuration = 0.8;
      this.actionProgress = 0;
    } else {
      this.state = 'HIT_STUN';
      this.stunDuration = props.stunFrames / 60;
      this.actionProgress = 0;
    }

    return 'hit';
  }

  die() {
    this.health = 0;
    this.state = 'KNOCKDOWN';
    this.stunDuration = 999;
  }

  reset(x, direction) {
    this.health = this.maxHealth;
    this.x = x;
    this.y = GAME_CONFIG.PHYSICS.GROUND_Y;
    this.vx = 0;
    this.vy = 0;
    this.moveSpeed = 0;
    this.direction = direction;
    this.state = 'IDLE';
    this.currentMove = null;
    this.attackPhase = null;
    this.shadowSystem.reset();
    this.comboCount = 0;
    this.hasHitOpponent = false;
  }

  update(dt, opponent, soundEngine, particleSystem, projectiles) {
    this.animTime += dt;
    this.shadowSystem.update(dt);

    if (this.rangedCooldown > 0) {
      this.rangedCooldown -= dt;
    }

    // Auto-face opponent when in neutral states
    if (['IDLE', 'WALK_FORWARD', 'WALK_BACK', 'JUMP', 'CROUCH'].includes(this.state)) {
      this.direction = opponent.x > this.x ? 1 : -1;
    }

    // Handle dash lifecycle (one-shot burst; attacks cancel it via startAttack)
    if (this.state === 'DASH') {
      if (!this.dashFxDone) {
        this.dashFxDone = true;
        particleSystem.emitDust(this.x, this.y, 5);
        particleSystem.emitDashStreaks(this.x, this.y - 45, this.dashDir);
        soundEngine.playSwing(this.shadowSystem.isActive ? 160 : 200);
      }
      this.dashTimer -= dt;
      if (this.dashTimer <= 0) {
        this.state = 'IDLE';
        this.vx = 0;
      }
    }

    // Handle Attack Phase Progressions
    if (this.state === 'ATTACKING' && this.currentMove) {
      const move = this.currentMove;
      this.frameTimer -= 60 * dt;

      if (this.attackPhase === 'startup') {
        const total = move.startup;
        this.actionProgress = Math.max(0, 1 - (this.frameTimer / total)) * 0.35;
        if (this.frameTimer <= 0) {
          this.attackPhase = 'active';
          this.frameTimer = move.active;
          soundEngine.playSwing(move.isHeavy ? 220 : 340);

          // Spawn projectile if this is a ranged throw
          if (move === MOVES.RANGED_THROW) {
            soundEngine.playRangedLaunch();
            projectiles.push(new Projectile(
              this.x + 35 * this.direction,
              this.y - 65,
              this.direction,
              this,
              this.shadowSystem.isActive
            ));
          }
        }
      } else if (this.attackPhase === 'active') {
        const total = move.active;
        this.actionProgress = 0.35 + Math.max(0, 1 - (this.frameTimer / total)) * 0.35;
        if (this.frameTimer <= 0) {
          this.attackPhase = 'recovery';
          this.frameTimer = move.recovery;
        }
      } else if (this.attackPhase === 'recovery') {
        const total = move.recovery;
        this.actionProgress = 0.70 + Math.max(0, 1 - (this.frameTimer / total)) * 0.30;
        if (this.frameTimer <= 0) {
          this.state = 'IDLE';
          this.currentMove = null;
          this.attackPhase = null;
        }
      }
    }

    // Handle Hit Stun & Knockdown
    this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);
    if (this.state === 'HIT_STUN') {
      this.stunDuration -= dt;
      if (this.stunDuration <= 0) {
        this.state = 'IDLE';
        this.invincibleTimer = 0.12; // stand back up with a breath of safety
      }
    } else if (this.state === 'KNOCKDOWN' && this.health > 0) {
      this.stunDuration -= dt;
      this.actionProgress = Math.max(0, 1 - this.stunDuration / 0.8);
      if (this.stunDuration <= 0) {
        this.state = 'IDLE';
        this.invincibleTimer = 0.25; // getting up must never be punishable
        particleSystem.emitDust(this.x, this.y, 8);
      }
    }

    // Physics Update
    this.vy += GAME_CONFIG.PHYSICS.GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Apply ground friction (dash holds its burst speed — no friction bleed)
    if (this.y >= GAME_CONFIG.PHYSICS.GROUND_Y) {
      this.y = GAME_CONFIG.PHYSICS.GROUND_Y;
      this.vy = 0;
      this.vx *= this.state === 'DASH' ? 1 : GAME_CONFIG.PHYSICS.FRICTION;

      if (this.state === 'JUMP') {
        this.state = 'IDLE';
        particleSystem.emitDust(this.x, this.y, 4);
        soundEngine.playLand();
      }
    }

    // Clamp inside stage bounds
    if (this.x < GAME_CONFIG.PHYSICS.STAGE_LEFT) {
      this.x = GAME_CONFIG.PHYSICS.STAGE_LEFT;
      this.vx = 0;
    } else if (this.x > GAME_CONFIG.PHYSICS.STAGE_RIGHT) {
      this.x = GAME_CONFIG.PHYSICS.STAGE_RIGHT;
      this.vx = 0;
    }

    // Shadow Aura particles when active
    if (this.shadowSystem.isActive) {
      particleSystem.emitShadowEmbers(this.x, this.y, 2);
    }
  }

  render(ctx) {
    this.renderer.render(ctx);
  }
}

import { GAME_CONFIG } from '../config.js';
import { spriteEntry } from './SpriteStore.js';

/**
 * FighterRenderer — sprite-only body renderer.
 * The AI sprite frames ARE the fighters now (permanent direction); the old
 * vector puppet was removed. Ground shadow + shadow aura stay vector so
 * they react to gameplay; the body, normal or shadow form, is a sprite.
 * If a character's frames ever fail to load we simply draw no body rather
 * than resurrecting legacy art.
 */
export class FighterRenderer {
  constructor(fighter) {
    this.fighter = fighter;
  }

  render(ctx) {
    const f = this.fighter;
    const isShadow = f.shadowSystem.isActive;
    const dir = f.direction; // 1 for facing right, -1 for facing left

    const S = GAME_CONFIG.FIGHTER_SCALE;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(dir * S, S);

    this.renderGroundShadow(ctx, f, isShadow);

    if (isShadow) {
      this.renderShadowAura(ctx, f);
    }

    this.renderFighterBody(ctx, f, isShadow);

    ctx.restore();
  }

  renderGroundShadow(ctx, f, isShadow) {
    // Shadow shrinks and lightens when fighter jumps
    const heightAboveGround = Math.max(0, 580 - f.y);
    const shadowScale = Math.max(0.4, 1 - heightAboveGround / 400);
    const alpha = (isShadow ? 0.6 : 0.4) * shadowScale;
    ctx.save();
    ctx.fillStyle = isShadow ? 'rgba(0, 240, 255, 0.25)' : 'rgba(0, 0, 0, 0.45)';
    if (isShadow) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 42 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderShadowAura(ctx, f) {
    const pulse = Math.sin(f.shadowSystem.auraPulse) * 0.15 + 0.85;
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 22 * pulse;
    ctx.strokeStyle = `rgba(0, 240, 255, ${0.4 * pulse})`;
    ctx.lineWidth = 3;

    // Silhouette ghost contour
    ctx.beginPath();
    ctx.ellipse(0, -50, 26, 48, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  renderFighterBody(ctx, f, isShadow) {
    const entry = spriteEntry(f.charId);
    if (!entry || !entry.ready) return; // frames missing: no legacy fallback
    const sp = entry.poses.get(this.poseForSprite(f)) || entry.poses.get('idle');
    if (!sp) return;
    const frame = isShadow && sp.shadow ? sp.shadow : sp.canvas;

    const H = GAME_CONFIG.SPRITE_HEIGHT;
    const w = sp.w * (H / sp.h);
    const t = f.animTime || 0;
    const phase = f.isPlayer ? 0 : 2.1; // desync the two fighters

    let bob = 0, lean = 0, rot = 0, sy = 1;
    switch (f.state) {
      case 'WALK_FORWARD':
      case 'WALK_BACK':
        bob = -Math.abs(Math.sin(t * 9 + phase)) * 4; break;
      case 'DASH':
        lean = 0.16; bob = -2; break;
      case 'ATTACKING':
        lean = f.attackPhase === 'active' ? 0.10
          : f.attackPhase === 'startup' ? -0.10 : 0.04;
        break;
      case 'HIT_STUN':
        lean = -0.24; bob = 2; break;
      case 'BLOCK':
        bob = 1.5; break;
      case 'CROUCH':
        sy = 0.82; break;
      case 'JUMP':
        bob = -2; break;
      case 'KNOCKDOWN':
      case 'DEAD':
        rot = -1.45; bob = 8; break;
      default:
        bob = Math.sin(t * 3.6 + phase) * 2.2;
    }

    ctx.save();
    if (isShadow) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
    }
    ctx.translate(0, bob);
    ctx.rotate(rot + lean);
    ctx.scale(1, sy);
    ctx.drawImage(frame, -w / 2, -H, w, H);
    ctx.restore();
  }

  poseForSprite(f) {
    switch (f.state) {
      case 'WALK_FORWARD':
      case 'WALK_BACK':
      case 'DASH': return 'walk';
      case 'ATTACKING': return f.attackPhase === 'active' ? 'strike' : 'windup';
      case 'BLOCK':
      case 'CROUCH': return 'block';
      case 'HIT_STUN':
      case 'KNOCKDOWN':
      case 'DEAD': return 'hit';
      default: return 'idle';
    }
  }
}

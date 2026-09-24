import { Hitbox } from '../combat/Hitbox.js';

export class Projectile {
  constructor(x, y, direction, owner, isShadow = false) {
    this.x = x;
    this.y = y;
    this.direction = direction; // 1 or -1
    this.owner = owner;
    this.isShadow = isShadow;
    // Deliberately readable flight speed — projectiles must be dodge-able
    this.speed = isShadow ? 680 : 440;
    this.damage = isShadow ? 80 : 45;
    this.stunFrames = 18;
    this.active = true;
    this.rotation = 0;
    this.width = 34;
    this.height = 14;
  }

  getHitbox() {
    return new Hitbox(this.x, this.y, this.width, this.height, 'hitbox', {
      damage: this.damage,
      knockbackX: 160 * this.direction,
      knockbackY: -40,
      stunFrames: this.stunFrames,
      isHeavy: this.isShadow,
      isShadow: this.isShadow,
      isLow: false,
      isHigh: false,
    });
  }

  update(dt, stageBounds, particleSystem) {
    if (!this.active) return;

    this.x += this.speed * this.direction * dt;
    this.rotation += 9 * this.direction * dt;

    // Trail so the eye can track the projectile across busy stages
    if (this.isShadow) {
      particleSystem.emitShadowEmbers(this.x, this.y, 1);
    } else {
      particleSystem.particles.push({
        x: this.x - this.direction * 10, y: this.y,
        vx: -this.direction * 60, vy: 0,
        size: 2.4, color: 'rgba(147, 231, 255, 0.8)',
        alpha: 0.8, life: 0.18, maxLife: 0.18, type: 'spark',
      });
    }

    // Check boundary
    if (this.x < stageBounds.left - 50 || this.x > stageBounds.right + 50) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.isShadow) {
      // Glowing cyan energy shuriken
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
        const midAngle = angle + Math.PI / 4;
        ctx.lineTo(Math.cos(midAngle) * 4, Math.sin(midAngle) * 4);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      // Steel Kunai / Throwing Dagger — big, bright and halo-lit so it never
      // disappears against busy stage art (halo uses gradients: phone-safe)
      const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 30);
      halo.addColorStop(0, 'rgba(147, 231, 255, 0.5)');
      halo.addColorStop(1, 'rgba(147, 231, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.scale(1.7, 1.7);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 1.4;

      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(0, -5);
      ctx.lineTo(-8, -2);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-8, 2);
      ctx.lineTo(0, 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Ring handle
      ctx.beginPath();
      ctx.arc(-14, 0, 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

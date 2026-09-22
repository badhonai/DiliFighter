import { Hitbox } from '../combat/Hitbox.js';

export class Projectile {
  constructor(x, y, direction, owner, isShadow = false) {
    this.x = x;
    this.y = y;
    this.direction = direction; // 1 or -1
    this.owner = owner;
    this.isShadow = isShadow;
    this.speed = isShadow ? 750 : 650;
    this.damage = isShadow ? 80 : 45;
    this.stunFrames = 18;
    this.active = true;
    this.rotation = 0;
    this.width = 24;
    this.height = 12;
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
    this.rotation += 15 * this.direction * dt;

    // Trail particle
    if (this.isShadow) {
      particleSystem.emitShadowEmbers(this.x, this.y, 1);
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
      // Steel Kunai / Throwing Dagger
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      
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

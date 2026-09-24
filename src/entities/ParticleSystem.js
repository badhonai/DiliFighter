import { LOW_FX } from '../core/PerfFlags.js';

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.slashTrails = [];
    // Mobile GPUs choke on per-particle shadowBlur and big particle counts —
    // it tanks the frame rate so hard that input LOOKS dead.
    this.lowFX = LOW_FX;
  }

  emitHitSpark(x, y, count = 12, isHeavy = false, isShadow = false) {
    const baseColor = isShadow ? '#00f0ff' : isHeavy ? '#ff3b30' : '#ffcc00';
    const secondary = isShadow ? '#ffffff' : '#ff9500';
    if (this.lowFX) count = Math.max(4, Math.floor(count / 2));

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (isHeavy ? 280 : 190) + Math.random() * (isHeavy ? 360 : 240);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: (isHeavy ? 5.5 : 3.6) + Math.random() * (isHeavy ? 4 : 3),
        color: Math.random() > 0.4 ? baseColor : secondary,
        alpha: 1.0,
        life: 0.3 + Math.random() * 0.25,
        maxLife: 0.55,
        type: 'spark',
      });
    }

    // Heavy / shadow hits punctuate with an expanding shockwave ring
    if (isHeavy || isShadow) {
      this.emitShockwave(x, y, isShadow);
    }
  }

  /** Expanding impact ring — the "punch" that makes heavy hits LAND.
   *  Kept tight and short-lived so it reads as impact, not a strobe. */
  emitShockwave(x, y, isShadow = false) {
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      radius: 10,
      radiusGrowth: 380,
      lineWidth: 4.5,
      color: isShadow ? '#00f0ff' : '#ffe9a8',
      alpha: 0.8,
      life: 0.2,
      maxLife: 0.2,
      type: 'ring',
    });
  }

  /** Horizontal speed streaks for the double-tap dash. */
  emitDashStreaks(x, y, dir, color = 'rgba(226, 240, 255, 0.85)') {
    const count = this.lowFX ? 3 : 6;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x - dir * (Math.random() * 14),
        y: y + (Math.random() * 60 - 30),
        vx: -dir * (420 + Math.random() * 320),
        vy: (Math.random() * 40 - 20),
        size: 1.6 + Math.random() * 1.4,
        len: 26 + Math.random() * 30,
        color: Math.random() > 0.4 ? color : '#38bdf8',
        alpha: 0.9,
        life: 0.16 + Math.random() * 0.1,
        maxLife: 0.26,
        type: 'streak',
      });
    }
  }

  emitBlockSpark(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI / 4) + (Math.random() * Math.PI / 2);
      const speed = 100 + Math.random() * 150;
      this.particles.push({
        x,
        y,
        vx: (Math.random() > 0.5 ? 1 : -1) * Math.cos(angle) * speed,
        vy: -Math.sin(angle) * speed,
        size: 3 + Math.random() * 2,
        color: '#38bdf8',
        alpha: 1.0,
        life: 0.18 + Math.random() * 0.15,
        maxLife: 0.33,
        type: 'spark',
      });
    }
  }

  emitShadowEmbers(x, y, count = 3) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() * 60 - 30),
        y: y - Math.random() * 80,
        vx: (Math.random() * 40 - 20),
        vy: -40 - Math.random() * 60,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.3 ? '#00f0ff' : '#0284c7',
        alpha: 0.9,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        type: 'shadowWisp',
      });
    }
  }

  emitDust(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() * 20 - 10),
        y: y,
        vx: (Math.random() * 80 - 40),
        vy: -15 - Math.random() * 30,
        size: 5 + Math.random() * 6,
        color: 'rgba(180, 170, 155, 0.4)',
        alpha: 0.6,
        life: 0.3 + Math.random() * 0.25,
        maxLife: 0.55,
        type: 'dust',
      });
    }
  }

  addSlashTrail(points, color = 'rgba(0, 240, 255, 0.8)') {
    this.slashTrails.push({
      points,
      color,
      alpha: 1.0,
      decay: 4.5,
    });
  }

  update(dt) {
    // Hard cap: never let the particle pool balloon (protects frame pacing)
    const MAX_PARTICLES = this.lowFX ? 140 : 400;
    if (this.particles.length > MAX_PARTICLES) {
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = p.life / p.maxLife;

      if (p.type === 'dust') {
        p.size += dt * 10;
        p.vy += 20 * dt;
      } else if (p.type === 'spark') {
        p.vy += 300 * dt; // gravity on sparks
      } else if (p.type === 'ring') {
        p.radius += p.radiusGrowth * dt;
      }
    }

    // Update slash trails
    for (let i = this.slashTrails.length - 1; i >= 0; i--) {
      const t = this.slashTrails[i];
      t.alpha -= t.decay * dt;
      if (t.alpha <= 0) {
        this.slashTrails.splice(i, 1);
      }
    }
  }

  render(ctx) {
    // Draw slash trails
    for (const trail of this.slashTrails) {
      if (trail.points.length < 2) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, trail.alpha);
      ctx.strokeStyle = trail.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      if (!this.lowFX) {
        ctx.shadowColor = trail.color;
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.moveTo(trail.points[0].x, trail.points[0].y);
      for (let i = 1; i < trail.points.length; i++) {
        ctx.lineTo(trail.points[i].x, trail.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // Draw particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        if (!this.lowFX) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'shadowWisp') {
        ctx.fillStyle = p.color;
        if (!this.lowFX) {
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 10;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.lineWidth * p.alpha;
        if (!this.lowFX) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'streak') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * (p.len / 400), p.y - p.vy * 0.04);
        ctx.stroke();
      } else if (p.type === 'dust') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
    this.slashTrails = [];
  }
}

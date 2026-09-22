export class TempleCourtyard {
  constructor() {
    this.petals = [];
    this.ambientTime = 0;
    this.shadowTransition = 0; // 0 = full normal, 1 = full shadow realm

    // Generate initial cherry blossom petals
    for (let i = 0; i < 35; i++) {
      this.petals.push({
        x: Math.random() * 1400 - 60,
        y: Math.random() * 720,
        vx: 30 + Math.random() * 40,
        vy: 20 + Math.random() * 35,
        size: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() * 2 - 1) * 2,
        alpha: 0.6 + Math.random() * 0.4,
      });
    }
  }

  update(dt, isAnyShadowActive) {
    this.ambientTime += dt;

    // Smooth transition towards shadow realm
    const targetShadow = isAnyShadowActive ? 1.0 : 0.0;
    this.shadowTransition += (targetShadow - this.shadowTransition) * (4.0 * dt);

    // Update floating cherry blossom petals
    for (const p of this.petals) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;

      // Wrap around
      if (p.y > 730 || p.x > 1350) {
        p.x = Math.random() * 100 - 150;
        p.y = Math.random() * 400 - 50;
      }
    }
  }

  render(ctx) {
    const s = this.shadowTransition; // 0 to 1

    // Placeholder arena art is laid out for a 1280×720 world. When the canvas
    // (and camera) are on a different aspect ratio, stretch it to cover the
    // full view so there are never empty black borders on any edge.
    const c = ctx.canvas;
    const m = ctx.getTransform();
    // Size of one world unit in physical canvas pixels (after DPR & global scale).
    const unitPx = Math.hypot(m.a, m.b);
    const scaleX = (c.width / 1280) / unitPx;
    const scaleY = (c.height / 720) / unitPx;

    ctx.save();
    ctx.scale(scaleX, scaleY);

    // 1. Sky & Backdrop
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 720);
    if (s < 0.99) {
      // Normal lush daylight sky
      skyGrad.addColorStop(0, '#1e293b');
      skyGrad.addColorStop(0.4, '#334155');
      skyGrad.addColorStop(0.7, '#475569');
      skyGrad.addColorStop(1, '#0f172a');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // If transitioning into Shadow Realm, overlay dark ethereal gradient
    if (s > 0.01) {
      ctx.save();
      ctx.globalAlpha = s;
      const shadowSky = ctx.createLinearGradient(0, 0, 0, 720);
      shadowSky.addColorStop(0, '#020408');
      shadowSky.addColorStop(0.5, '#050a14');
      shadowSky.addColorStop(1, '#020305');
      ctx.fillStyle = shadowSky;
      ctx.fillRect(0, 0, 1280, 720);

      // Ethereal cyan moon / gate
      const moonGrad = ctx.createRadialGradient(640, 220, 10, 640, 220, 180);
      moonGrad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
      moonGrad.addColorStop(0.6, 'rgba(0, 240, 255, 0.08)');
      moonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = moonGrad;
      ctx.beginPath();
      ctx.arc(640, 220, 180, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Far Background: Distant Mountain Peaks & Forest
    this.renderFarMountains(ctx, s);

    // 3. Midground: Ancient Stone Temple Arches & Martial Master Statue
    this.renderTempleRuins(ctx, s);

    // 4. Foreground: Flagstone Courtyard Floor & Pavement
    this.renderCourtyardFloor(ctx, s);

    // 5. Ambient Petals / Floating cyan embers
    this.renderAtmosphere(ctx, s);

    ctx.restore();
  }

  renderFarMountains(ctx, s) {
    ctx.save();
    // Far mountain silhouettes
    ctx.fillStyle = s > 0.5 ? '#060912' : '#1e293b';
    ctx.beginPath();
    ctx.moveTo(0, 480);
    ctx.lineTo(240, 310);
    ctx.lineTo(460, 420);
    ctx.lineTo(720, 280);
    ctx.lineTo(1020, 390);
    ctx.lineTo(1280, 330);
    ctx.lineTo(1280, 580);
    ctx.lineTo(0, 580);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderTempleRuins(ctx, s) {
    ctx.save();

    // Central Ancient Martial Master Statue (Shadow Fight 3 style!)
    const statueColor = s > 0.5 ? '#0c121e' : '#334155';
    const statueHighlight = s > 0.5 ? 'rgba(0, 240, 255, 0.2)' : 'rgba(148, 163, 184, 0.3)';

    // Statue plinth
    ctx.fillStyle = statueColor;
    ctx.fillRect(570, 260, 140, 320);

    // Carved statue silhouette (Monk / Warrior meditating)
    ctx.beginPath();
    // Torso & head
    ctx.arc(640, 230, 26, 0, Math.PI * 2);
    // Shoulders & robes
    ctx.moveTo(600, 280);
    ctx.lineTo(680, 280);
    ctx.lineTo(690, 380);
    ctx.lineTo(590, 380);
    ctx.closePath();
    ctx.fill();

    // Stone Archway Pillars
    const pillarColor = s > 0.5 ? '#080d16' : '#273444';
    
    // Left Temple Pillar
    ctx.fillStyle = pillarColor;
    ctx.fillRect(160, 160, 55, 420);
    ctx.fillRect(145, 145, 85, 22); // Capital
    ctx.fillRect(145, 560, 85, 20); // Base

    // Right Temple Pillar
    ctx.fillRect(1065, 160, 55, 420);
    ctx.fillRect(1050, 145, 85, 22);
    ctx.fillRect(1050, 560, 85, 20);

    // Arch overhead beam
    ctx.fillRect(140, 140, 1000, 28);

    // Overgrown Ivy / Moss clinging to pillars
    if (s < 0.8) {
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(170, 220, 14, 0, Math.PI * 2);
      ctx.arc(190, 260, 18, 0, Math.PI * 2);
      ctx.arc(180, 340, 16, 0, Math.PI * 2);
      ctx.arc(1085, 250, 16, 0, Math.PI * 2);
      ctx.arc(1100, 310, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stone Lanterns
    ctx.fillStyle = pillarColor;
    ctx.fillRect(320, 480, 25, 100);
    ctx.fillRect(305, 460, 55, 22);
    // Glowing lantern interior
    ctx.fillStyle = s > 0.5 ? '#00f0ff' : '#f59e0b';
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 12;
    ctx.fillRect(315, 465, 35, 14);

    ctx.restore();
  }

  renderCourtyardFloor(ctx, s) {
    ctx.save();
    
    // Base Ground
    ctx.fillStyle = s > 0.5 ? '#060a10' : '#1e2530';
    ctx.fillRect(0, 580, 1280, 140);

    // Flagstone pavement pattern
    ctx.strokeStyle = s > 0.5 ? 'rgba(0, 240, 255, 0.15)' : 'rgba(71, 85, 105, 0.4)';
    ctx.lineWidth = 1.5;

    for (let y = 580; y <= 720; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1280, y);
      ctx.stroke();

      const offsetX = ((y - 580) / 28) % 2 === 0 ? 0 : 45;
      for (let x = offsetX; x <= 1280; x += 90) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 28);
        ctx.stroke();
      }
    }

    // Pavement water puddle reflections
    ctx.fillStyle = s > 0.5 ? 'rgba(0, 240, 255, 0.12)' : 'rgba(56, 189, 248, 0.12)';
    ctx.beginPath();
    ctx.ellipse(640, 630, 140, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderAtmosphere(ctx, s) {
    ctx.save();

    if (s > 0.3) {
      // Shadow Mode: Floating mystical cyan embers and void fog
      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      for (let i = 0; i < 25; i++) {
        const x = (i * 57 + this.ambientTime * 45) % 1280;
        const y = 580 - ((i * 31 + this.ambientTime * 35) % 450);
        const radius = 1.5 + Math.sin(i + this.ambientTime) * 1;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.5, radius), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Normal Mode: Floating cherry blossom petals
      for (const p of this.petals) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = '#f472b6'; // Blossom pink
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }
}

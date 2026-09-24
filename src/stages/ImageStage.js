/**
 * ImageStage
 * Renders AI-generated arena artwork behind the fighters, with:
 * - Per-round arena rotation (random first pick, then alternating)
 * - Cover-fit drawing so any viewport aspect ratio is filled
 * - Ambient particles per arena (rain for Neon Alley, drifting leaves for Cliff Dojo)
 * - Shadow Mode transformation: darkens the arena and rains cyan embers
 */

const ARENAS = [
  { name: 'Shadow Realm Void', src: 'arenas/void.jpg', particle: 'embers', color: '#22d3ee' },
  { name: 'Neon Rooftop Rain', src: 'arenas/rooftop.jpg', particle: 'rain', color: '#22d3ee' },
  { name: 'Ember Forge Hall', src: 'arenas/forge.jpg', particle: 'embers', color: '#fb923c' },
  { name: 'Sky Palace Ruins', src: 'arenas/skyruins.jpg', particle: 'embers', color: '#a78bfa' },
  { name: 'Holo Tournament Ring', src: 'arenas/holo.jpg', particle: 'embers', color: '#67e8f9' },
  { name: 'Desert Fortress Dusk', src: 'arenas/desert.jpg', particle: 'leaves', color: '#fbbf24' },
];

export class ImageStage {
  constructor() {
    this.arenaIndex = Math.floor(Math.random() * ARENAS.length);
    this.images = [];
    this.blur = [];
    this.ambientTime = 0;
    this.shadowTransition = 0; // 0 = full normal, 1 = full shadow realm

    // Preload all arena artwork
    ARENAS.forEach((a, i) => {
      const img = new Image();
      img.src = `${import.meta.env.BASE_URL}${a.src}`;
      img.onload = () => {
        this.images[i] = img;
        // Tiny offscreen copy — upscaling it later yields a free soft blur for
        // the full-bleed backdrop, so every screen edge shows arena art.
        try {
          const t = document.createElement('canvas');
          if (t.getContext) {
            t.width = 96;
            t.height = 54;
            t.getContext('2d').drawImage(img, 0, 0, 96, 54);
            this.blur[i] = t;
          }
        } catch (e) { /* headless envs: backdrop falls back to sharp art */ }
      };
    });

    // Rain streaks (Neon Alley)
    this.rain = [];
    for (let i = 0; i < 90; i++) {
      this.rain.push({
        x: Math.random() * 1400 - 60,
        y: Math.random() * 720,
        len: 18 + Math.random() * 22,
        speed: 620 + Math.random() * 320,
        alpha: 0.12 + Math.random() * 0.18,
      });
    }

    // Drifting leaves (warm dust in the desert arena)
    this.leaves = [];
    for (let i = 0; i < 30; i++) {
      this.leaves.push({
        x: Math.random() * 1400 - 60,
        y: Math.random() * 720,
        vx: 24 + Math.random() * 36,
        vy: 16 + Math.random() * 26,
        size: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() * 2 - 1) * 2,
        alpha: 0.55 + Math.random() * 0.4,
        hue: 12 + Math.random() * 26, // crimson-to-orange maple tones
      });
    }

    // Rising themed embers (void / forge / sky ruins / holo ring)
    this.embers = [];
    for (let i = 0; i < 40; i++) {
      this.embers.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        r: 1 + Math.random() * 2.2,
        vy: 26 + Math.random() * 44,
        a: 0.3 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  get arena() {
    return ARENAS[this.arenaIndex];
  }

  /** Advance to the next arena (called at the start of each round). */
  advance() {
    if (ARENAS.length < 2) return;
    this.arenaIndex = (this.arenaIndex + 1) % ARENAS.length;
  }

  update(dt, isAnyShadowActive) {
    this.ambientTime += dt;

    // Smooth transition towards shadow realm
    const targetShadow = isAnyShadowActive ? 1.0 : 0.0;
    this.shadowTransition += (targetShadow - this.shadowTransition) * (4.0 * dt);

    // Rain
    for (const r of this.rain) {
      r.y += r.speed * dt;
      r.x -= r.speed * 0.12 * dt;
      if (r.y > 740) {
        r.y = -r.len - Math.random() * 40;
        r.x = Math.random() * 1450 - 60;
      }
    }

    // Leaves
    for (const p of this.leaves) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.rotSpeed * dt;
      if (p.y > 730 || p.x > 1350) {
        p.x = Math.random() * 100 - 150;
        p.y = Math.random() * 400 - 50;
      }
    }

    // Embers rise and wrap
    for (const e of this.embers) {
      e.y -= e.vy * dt;
      if (e.y < -12) {
        e.y = 732;
        e.x = Math.random() * 1280;
      }
    }
  }

  render(ctx) {
    const s = this.shadowTransition;
    const img = this.images[this.arenaIndex];

    // Full-bleed backdrop: paint EVERY device pixel (including letterbox
    // bands on tall/wide screens) with a softly blurred, brightened copy of
    // the arena art — the play frame melts into scenery; no black, ever.
    const cc = ctx.canvas;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const soft = this.blur[this.arenaIndex];
    if (soft) {
      const sc = Math.max(cc.width / soft.width, cc.height / soft.height);
      const dw = soft.width * sc, dh = soft.height * sc;
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(soft, (cc.width - dw) / 2, (cc.height - dh) / 2, dw, dh);
      ctx.fillStyle = 'rgba(5, 7, 10, 0.25)';
      ctx.fillRect(0, 0, cc.width, cc.height);
    } else if (img && img.naturalWidth) {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const sc = Math.max(cc.width / iw, cc.height / ih);
      const dw = iw * sc, dh = ih * sc;
      ctx.drawImage(img, (cc.width - dw) / 2, (cc.height - dh) / 2, dw, dh);
      ctx.fillStyle = 'rgba(5, 7, 10, 0.25)';
      ctx.fillRect(0, 0, cc.width, cc.height);
    }
    ctx.restore();

    // Cover-fit the world art to whatever the current viewport is (same calm
    // framing as the original stage: the full painting, no camera punch-in).
    // The artwork is AI-outpainted wider than 16:9, so beyond the world frame
    // there is real painted scenery on both sides — when the camera pans, the
    // extended sides fill the view instead of showing black.
    const c = ctx.canvas;
    const m = ctx.getTransform();
    const unitPx = Math.hypot(m.a, m.b);
    const scaleX = (c.width / 1280) / unitPx;
    const scaleY = (c.height / 720) / unitPx;

    ctx.save();
    ctx.scale(scaleX, scaleY);

    if (img) {
      // Map the painting's central 16:9 slice to the world frame (0..1280)
      // and let the outpainted sides spill past it, world-anchored.
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const totalWorldW = 720 * (iw / ih);
      const marginX = (totalWorldW - 1280) / 2;
      ctx.drawImage(img, -marginX, 0, totalWorldW, 720);
    } else {
      // Fallback while the artwork streams in
      const grad = ctx.createLinearGradient(0, 0, 0, 720);
      grad.addColorStop(0, '#111827');
      grad.addColorStop(1, '#030507');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);
    }

    // Ambient particles for this arena (dimmed during Shadow Mode)
    const normalAlpha = Math.max(0, 1 - s * 1.4);
    if (normalAlpha > 0.02) {
      ctx.save();
      ctx.globalAlpha = normalAlpha;
      if (this.arena.particle === 'rain') this.renderRain(ctx);
      else if (this.arena.particle === 'embers') this.renderEmbers(ctx);
      else this.renderLeaves(ctx);
      ctx.restore();
    }

    // Shadow Realm transformation overlay (covers the extended art too)
    if (s > 0.01) {
      ctx.save();
      ctx.globalAlpha = s;
      const shadowSky = ctx.createLinearGradient(0, 0, 0, 720);
      shadowSky.addColorStop(0, 'rgba(2, 4, 8, 0.92)');
      shadowSky.addColorStop(0.5, 'rgba(5, 10, 20, 0.88)');
      shadowSky.addColorStop(1, 'rgba(2, 3, 5, 0.92)');
      ctx.fillStyle = shadowSky;
      ctx.fillRect(-400, 0, 2080, 720);
      ctx.restore();
    }

    // Cyan embers while consumed by the Shadow Realm
    if (s > 0.3) {
      ctx.save();
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
      ctx.restore();
    }

    ctx.restore();
  }

  renderRain(ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    ctx.strokeStyle = '#a5c8e8';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    for (const r of this.rain) {
      ctx.save();
      ctx.globalAlpha = r.alpha;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - r.len * 0.12, r.y + r.len);
      ctx.stroke();
      ctx.restore();
    }
  }

  renderEmbers(ctx) {
    const col = this.arena.color || '#22d3ee';
    ctx.save();
    ctx.fillStyle = col;
    for (const e of this.embers) {
      ctx.save();
      ctx.globalAlpha = e.a * (0.55 + 0.45 * Math.sin(this.ambientTime * 2 + e.phase));
      ctx.beginPath();
      ctx.arc(e.x + Math.sin(this.ambientTime * 0.8 + e.phase) * 9, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  renderLeaves(ctx) {
    for (const p of this.leaves) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = `hsl(${p.hue} 72% 52%)`;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

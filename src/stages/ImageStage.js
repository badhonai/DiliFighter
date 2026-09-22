/**
 * ImageStage
 * Renders AI-generated arena artwork behind the fighters, with:
 * - Per-round arena rotation (random first pick, then alternating)
 * - Cover-fit drawing so any viewport aspect ratio is filled
 * - Ambient particles per arena (rain for Neon Alley, drifting leaves for Cliff Dojo)
 * - Shadow Mode transformation: darkens the arena and rains cyan embers
 */

const ARENAS = [
  {
    name: 'Neon Rain Alley',
    src: 'arenas/neon.jpg',
    particle: 'rain',
  },
  {
    name: 'Sunrise Cliff Dojo',
    src: 'arenas/cliff.jpg',
    particle: 'leaves',
  },
];

export class ImageStage {
  constructor() {
    this.arenaIndex = Math.floor(Math.random() * ARENAS.length);
    this.images = [];
    this.ambientTime = 0;
    this.shadowTransition = 0; // 0 = full normal, 1 = full shadow realm

    // Preload all arena artwork
    ARENAS.forEach((a, i) => {
      const img = new Image();
      img.src = `${import.meta.env.BASE_URL}${a.src}`;
      img.onload = () => { this.images[i] = img; };
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

    // Drifting leaves (Cliff Dojo)
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
  }

  render(ctx) {
    const s = this.shadowTransition;
    const img = this.images[this.arenaIndex];

    // The camera pans and zooms past the authored 1280×720 world frame, so
    // instead of pinning the art to the world we fit it to the world rect the
    // camera is *currently seeing* — the arena fills the view edge to edge on
    // any device aspect or zoom level, never showing black borders. A slight
    // parallax keeps it alive: the art drifts against camera pan and punches
    // in gently when the camera zooms.
    const c = ctx.canvas;
    const m = ctx.getTransform();
    const x0 = -m.e / m.a;
    const y0 = -m.f / m.d;
    const x1 = (c.width - m.e) / m.a;
    const y1 = (c.height - m.f) / m.d;
    const rectW = x1 - x0;
    const rectH = y1 - y0;

    ctx.save();

    if (img && m.a > 0 && m.d > 0) {
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      const rectAspect = rectW / rectH;

      // Largest source crop matching the visible rect's aspect ratio
      let cropW = iw;
      let cropH = cropW / rectAspect;
      if (cropH > ih) { cropH = ih; cropW = cropH * rectAspect; }

      // Punch in with the camera (clamped so the art never over-zooms)
      const zoomF = Math.min(1, Math.max(0.82, rectW / 1280));
      cropW *= zoomF;
      cropH *= zoomF;

      // Parallax drift against camera pan, clamped inside the artwork
      const parallax = 0.4;
      const rectCX = (x0 + x1) / 2;
      const pCX = iw / 2 + (rectCX - 640) * parallax * (iw / 1280);
      const sx = Math.max(0, Math.min(iw - cropW, pCX - cropW / 2));

      // Vertically anchor the artwork's painted floor (bottom ~20% of the art)
      // to the gameplay ground line so fighters' feet always match the floor,
      // whatever the viewport aspect ratio does to the visible slice.
      const FLOOR_FRACTION = 0.8; // painted floor position in the source art
      const groundViewY = (580 - y0) / rectH; // gameplay ground in view coords
      const sy = Math.max(0, Math.min(ih - cropH, ih * FLOOR_FRACTION - cropH * groundViewY));

      ctx.drawImage(img, sx, sy, cropW, cropH, x0, y0, rectW, rectH);
    } else {
      // Fallback while the artwork streams in
      const grad = ctx.createLinearGradient(0, y0, 0, y1);
      grad.addColorStop(0, '#111827');
      grad.addColorStop(1, '#030507');
      ctx.fillStyle = grad;
      ctx.fillRect(x0, y0, rectW, rectH);
    }

    // Ambient particles for this arena (dimmed during Shadow Mode)
    const normalAlpha = Math.max(0, 1 - s * 1.4);
    if (normalAlpha > 0.02) {
      ctx.save();
      ctx.globalAlpha = normalAlpha;
      if (this.arena.particle === 'rain') this.renderRain(ctx);
      else this.renderLeaves(ctx);
      ctx.restore();
    }

    // Shadow Realm transformation overlay (covers the whole visible view)
    if (s > 0.01) {
      ctx.save();
      ctx.globalAlpha = s;
      const shadowSky = ctx.createLinearGradient(0, y0, 0, y1);
      shadowSky.addColorStop(0, 'rgba(2, 4, 8, 0.92)');
      shadowSky.addColorStop(0.5, 'rgba(5, 10, 20, 0.88)');
      shadowSky.addColorStop(1, 'rgba(2, 3, 5, 0.92)');
      ctx.fillStyle = shadowSky;
      ctx.fillRect(x0, y0, rectW, rectH);
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

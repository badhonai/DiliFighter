/**
 * VSSplash — fighting-game character-select intro shown during the ROUND
 * intro. Slides both fighters' generated portraits in around a popping "VS".
 */
export class VSSplash {
  constructor(len = 2.2) {
    this.len = len;
    this.imgs = {
      dili: this.load('characters/dili_portrait.jpg'),
      tsunami: this.load('characters/tsunami_portrait.jpg'),
    };
  }

  load(p) {
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}${p}`;
    return img;
  }

  static easeOutCubic(u) { return 1 - Math.pow(1 - u, 3); }
  static easeOutBack(u) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  }

  static rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  static cover(ctx, img, x, y, w, h) {
    if (!img || !img.complete || !img.naturalWidth) return false;
    const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    return true;
  }

  card(ctx, img, x, y, w, h, edge, name, subtitle, subColor) {
    // Panel
    ctx.fillStyle = 'rgba(8, 12, 22, 0.94)';
    VSSplash.rr(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Portrait (clipped, cover-fit)
    ctx.save();
    VSSplash.rr(ctx, x + 8, y + 8, w - 16, h - 96, 10);
    ctx.clip();
    if (!VSSplash.cover(ctx, img, x + 8, y + 8, w - 16, h - 96)) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
      ctx.fillRect(x + 8, y + 8, w - 16, h - 96);
    }
    ctx.restore();

    // Name band
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '800 42px "Rajdhani", system-ui, sans-serif';
    ctx.fillText(name, x + 20, y + h - 52);
    ctx.fillStyle = subColor;
    ctx.font = '600 16px "Rajdhani", system-ui, sans-serif';
    ctx.fillText(subtitle, x + 20, y + h - 26);
  }

  /** t = seconds since the intro began. */
  render(ctx, t) {
    const len = this.len;
    const alpha = Math.max(0, Math.min(1, t / 0.25, (len - t) / 0.35)) * 0.68;
    if (alpha <= 0.01) return;

    ctx.save();

    // Dim the arena behind the cards
    ctx.fillStyle = `rgba(3, 6, 12, ${alpha.toFixed(3)})`;
    ctx.fillRect(0, 0, 1280, 720);

    const e = VSSplash.easeOutCubic(Math.min(1, t / 0.55));
    const w = 310, h = 440, y = 140;
    const leftX = -430 + (170 + 430) * e;
    const rightX = 1390 + (800 - 1390) * e;

    ctx.globalAlpha = Math.min(1, alpha / 0.68 + 0.2);

    this.card(ctx, this.imgs.dili, leftX, y, w, h, 'rgba(34, 211, 238, 0.85)',
      'DILI', 'THE BUBBLE-HELMET HERO', '#67e8f9');
    this.card(ctx, this.imgs.tsunami, rightX, y, w, h, 'rgba(220, 38, 38, 0.85)',
      'TSUNAMI', 'CRIMSON STORM SAMURAI', '#fbbf24');

    // Popping VS
    const vu = Math.max(0, Math.min(1, (t - 0.4) / 0.4));
    if (vu > 0) {
      const s = VSSplash.easeOutBack(vu);
      ctx.save();
      ctx.translate(640, 360);
      ctx.scale(s, s);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 30;
      ctx.fillStyle = '#f59e0b';
      ctx.font = '900 110px "Rajdhani", system-ui, sans-serif';
      ctx.fillText('VS', 0, 0);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(5, 8, 14, 0.9)';
      ctx.lineWidth = 4;
      ctx.strokeText('VS', 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }
}

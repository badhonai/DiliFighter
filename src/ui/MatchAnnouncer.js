export class MatchAnnouncer {
  constructor() {
    this.currentText = '';
    this.subText = '';
    this.timer = 0;
    this.maxDuration = 0;
    this.color = '#ffffff';
    this.scale = 1.0;
  }

  announce(text, subText = '', duration = 2.0, color = '#ffffff') {
    this.currentText = text;
    this.subText = subText;
    this.timer = duration;
    this.maxDuration = duration;
    this.color = color;
  }

  showShadowBanner() {
    this.announce('UNLEASH SHADOW POWERS', 'THE SHADOW REALM CONSUMES ALL', 2.2, '#00f0ff');
  }

  update(dt) {
    if (this.timer > 0) {
      this.timer -= dt;
      const progress = 1 - this.timer / this.maxDuration;
      // Punchy zoom-in then slow drift
      if (progress < 0.2) {
        this.scale = 0.5 + (progress / 0.2) * 0.6;
      } else {
        this.scale = 1.1 - (progress - 0.2) * 0.12;
      }
    }
  }

  render(ctx) {
    if (this.timer <= 0) return;

    const progress = 1 - this.timer / this.maxDuration;
    let alpha = 1.0;
    if (progress > 0.8) {
      alpha = Math.max(0, (1 - progress) / 0.2);
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(640, 280);
    ctx.scale(this.scale, this.scale);

    // Glow shadow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 25;

    // Main Announcement Text
    ctx.font = '900 52px "Cinzel", serif';
    ctx.fillStyle = this.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentText, 0, 0);

    // Subtitle Text
    if (this.subText) {
      ctx.font = '700 18px "Rajdhani", sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.shadowBlur = 10;
      ctx.fillText(this.subText, 0, 48);
    }

    ctx.restore();
  }
}

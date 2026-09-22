import { GAME_CONFIG } from '../config.js';

export class HUD {
  constructor() {
    this.p1TrailingHealth = GAME_CONFIG.MATCH.MAX_HEALTH;
    this.p2TrailingHealth = GAME_CONFIG.MATCH.MAX_HEALTH;
    this.comboDisplay = { p1: { count: 0, timer: 0 }, p2: { count: 0, timer: 0 } };
  }

  showCombo(playerNum, count) {
    if (playerNum === 1) {
      this.comboDisplay.p1 = { count, timer: 1.5 };
    } else {
      this.comboDisplay.p2 = { count, timer: 1.5 };
    }
  }

  update(dt, p1, p2) {
    // Smoothly decay trailing health bars
    if (this.p1TrailingHealth > p1.health) {
      this.p1TrailingHealth -= (this.p1TrailingHealth - p1.health) * 4 * dt;
    } else {
      this.p1TrailingHealth = p1.health;
    }

    if (this.p2TrailingHealth > p2.health) {
      this.p2TrailingHealth -= (this.p2TrailingHealth - p2.health) * 4 * dt;
    } else {
      this.p2TrailingHealth = p2.health;
    }

    // Combo timers
    if (this.comboDisplay.p1.timer > 0) this.comboDisplay.p1.timer -= dt;
    if (this.comboDisplay.p2.timer > 0) this.comboDisplay.p2.timer -= dt;
  }

  render(ctx, p1, p2, matchTimer, roundNum) {
    const w = GAME_CONFIG.WORLD_WIDTH;

    ctx.save();

    // 1. Center Timer Display
    this.renderTimer(ctx, w / 2, 45, Math.ceil(matchTimer), roundNum);

    // 2. Player 1 (Left) Bars: Name, Health, Shadow Energy
    this.renderPlayerHUD(ctx, 60, 40, p1, this.p1TrailingHealth, false);

    // 3. Player 2 (Right) Bars: Name, Health, Shadow Energy
    this.renderPlayerHUD(ctx, w - 60, 40, p2, this.p2TrailingHealth, true);

    // 4. Hit Combo Popups
    this.renderCombos(ctx, w);

    ctx.restore();
  }

  renderTimer(ctx, centerX, y, time, roundNum) {
    // Hexagonal / Ornate Timer Frame
    ctx.save();
    ctx.fillStyle = 'rgba(10, 15, 25, 0.85)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(centerX - 35, y - 25);
    ctx.lineTo(centerX + 35, y - 25);
    ctx.lineTo(centerX + 45, y + 15);
    ctx.lineTo(centerX - 45, y + 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Time digits
    ctx.font = '900 28px "Cinzel", serif';
    ctx.fillStyle = time <= 10 ? '#ef4444' : '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = time <= 10 ? '#ef4444' : '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.fillText(time.toString(), centerX, y - 5);

    // Round Indicator Badge
    ctx.font = '700 11px "Rajdhani", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.shadowBlur = 0;
    ctx.fillText(`ROUND ${roundNum}`, centerX, y + 26);

    ctx.restore();
  }

  renderPlayerHUD(ctx, anchorX, y, fighter, trailingHealth, isReversed) {
    const barWidth = 440;
    const barHeight = 16;
    const maxHp = fighter.maxHealth;
    const hpRatio = Math.max(0, fighter.health / maxHp);
    const trailingRatio = Math.max(0, trailingHealth / maxHp);

    ctx.save();

    // Faction Crest / Avatar Emblem
    const crestX = isReversed ? anchorX - 25 : anchorX + 25;
    this.renderCrest(ctx, isReversed ? anchorX : anchorX - 50, y + 10, isReversed);

    // Fighter Name
    ctx.font = '800 18px "Cinzel", serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.textAlign = isReversed ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 4;
    const nameX = isReversed ? anchorX - 55 : anchorX + 5;
    ctx.fillText(fighter.name, nameX, y - 6);

    // Rounds Won Gems
    for (let r = 0; r < 2; r++) {
      const gemX = isReversed ? nameX - 120 - r * 18 : nameX + 110 + r * 18;
      ctx.fillStyle = r < fighter.roundsWon ? '#eab308' : '#334155';
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(gemX, y - 12, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Health Bar Frame Background
    const startX = isReversed ? anchorX - 55 - barWidth : anchorX + 5;
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(startX, y, barWidth, barHeight);
    ctx.fill();
    ctx.stroke();

    // Trailing Damage Bar (Red)
    ctx.fillStyle = '#dc2626';
    if (isReversed) {
      const trailWidth = barWidth * trailingRatio;
      ctx.fillRect(startX + barWidth - trailWidth, y + 1, trailWidth, barHeight - 2);
    } else {
      ctx.fillRect(startX, y + 1, barWidth * trailingRatio, barHeight - 2);
    }

    // Main Current Health Bar (Gold / Orange)
    const hpGrad = ctx.createLinearGradient(startX, y, startX + barWidth, y);
    hpGrad.addColorStop(0, '#f59e0b');
    hpGrad.addColorStop(0.5, '#fbbf24');
    hpGrad.addColorStop(1, '#ea580c');
    ctx.fillStyle = hpGrad;

    if (isReversed) {
      const currentWidth = barWidth * hpRatio;
      ctx.fillRect(startX + barWidth - currentWidth, y + 1, currentWidth, barHeight - 2);
    } else {
      ctx.fillRect(startX, y + 1, barWidth * hpRatio, barHeight - 2);
    }

    // Shadow Energy Meter (Directly under health bar)
    const shadowY = y + barHeight + 4;
    const shadowHeight = 7;
    const shadowRatio = Math.max(0, Math.min(1, fighter.shadowSystem.energy / fighter.shadowSystem.maxEnergy));
    const isShadowFull = fighter.shadowSystem.isReady();
    const isShadowActive = fighter.shadowSystem.isActive;

    // Shadow bar background
    ctx.fillStyle = '#020617';
    ctx.fillRect(startX, shadowY, barWidth, shadowHeight);

    // Shadow bar fill (Cyan)
    if (shadowRatio > 0) {
      ctx.fillStyle = isShadowActive ? '#38bdf8' : '#00f0ff';
      if (isShadowFull) {
        // Pulsing glow when 100% full
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
      }
      if (isReversed) {
        const sWidth = barWidth * shadowRatio;
        ctx.fillRect(startX + barWidth - sWidth, shadowY, sWidth, shadowHeight);
      } else {
        ctx.fillRect(startX, shadowY, barWidth * shadowRatio, shadowHeight);
      }
    }

    ctx.restore();
  }

  renderCrest(ctx, x, y, isOpponent) {
    ctx.save();
    ctx.translate(x, y);

    // Outer diamond frame
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = isOpponent ? '#ef4444' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(22, 0);
    ctx.lineTo(0, 22);
    ctx.lineTo(-22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner Emblem (Blades / Crest)
    ctx.fillStyle = isOpponent ? '#fca5a5' : '#7dd3fc';
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(4, -14);
      ctx.lineTo(0, -18);
      ctx.lineTo(-4, -14);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  renderCombos(ctx, w) {
    // Player 1 Combo
    if (this.comboDisplay.p1.timer > 0 && this.comboDisplay.p1.count > 1) {
      ctx.save();
      ctx.font = '900 36px "Cinzel", serif';
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 15;
      ctx.textAlign = 'left';
      ctx.fillText(`${this.comboDisplay.p1.count} HITS!`, 90, 160);
      ctx.restore();
    }

    // Player 2 Combo
    if (this.comboDisplay.p2.timer > 0 && this.comboDisplay.p2.count > 1) {
      ctx.save();
      ctx.font = '900 36px "Cinzel", serif';
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 15;
      ctx.textAlign = 'right';
      ctx.fillText(`${this.comboDisplay.p2.count} HITS!`, w - 90, 160);
      ctx.restore();
    }
  }
}

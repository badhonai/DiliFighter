import { GAME_CONFIG } from '../config.js';

/**
 * HUD — name plates, health bars, shadow meters, timer, round pips, combos.
 *
 * Design language: "dark glass + neon accent" so every element stays legible
 * over BOTH arenas (dark cool Neon Rain Alley and bright warm Cliff Dojo) and
 * during Shadow Mode. Both sides are perfectly mirrored around the center
 * timing medallion; bars end in chisel tips pointing at it.
 */

const P1_ACCENT = '#38bdf8';
const P1_GLOW = '#00f0ff';
const P2_ACCENT = '#f87171';
const P2_GLOW = '#ef4444';

export class HUD {
  constructor() {
    this.p1TrailingHealth = GAME_CONFIG.MATCH.MAX_HEALTH;
    this.p2TrailingHealth = GAME_CONFIG.MATCH.MAX_HEALTH;
    this.comboDisplay = { p1: { count: 0, timer: 0 }, p2: { count: 0, timer: 0 } };
    this.time = 0; // drives all pulsing / shimmer animations
    this.flashAlpha = 0; // heavy-hit screen flash

    // Static keyboard legend — desktop only (fine pointer, no touchscreen)
    this.showKeyHints = typeof window !== 'undefined'
      && window.matchMedia
      && window.matchMedia('(pointer: fine)').matches
      && !(navigator.maxTouchPoints > 0);
  }

  /** White flash overlay for heavy/K.O. impacts. */
  flash(strength) {
    this.flashAlpha = Math.max(this.flashAlpha, strength);
  }

  showCombo(playerNum, count) {
    if (playerNum === 1) {
      this.comboDisplay.p1 = { count, timer: 1.5 };
    } else {
      this.comboDisplay.p2 = { count, timer: 1.5 };
    }
  }

  update(dt, p1, p2) {
    this.time += dt;

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

    // Screen flash decays fast — quick punch of light, never a lingering strobe
    if (this.flashAlpha > 0) this.flashAlpha = Math.max(0, this.flashAlpha - 3.6 * dt);
  }

  render(ctx, p1, p2, matchTimer, roundNum) {
    const w = GAME_CONFIG.WORLD_WIDTH;

    ctx.save();

    // 1. Center Timer Medallion
    this.renderTimer(ctx, w / 2, Math.ceil(matchTimer), roundNum);

    // 2. Player 1 (Left) / Player 2 (Right) — mirrored around the medallion.
    // The left anchor keeps clear of the stacked top-left HTML buttons.
    this.renderPlayerHUD(ctx, 164, 40, p1, this.p1TrailingHealth, false);
    this.renderPlayerHUD(ctx, w - 164, 40, p2, this.p2TrailingHealth, true);

    // 3. Hit Combo Popups
    this.renderCombos(ctx);

    // 4. Desktop keyboard legend
    if (this.showKeyHints) this.renderKeyHints(ctx);

    // 5. Heavy-hit screen flash (above everything else)
    if (this.flashAlpha > 0.003) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha.toFixed(3)})`;
      ctx.fillRect(0, 0, w, GAME_CONFIG.WORLD_HEIGHT);
    }

    ctx.restore();
  }

  /** Dark glass helper: fills a path with glass styling + top highlight. */
  glassPanel(ctx, path, edgeColor) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = 'rgba(8, 12, 24, 0.8)';
    ctx.fill(path);
    ctx.restore();

    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke(path);

    ctx.save();
    ctx.clip(path);
    const hl = ctx.createLinearGradient(0, 0, 0, 60);
    hl.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    hl.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = hl;
    ctx.fillRect(0, 0, GAME_CONFIG.WORLD_WIDTH, 60);
    ctx.restore();
  }

  renderPlayerHUD(ctx, anchorX, y, fighter, trailingHealth, isReversed) {
    const dir = isReversed ? -1 : 1;
    const accent = isReversed ? P2_ACCENT : P1_ACCENT;
    const glow = isReversed ? P2_GLOW : P1_GLOW;

    // Mirrored geometry: crest center = anchor; bar 55px outward clear of it
    const barW = 340;
    const barH = 20;
    const tip = 8;
    const outerEdgeX = anchorX + dir * 55;   // 219 / 1061
    const innerEdgeX = outerEdgeX + dir * barW; // 559 / 721
    const tipX = innerEdgeX + dir * tip;        // 567 / 713
    const barLeft = Math.min(outerEdgeX, innerEdgeX);
    const midY = y + barH / 2;

    const maxHp = fighter.maxHealth;
    const hpRatio = Math.max(0, fighter.health / maxHp);
    const trailingRatio = Math.max(0, trailingHealth / maxHp);

    // Faction crest on the outer edge
    this.renderCrest(ctx, anchorX, y + 12, isReversed);

    // ---- Name Plate (angled glass chip above the bar) ----
    const plateY0 = y - 28; // 12
    const plateY1 = y - 5;  // 35
    const plateInnerTop = outerEdgeX + dir * 188;
    const plateInnerBottom = plateInnerTop - dir * 12;

    const platePath = new Path2D();
    platePath.moveTo(outerEdgeX, plateY0);
    platePath.lineTo(plateInnerTop, plateY0);
    platePath.lineTo(plateInnerBottom, plateY1);
    platePath.lineTo(outerEdgeX, plateY1);
    platePath.closePath();
    this.glassPanel(ctx, platePath, 'rgba(226, 232, 240, 0.22)');

    // Accent underline along the plate bottom, fading toward center
    const underGrad = ctx.createLinearGradient(outerEdgeX, 0, plateInnerBottom, 0);
    underGrad.addColorStop(0, accent);
    underGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.strokeStyle = underGrad;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(outerEdgeX, plateY1);
    ctx.lineTo(plateInnerBottom, plateY1);
    ctx.stroke();

    // Fighter name
    ctx.font = '800 17px "Cinzel", serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = isReversed ? 'right' : 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = glow;
    ctx.shadowBlur = 5;
    const nameX = isReversed ? outerEdgeX - 10 : outerEdgeX + 10;
    ctx.fillText(fighter.name, nameX, plateY1 - 6);
    ctx.shadowBlur = 0;

    // Round pips (best of 3): angled diamonds at the plate's inner end
    for (let r = 0; r < 2; r++) {
      const pipX = plateInnerTop - dir * (26 + r * 20);
      const pipY = (plateY0 + plateY1) / 2;
      const won = r < fighter.roundsWon;
      ctx.save();
      ctx.translate(pipX, pipY);
      ctx.fillStyle = won ? '#facc15' : 'rgba(148, 163, 184, 0.15)';
      ctx.strokeStyle = won ? '#fef08a' : 'rgba(148, 163, 184, 0.5)';
      if (won) {
        ctx.shadowColor = '#fde047';
        ctx.shadowBlur = 8;
      }
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // ---- Health Bar (chisel tip toward the timer) ----
    const barPath = new Path2D();
    barPath.moveTo(outerEdgeX, y);
    barPath.lineTo(innerEdgeX, y);
    barPath.lineTo(tipX, midY);
    barPath.lineTo(innerEdgeX, y + barH);
    barPath.lineTo(outerEdgeX, y + barH);
    barPath.closePath();

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
    ctx.fill(barPath);
    ctx.restore();

    // Clipped layers: trailing damage -> current health -> sheen -> ticks
    ctx.save();
    ctx.clip(barPath);

    // Trailing damage (recently lost health draining behind)
    if (trailingRatio > hpRatio) {
      const tw = barW * Math.min(1, trailingRatio);
      const tx = isReversed ? outerEdgeX - tw : outerEdgeX;
      const trailGrad = ctx.createLinearGradient(tx, 0, tx + tw, 0);
      trailGrad.addColorStop(0, '#f97316');
      trailGrad.addColorStop(1, '#dc2626');
      ctx.fillStyle = trailGrad;
      ctx.fillRect(tx, y, tw, barH);
    }

    // Current health (gold gradient, vertical)
    if (hpRatio > 0) {
      const hw = barW * hpRatio;
      const hx = isReversed ? outerEdgeX - hw : outerEdgeX;
      const hpGrad = ctx.createLinearGradient(0, y, 0, y + barH);
      hpGrad.addColorStop(0, '#fef08a');
      hpGrad.addColorStop(0.35, '#fbbf24');
      hpGrad.addColorStop(1, '#d97706');
      ctx.fillStyle = hpGrad;
      ctx.fillRect(hx, y, hw, barH);

      // Low-health warning pulse
      if (hpRatio <= 0.25) {
        const pulse = 0.22 + 0.16 * Math.sin(this.time * 7);
        ctx.fillStyle = `rgba(239, 68, 68, ${pulse.toFixed(3)})`;
        ctx.fillRect(hx, y, hw, barH);
      }
    }

    // Glass sheen across the top half
    const sheen = ctx.createLinearGradient(0, y, 0, y + barH);
    sheen.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
    sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
    sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(barLeft, y, barW + tip, barH);

    // Segment ticks every 10% of health
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const sx = barLeft + (barW * i) / 10;
      ctx.beginPath();
      ctx.moveTo(sx, y + 1);
      ctx.lineTo(sx, y + barH - 1);
      ctx.stroke();
    }
    ctx.restore();

    // Frame stroke + neon accent edge on the crest side
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke(barPath);
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 6;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(outerEdgeX, y + 1);
    ctx.lineTo(outerEdgeX, y + barH - 1);
    ctx.stroke();
    ctx.restore();

    // Hairline connecting the bar tip toward the timer medallion
    const connGrad = ctx.createLinearGradient(tipX, 0, tipX + dir * 33, 0);
    connGrad.addColorStop(0, 'rgba(226, 232, 240, 0.45)');
    connGrad.addColorStop(1, 'rgba(226, 232, 240, 0)');
    ctx.strokeStyle = connGrad;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tipX, midY);
    ctx.lineTo(tipX + dir * 33, midY);
    ctx.stroke();

    // ---- Shadow Energy Meter (segmented, under the health bar) ----
    const shadowY = y + barH + 4;
    const shadowH = 9;
    const ss = fighter.shadowSystem;
    const shadowRatio = Math.max(0, Math.min(1, ss.energy / ss.maxEnergy));
    const isReady = ss.isReady();
    const isShadowActive = ss.isActive;

    // Meter background
    ctx.beginPath();
    ctx.rect(barLeft, shadowY, barW, shadowH);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fill();

    // Segmented fill
    if (shadowRatio > 0) {
      const fw = barW * shadowRatio;
      const fx = isReversed ? outerEdgeX - fw : outerEdgeX;
      ctx.save();
      ctx.beginPath();
      ctx.rect(barLeft, shadowY, barW, shadowH);
      ctx.clip();

      const mGrad = ctx.createLinearGradient(outerEdgeX, 0, innerEdgeX, 0);
      if (isShadowActive) {
        mGrad.addColorStop(0, '#e0f2fe');
        mGrad.addColorStop(1, '#7dd3fc');
      } else {
        mGrad.addColorStop(0, '#0ea5e9');
        mGrad.addColorStop(1, '#22d3ee');
      }
      ctx.fillStyle = mGrad;
      ctx.fillRect(fx, shadowY, fw, shadowH);

      // Traveling shine while shadow mode runs
      if (isShadowActive) {
        const shineX = barLeft + ((this.time * 420) % (barW + 80)) - 40;
        const sGrad = ctx.createLinearGradient(shineX - 20, 0, shineX + 20, 0);
        sGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        sGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
        sGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = sGrad;
        ctx.fillRect(shineX - 20, shadowY, 40, shadowH);
      }

      // Ready: pulsing white-hot core glow
      if (isReady && !isShadowActive) {
        const pulse = 0.25 + 0.2 * Math.sin(this.time * 6);
        ctx.fillStyle = `rgba(240, 249, 255, ${pulse.toFixed(3)})`;
        ctx.fillRect(fx, shadowY, fw, shadowH);
      }
      ctx.restore();
    }

    // Segment dividers + frame
    ctx.strokeStyle = 'rgba(2, 6, 23, 0.5)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const sx = barLeft + (barW * i) / 8;
      ctx.beginPath();
      ctx.moveTo(sx, shadowY);
      ctx.lineTo(sx, shadowY + shadowH);
      ctx.stroke();
    }
    ctx.save();
    if (isReady || isShadowActive) {
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = isShadowActive ? 14 : 8 + 5 * Math.sin(this.time * 6);
      ctx.strokeStyle = '#67e8f9';
    } else {
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.35)';
    }
    ctx.lineWidth = 1.3;
    ctx.strokeRect(barLeft, shadowY, barW, shadowH);
    ctx.restore();

    // Tiny label so first-time players know what the cyan bar is
    ctx.font = '700 10px "Rajdhani", sans-serif';
    ctx.fillStyle = 'rgba(165, 243, 252, 0.75)';
    ctx.textAlign = isReversed ? 'right' : 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('SHADOW', isReversed ? outerEdgeX : outerEdgeX + 2, shadowY + shadowH + 11);
  }

  renderTimer(ctx, centerX, time, roundNum) {
    const cy = 42;
    const r = 30;
    const h = r * Math.sin(Math.PI / 3);
    const critical = time <= 10;

    ctx.save();

    // Pulsing scale when the round is about to end
    if (critical) {
      const s = 1 + 0.05 * Math.sin(this.time * 10);
      ctx.translate(centerX, cy);
      ctx.scale(s, s);
      ctx.translate(-centerX, -cy);
    }

    // Flat-top hexagon medallion
    const hex = new Path2D();
    hex.moveTo(centerX + r, cy);
    hex.lineTo(centerX + r / 2, cy + h);
    hex.lineTo(centerX - r / 2, cy + h);
    hex.lineTo(centerX - r, cy);
    hex.lineTo(centerX - r / 2, cy - h);
    hex.lineTo(centerX + r / 2, cy - h);
    hex.closePath();

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = 'rgba(8, 12, 24, 0.85)';
    ctx.fill(hex);
    ctx.restore();

    // Outer neon stroke + inner hairline for a layered medallion feel
    ctx.save();
    ctx.strokeStyle = critical ? '#ef4444' : 'rgba(103, 232, 249, 0.75)';
    ctx.lineWidth = 2;
    ctx.shadowColor = critical ? '#ef4444' : '#00f0ff';
    ctx.shadowBlur = critical ? 14 : 8;
    ctx.stroke(hex);
    ctx.restore();

    ctx.save();
    ctx.translate(centerX, cy);
    ctx.scale(0.82, 0.82);
    ctx.translate(-centerX, -cy);
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.18)';
    ctx.lineWidth = 1;
    ctx.stroke(hex);
    ctx.restore();

    // Time digits
    ctx.font = '900 26px "Cinzel", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = critical ? '#fca5a5' : '#f8fafc';
    ctx.shadowColor = critical ? '#ef4444' : '#38bdf8';
    ctx.shadowBlur = critical ? 10 : 8;
    ctx.fillText(time.toString(), centerX, cy + 1);
    ctx.shadowBlur = 0;

    ctx.restore();

    // Round badge pill under the medallion
    ctx.save();
    const pillW = 74;
    const pillH = 16;
    const pillX = centerX - pillW / 2;
    const pillY = cy + h - 4;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fillStyle = 'rgba(8, 12, 24, 0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.font = '700 11px "Rajdhani", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`ROUND ${roundNum}`, centerX, pillY + pillH / 2 + 0.5);
    ctx.restore();
  }

  renderCrest(ctx, x, y, isOpponent) {
    const accent = isOpponent ? P2_ACCENT : P1_ACCENT;
    const glow = isOpponent ? P2_GLOW : P1_GLOW;

    ctx.save();
    ctx.translate(x, y);

    // Outer diamond frame with neon glow
    ctx.strokeStyle = accent;
    ctx.fillStyle = 'rgba(8, 12, 24, 0.85)';
    ctx.lineWidth = 2;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(24, 0);
    ctx.lineTo(0, 24);
    ctx.lineTo(-24, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner bevel diamond
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -17);
    ctx.lineTo(17, 0);
    ctx.lineTo(0, 17);
    ctx.lineTo(-17, 0);
    ctx.closePath();
    ctx.stroke();

    // Four-blade emblem
    ctx.fillStyle = isOpponent ? '#fecaca' : '#a5f3fc';
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(3.5, -5);
      ctx.lineTo(0, -2);
      ctx.lineTo(-3.5, -5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Center gem
    ctx.fillStyle = accent;
    ctx.shadowColor = glow;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /** Bottom-center keyboard legend (desktop only) — two rows of key chips. */
  renderKeyHints(ctx) {
    const rows = [
      [['A/D', 'MOVE'], ['W', 'JUMP'], ['S', 'CROUCH'], ['V or ;', 'BLOCK'], ['←← / →→', 'DASH']],
      [['J', 'PUNCH'], ['K', 'KICK'], ['I', 'HEAVY'], ['L', 'RANGED'], ['SPACE', 'SHADOW'], ['ESC', 'PAUSE']],
    ];
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    rows.forEach((row, ri) => {
      const y = 688 + ri * 19;
      // Measure the full row first so it can be centered
      ctx.font = '700 12px "Rajdhani", sans-serif';
      let total = 0;
      const parts = row.map(([key, label]) => {
        const kw = ctx.measureText(key).width + 14;    // chip padding
        const lw = ctx.measureText(' ' + label).width; // label after chip
        const item = { key, label, kw, lw };
        total += kw + lw + 16;
        return item;
      });
      total -= 16;

      // One translucent backing pill for the row
      const x0 = (GAME_CONFIG.WORLD_WIDTH - total) / 2;
      ctx.fillStyle = 'rgba(8, 12, 24, 0.62)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x0 - 8, y - 10, total + 16, 20, 5);
      else ctx.rect(x0 - 8, y - 10, total + 16, 20);
      ctx.fill();

      // Chips + labels
      let x = x0;
      for (const item of parts) {
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.strokeStyle = 'rgba(103, 232, 249, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y - 7.5, item.kw, 15, 3);
        else ctx.rect(x, y - 7.5, item.kw, 15);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#7dd3fc';
        ctx.textAlign = 'center';
        ctx.fillText(item.key, x + item.kw / 2, y + 0.5);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(' ' + item.label, x + item.kw, y + 0.5);
        x += item.kw + item.lw + 16;
      }
    });
    ctx.restore();
  }

  renderCombos(ctx) {
    const drawCombo = (count, timer, x, align, color) => {
      // Pop-in scale at the start of the popup, fade at the end
      const pop = Math.min(1, Math.max(0, (timer - 1.25) * 6));
      const scale = 1 + pop * 0.6;
      const alpha = Math.min(1, timer / 0.3);
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.translate(x, 150);
      ctx.scale(scale, scale);
      ctx.font = '900 34px "Cinzel", serif';
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.fillText(`${count} HITS!`, 0, 0);
      ctx.restore();
    };

    if (this.comboDisplay.p1.timer > 0 && this.comboDisplay.p1.count > 1) {
      drawCombo(this.comboDisplay.p1.count, this.comboDisplay.p1.timer, 224, 'left', '#fbbf24');
    }
    if (this.comboDisplay.p2.timer > 0 && this.comboDisplay.p2.count > 1) {
      drawCombo(this.comboDisplay.p2.count, this.comboDisplay.p2.timer, 1056, 'right', '#f87171');
    }
  }
}

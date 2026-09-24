/**
 * Tutorial — first-play guided walkthrough. The opponent never attacks;
 * each control gets a pulsing highlight + one short instruction, and the
 * step advances only when the player actually performs the action.
 * Skippable at any time.
 */
export class Tutorial {
  constructor(engine) {
    this.engine = engine;
    this.active = false;
    this.step = 0;
    this.stepStartX = 0;
    this.skipBtn = null;
    this.time = 0;

    this.steps = [
      { id: 'joystick', text: 'DRAG THE STICK TO WALK',
        done: (e) => Math.abs(e.player.x - this.stepStartX) > 50 },
      { id: 'punch', text: 'TAP PUNCH  —  CHAIN IT: TAP, TAP, TAP',
        done: (e) => (e.player.currentMove?.name || '').includes('Jab') },
      { id: 'kick', text: 'TAP KICK',
        done: (e) => (e.player.currentMove?.name || '').includes('Kick') },
      { id: 'block', text: 'HOLD BLOCK TO GUARD',
        done: (e) => e.player.state === 'BLOCK' },
      { id: 'heavy', text: 'TAP HEAVY FOR A POWER SMASH',
        done: (e) => (e.player.currentMove?.name || '').includes('Splitter') },
      { id: 'joystick', chevrons: true, text: 'DRAG LEFT / RIGHT 2× FAST TO DASH  (OR TAP A SIDE 2×)',
        done: (e) => e.player.state === 'DASH' },
      { id: 'ranged', text: 'TAP RANGED TO THROW A KUNAI',
        done: (e) => (e.player.currentMove?.name || '').includes('Kunai') },
      { id: 'shadow', text: 'METER FULL — TAP SHADOW TO UNLEASH!',
        done: (e) => e.player.shadowSystem.isActive },
    ];
  }

  static KEY = 'df_tutorial_done';

  static needed() {
    try { return !localStorage.getItem(Tutorial.KEY); } catch { return true; }
  }

  maybeStart() {
    if (!Tutorial.needed()) return false;
    this.start();
    return true;
  }

  start() {
    this.active = true;
    this.step = 0;
    this.stepStartX = this.engine.player.x;
    // Shadow step must be doable: hand the player a full meter
    this.engine.player.shadowSystem.energy = this.engine.player.shadowSystem.maxEnergy;

    this.skipBtn = document.createElement('button');
    this.skipBtn.id = 'skip-tutorial-btn';
    this.skipBtn.type = 'button';
    this.skipBtn.textContent = 'SKIP GUIDE »';
    this.skipBtn.addEventListener('click', () => this.finish());
    document.body.appendChild(this.skipBtn);
  }

  finish() {
    if (!this.active) return;
    this.active = false;
    try { localStorage.setItem(Tutorial.KEY, '1'); } catch { /* ignore */ }
    if (this.skipBtn) { this.skipBtn.remove(); this.skipBtn = null; }

    // Fresh fair start: opponent waits for the first real move
    const e = this.engine;
    e.playerHasActed = false;
    e.inputManager.markActivityEpoch();
    e.announcer.announce('FIGHT!', '', 1.2, '#f59e0b');
  }

  targetPos(step) {
    const e = this.engine;
    if (step.id === 'joystick') return { x: e.joystick.idleX, y: e.joystick.idleY, r: e.joystick.radius + 14 };
    if (step.id === 'player') return { x: e.player.x, y: e.player.y - 70, r: 46 };
    const btn = e.touchButtons.buttons.find((b) => b.id === step.id);
    return btn ? { x: btn.x, y: btn.y, r: btn.radius + 12 } : { x: 640, y: 400, r: 50 };
  }

  update() {
    if (!this.active) return;
    this.time += 1 / 60;

    // Self-heal: a restart/round-reset zeroes the shadow meter — the shadow
    // step must ALWAYS be completable, so keep the tank full while it's up.
    const ss = this.engine.player.shadowSystem;
    if (this.step >= this.steps.length - 1 && !ss.isActive && ss.energy < ss.maxEnergy) {
      ss.energy = ss.maxEnergy;
    }

    const step = this.steps[this.step];
    if (step && step.done(this.engine)) {
      this.step++;
      this.stepStartX = this.engine.player.x;
      if (this.step >= this.steps.length) this.finish();
    }
  }

  render(ctx) {
    if (!this.active) return;
    const step = this.steps[this.step];
    if (!step) return;

    const t = this.targetPos(step);
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);

    // Pulsing highlight rings around the control
    ctx.save();
    ctx.strokeStyle = `rgba(34, 211, 238, ${(0.9 - pulse * 0.4).toFixed(3)})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r + pulse * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(34, 211, 238, ${((1 - ((this.time * 0.9) % 1)) * 0.6).toFixed(3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(t.x, t.y, t.r + 10 + ((this.time * 0.9) % 1) * 26, 0, Math.PI * 2);
    ctx.stroke();

    // Bouncing arrow pointing at it
    const bounce = Math.sin(this.time * 5) * 7;
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.moveTo(t.x, t.y - t.r - 18 + bounce);
    ctx.lineTo(t.x - 9, t.y - t.r - 34 + bounce);
    ctx.lineTo(t.x + 9, t.y - t.r - 34 + bounce);
    ctx.closePath();
    ctx.fill();

    // Dash step: animated double chevrons streaming both directions around
    // the stick so the "tap twice" idea reads without words
    if (step.chevrons) {
      const flow = (this.time * 90) % 46;
      ctx.strokeStyle = 'rgba(103, 232, 249, 0.95)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const dir of [1, -1]) {
        for (let i = 0; i < 2; i++) {
          const cx = t.x + dir * (70 + i * 46 + flow);
          const fade = 1 - (flow / 46) * 0.7 - i * 0.25;
          ctx.save();
          ctx.globalAlpha = Math.max(0.15, fade);
          ctx.beginPath();
          ctx.moveTo(cx - dir * 10, t.y - 14);
          ctx.lineTo(cx + dir * 6, t.y);
          ctx.lineTo(cx - dir * 10, t.y + 14);
          ctx.stroke();
          ctx.restore();
        }
      }
      // "x2" hint
      ctx.font = '800 20px "Rajdhani", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#a5f3fc';
      ctx.fillText('TAP  ×2  FAST', t.x, t.y + t.r + 34);
    }
    ctx.restore();

    // Instruction banner
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 24px "Rajdhani", system-ui, sans-serif';
    const label = step.text;
    const w = ctx.measureText(label).width + 44;
    const bx = 640 - w / 2, by = 96;
    ctx.fillStyle = 'rgba(5, 10, 20, 0.85)';
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + 10, by);
    ctx.arcTo(bx + w, by, bx + w, by + 44, 10);
    ctx.arcTo(bx + w, by + 44, bx, by + 44, 10);
    ctx.arcTo(bx, by + 44, bx, by, 10);
    ctx.arcTo(bx, by, bx + w, by, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#a5f3fc';
    ctx.fillText(label, 640, by + 23);

    ctx.font = '600 15px "Rajdhani", system-ui, sans-serif';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.fillText(`GUIDE  ${this.step + 1} / ${this.steps.length}`, 640, by + 62);
    ctx.restore();
  }
}

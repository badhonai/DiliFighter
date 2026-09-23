export class TouchButtons {
  constructor(inputManager, canvas) {
    this.inputManager = inputManager;
    this.canvas = canvas;

    this.buttons = [
      { id: 'punch', icon: 'icons/punch.svg', name: 'Punch', x: 1180, y: 550, radius: 36, pressed: false },
      { id: 'kick', icon: 'icons/kick.svg', name: 'Kick', x: 1090, y: 620, radius: 34, pressed: false },
      { id: 'block', icon: 'icons/block.svg', name: 'Block', x: 0, y: 0, radius: 30, pressed: false },
      { id: 'heavy', icon: 'icons/heavy.svg', name: 'Heavy', x: 0, y: 0, radius: 30, pressed: false },
      { id: 'ranged', icon: 'icons/ranged.svg', name: 'Ranged', x: 1195, y: 440, radius: 28, pressed: false },
      { id: 'shadow', icon: 'icons/shadow.svg', name: 'Shadow', x: 1070, y: 500, radius: 32, pressed: false },
    ];

    // Preload SVG icons so they render crisply on the canvas
    this.icons = {};
    for (const btn of this.buttons) {
      const img = new Image();
      img.src = `${import.meta.env.BASE_URL}${btn.icon}`;
      this.icons[btn.id] = img;
    }

    this.layout();
    // Safety net: if the canvas had no size yet at construction, layout()
    // early-returns and the buttons keep garbage coordinates — re-anchor on
    // the next frames so touch never points at invisible buttons.
    if (typeof requestAnimationFrame !== 'undefined') requestAnimationFrame(() => this.layout());
    setTimeout(() => this.layout(), 300);
    window.addEventListener('resize', () => this.layout());
    window.addEventListener('orientationchange', () => this.layout());

    this.setupEvents();
  }

  /**
   * Anchor the button cluster to the *actual* screen edges. On viewports
   * wider than 16:9 the visible world extends past 0..1280, so buttons
   * docked to world-space 1280 would float away from the screen edge.
   */
  layout() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const scale = rect.height / 720;
    const marginX = Math.max(0, (rect.width - rect.height * (1280 / 720)) / 2) / scale;
    const marginY = Math.max(0, (rect.height - rect.width * (720 / 1280)) / 2) / (rect.width / 1280);

    const right = 1280 + marginX;
    const bottom = 720 + marginY;

    // 2x3 cluster under the right thumb: core buttons at the bottom,
    // defense/power in the middle row, utility up top.
    const pos = {
      punch:  { x: right - 78,  y: bottom - 88,  radius: 52 },
      kick:   { x: right - 198, y: bottom - 88,  radius: 50 },
      block:  { x: right - 78,  y: bottom - 204, radius: 48 },
      heavy:  { x: right - 198, y: bottom - 204, radius: 48 },
      ranged: { x: right - 78,  y: bottom - 316, radius: 44 },
      shadow: { x: right - 198, y: bottom - 316, radius: 48 },
    };
    for (const btn of this.buttons) {
      btn.x = pos[btn.id].x;
      btn.y = pos[btn.id].y;
      btn.radius = pos[btn.id].radius;
    }
  }

  getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasAspect = 1280 / 720;
    const elementAspect = rect.width / rect.height;

    let actualWidth = rect.width;
    let actualHeight = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (elementAspect > canvasAspect) {
      actualWidth = rect.height * canvasAspect;
      offsetX = (rect.width - actualWidth) / 2;
    } else {
      actualHeight = rect.width / canvasAspect;
      offsetY = (rect.height - actualHeight) / 2;
    }

    const x = ((clientX - rect.left - offsetX) / actualWidth) * 1280;
    const y = ((clientY - rect.top - offsetY) / actualHeight) * 720;

    return { x, y };
  }

  setupEvents() {
    // Per-touch ownership: touchId -> Set of button ids it is holding.
    // Buttons must be released when THAT touch ends, no matter where the
    // finger is — the old position-based release left buttons stuck pressed
    // forever if the finger slid off the button before lifting, which
    // locked the fighter in its attack state and froze all movement.
    this.heldBy = new Map();

    // Reject ONLY touches that start on real interactive HTML UI (pause/help
    // buttons, open modals). We deliberately do NOT require e.target to be
    // the canvas: on real devices transparent layers, browser zoom wrappers
    // and fullscreen transitions can retarget the event away from the
    // canvas, which silently killed every on-screen button. Coordinate
    // hit-testing below still guarantees only real button presses register.
    const isInteractiveUI = (el) =>
      el && el.closest && el.closest('button, .modal-overlay, #help-modal, #rotate-overlay, #tap-to-play-overlay, .touch-interactive');

    const pressAt = (clientX, clientY, id) => {
      const { x, y } = this.getCanvasCoords(clientX, clientY);
      const nowHeld = new Set();
      for (const btn of this.buttons) {
        const dx = x - btn.x;
        const dy = y - btn.y;
        if (Math.sqrt(dx * dx + dy * dy) <= btn.radius + 12) {
          nowHeld.add(btn.id);
          if (!btn.pressed) {
            btn.pressed = true;
            this.inputManager.setVirtualButton(btn.id, true);
          }
        }
      }
      if (nowHeld.size > 0) this.heldBy.set(id, nowHeld);
    };

    const releaseTouch = (id) => {
      const owned = this.heldBy.get(id);
      if (!owned) return;
      for (const btnId of owned) {
        // A button only releases when no other touch still holds it
        let stillHeld = false;
        for (const [otherId, otherSet] of this.heldBy) {
          if (otherId !== id && otherSet.has(btnId)) { stillHeld = true; break; }
        }
        if (!stillHeld) {
          const btn = this.buttons.find(b => b.id === btnId);
          if (btn) btn.pressed = false;
          this.inputManager.setVirtualButton(btnId, false);
        }
      }
      this.heldBy.delete(id);
    };

    // Touches on HTML buttons/modals belong to those elements; everything
    // else is fair game for coordinate-based button hit-testing.
    window.addEventListener('touchstart', (e) => {
      if (isInteractiveUI(e.target)) return;
      if (e.cancelable) e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        pressAt(t.clientX, t.clientY, t.identifier);
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        releaseTouch(e.changedTouches[i].identifier);
      }
    });

    window.addEventListener('touchcancel', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        releaseTouch(e.changedTouches[i].identifier);
      }
    });

    // Mouse fallback
    this.canvas.addEventListener('mousedown', (e) => {
      pressAt(e.clientX, e.clientY, 'mouse');
    });
    window.addEventListener('mouseup', () => {
      releaseTouch('mouse');
    });
  }

  render(ctx, player) {
    const isShadowReady = player.shadowSystem.isReady();
    const isShadowActive = player.shadowSystem.isActive;

    ctx.save();

    for (const btn of this.buttons) {
      ctx.save();
      ctx.translate(btn.x, btn.y);

      const isShadowBtn = btn.id === 'shadow';
      const pressed = btn.pressed;

      // Outer ring
      if (isShadowBtn) {
        ctx.strokeStyle = isShadowReady || isShadowActive ? '#00f0ff' : 'rgba(0, 240, 255, 0.3)';
        ctx.fillStyle = isShadowActive ? 'rgba(0, 240, 255, 0.4)' : pressed ? '#0369a1' : 'rgba(15, 23, 42, 0.6)';
        if (isShadowReady) {
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 18;
        }
      } else {
        ctx.strokeStyle = pressed ? '#38bdf8' : 'rgba(148, 163, 184, 0.4)';
        ctx.fillStyle = pressed ? 'rgba(56, 189, 248, 0.3)' : 'rgba(15, 23, 42, 0.55)';
      }

      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, btn.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Icon
      const icon = this.icons[btn.id];
      if (icon && icon.complete && icon.naturalWidth > 0) {
        const iconSize = btn.radius * 1.15;
        ctx.drawImage(icon, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
      }

      ctx.restore();
    }

    ctx.restore();
  }
}

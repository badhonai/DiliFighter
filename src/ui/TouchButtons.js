export class TouchButtons {
  constructor(inputManager, canvas) {
    this.inputManager = inputManager;
    this.canvas = canvas;

    this.buttons = [
      { id: 'punch', icon: 'icons/punch.svg', name: 'Punch', x: 1180, y: 550, radius: 36, pressed: false },
      { id: 'kick', icon: 'icons/kick.svg', name: 'Kick', x: 1090, y: 620, radius: 34, pressed: false },
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

    const pos = {
      punch:  { x: right - 78,  y: bottom - 185, radius: 54 },
      kick:   { x: right - 188, y: bottom - 96,  radius: 50 },
      ranged: { x: right - 80,  y: bottom - 330, radius: 44 },
      shadow: { x: right - 222, y: bottom - 272, radius: 48 },
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

    // preventDefault only for touches on the canvas (keeps HTML buttons
    // tappable) so browsers don't hijack gameplay touches for gestures.
    window.addEventListener('touchstart', (e) => {
      if (e.target === this.canvas && e.cancelable) e.preventDefault();
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

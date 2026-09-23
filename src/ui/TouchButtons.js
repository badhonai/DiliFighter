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

    this.setupEvents();
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
    const checkButtons = (clientX, clientY, isDown) => {
      const { x, y } = this.getCanvasCoords(clientX, clientY);

      for (const btn of this.buttons) {
        const dx = x - btn.x;
        const dy = y - btn.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= btn.radius + 12) {
          btn.pressed = isDown;
          this.inputManager.setVirtualButton(btn.id, isDown);
        }
      }
    };

    // Touch events
    window.addEventListener('touchstart', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        checkButtons(t.clientX, t.clientY, true);
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        checkButtons(t.clientX, t.clientY, false);
      }
    });

    // Mouse fallback
    this.canvas.addEventListener('mousedown', (e) => {
      checkButtons(e.clientX, e.clientY, true);
    });
    window.addEventListener('mouseup', () => {
      for (const btn of this.buttons) {
        if (btn.pressed) {
          btn.pressed = false;
          this.inputManager.setVirtualButton(btn.id, false);
        }
      }
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

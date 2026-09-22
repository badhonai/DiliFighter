export class VirtualJoystick {
  constructor(inputManager, canvas) {
    this.inputManager = inputManager;
    this.canvas = canvas;
    this.baseX = 140;
    this.baseY = 560;
    this.thumbX = 140;
    this.thumbY = 560;
    this.radius = 65;
    this.active = false;
    this.pointerId = null;

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
    const handleStart = (clientX, clientY, id) => {
      const { x, y } = this.getCanvasCoords(clientX, clientY);

      // Bottom-left quadrant for joystick
      if (x < 440 && y > 380) {
        this.active = true;
        this.pointerId = id;
        this.baseX = x;
        this.baseY = y;
        this.thumbX = x;
        this.thumbY = y;
      }
    };

    const handleMove = (clientX, clientY, id) => {
      if (!this.active || this.pointerId !== id) return;

      const { x, y } = this.getCanvasCoords(clientX, clientY);
      const dx = x - this.baseX;
      const dy = y - this.baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= this.radius) {
        this.thumbX = x;
        this.thumbY = y;
      } else {
        this.thumbX = this.baseX + (dx / dist) * this.radius;
        this.thumbY = this.baseY + (dy / dist) * this.radius;
      }

      const normalizedX = (this.thumbX - this.baseX) / this.radius;
      const normalizedY = (this.thumbY - this.baseY) / this.radius;

      this.inputManager.setVirtualAxis(normalizedX, normalizedY);
    };

    const handleEnd = (id) => {
      if (this.pointerId === id) {
        this.active = false;
        this.pointerId = null;
        this.thumbX = this.baseX = 140;
        this.thumbY = this.baseY = 560;
        this.inputManager.setVirtualAxis(0, 0);
      }
    };

    // Touch events
    window.addEventListener('touchstart', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        handleStart(t.clientX, t.clientY, t.identifier);
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        handleMove(t.clientX, t.clientY, t.identifier);
      }
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        handleEnd(e.changedTouches[i].identifier);
      }
    });

    window.addEventListener('touchcancel', (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        handleEnd(e.changedTouches[i].identifier);
      }
    });

    // Mouse fallback
    this.canvas.addEventListener('mousedown', (e) => {
      handleStart(e.clientX, e.clientY, 'mouse');
    });
    window.addEventListener('mousemove', (e) => {
      handleMove(e.clientX, e.clientY, 'mouse');
    });
    window.addEventListener('mouseup', () => {
      handleEnd('mouse');
    });
  }

  render(ctx) {
    ctx.save();

    // Base Ring
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.35)';
    ctx.lineWidth = 2.5;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.beginPath();
    ctx.arc(this.baseX, this.baseY, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Directional Arrows
    const dirs = [
      { x: 0, y: -this.radius + 14, angle: 0 },
      { x: this.radius - 14, y: 0, angle: Math.PI / 2 },
      { x: 0, y: this.radius - 14, angle: Math.PI },
      { x: -this.radius + 14, y: 0, angle: -Math.PI / 2 }
    ];

    ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
    for (const d of dirs) {
      ctx.save();
      ctx.translate(this.baseX + d.x, this.baseY + d.y);
      ctx.rotate(d.angle);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(5, 5);
      ctx.lineTo(-5, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Thumb Stick Knob
    ctx.fillStyle = this.active ? '#0284c7' : 'rgba(30, 41, 59, 0.7)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = this.active ? 15 : 5;
    ctx.beginPath();
    ctx.arc(this.thumbX, this.thumbY, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

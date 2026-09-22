import { GAME_CONFIG } from '../config.js';

export class Camera {
  constructor() {
    this.x = GAME_CONFIG.WORLD_WIDTH / 2;
    this.y = GAME_CONFIG.WORLD_HEIGHT / 2;
    this.targetX = this.x;
    this.targetY = this.y;
    this.zoom = 1.0;
    this.targetZoom = 1.0;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }

  shake(intensity = 8, duration = 0.2) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  update(dt, fighter1, fighter2) {
    // Center point between fighters
    const midX = (fighter1.x + fighter2.x) / 2;
    const midY = (fighter1.y + fighter2.y) / 2 - 40;
    
    // Zoom calculation based on distance
    const dist = Math.abs(fighter1.x - fighter2.x);
    const minZoom = GAME_CONFIG.CAMERA.MIN_ZOOM;
    const maxZoom = GAME_CONFIG.CAMERA.MAX_ZOOM;
    
    // Closer fighters = zoom in, farther fighters = zoom out
    const zoomFactor = 1 - (dist / (GAME_CONFIG.STAGE_RIGHT - GAME_CONFIG.STAGE_LEFT));
    this.targetZoom = minZoom + (maxZoom - minZoom) * Math.max(0, Math.min(1, zoomFactor));
    
    // Clamp target within stage
    this.targetX = Math.max(480, Math.min(800, midX));
    this.targetY = Math.max(340, Math.min(420, midY));

    // Smooth lerp
    const smooth = GAME_CONFIG.CAMERA.SMOOTHING;
    this.x += (this.targetX - this.x) * (smooth * 60 * dt);
    this.y += (this.targetY - this.y) * (smooth * 60 * dt);
    this.zoom += (this.targetZoom - this.zoom) * (smooth * 60 * dt);

    // Screen shake update
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      }
    }
  }

  applyTransform(ctx) {
    const width = GAME_CONFIG.WORLD_WIDTH;
    const height = GAME_CONFIG.WORLD_HEIGHT;

    ctx.save();
    
    // Screen shake offset
    let shakeX = 0;
    let shakeY = 0;
    if (this.shakeIntensity > 0) {
      shakeX = (Math.random() * 2 - 1) * this.shakeIntensity;
      shakeY = (Math.random() * 2 - 1) * this.shakeIntensity;
    }

    // Translate to center, apply scale, translate back
    ctx.translate(width / 2 + shakeX, height / 2 + shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  restoreTransform(ctx) {
    ctx.restore();
  }
}

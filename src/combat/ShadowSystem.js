import { GAME_CONFIG } from '../config.js';

export class ShadowSystem {
  constructor(fighter) {
    this.fighter = fighter;
    this.energy = 0; // 0 to 100
    this.maxEnergy = GAME_CONFIG.MATCH.MAX_SHADOW;
    this.isActive = false;
    this.timer = 0;
    this.auraPulse = 0;
  }

  addEnergy(amount) {
    if (this.isActive) return;
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  isReady() {
    return !this.isActive && this.energy >= this.maxEnergy;
  }

  activate() {
    if (!this.isReady()) return false;
    this.isActive = true;
    this.timer = GAME_CONFIG.MATCH.SHADOW_MODE_DURATION;
    return true;
  }

  update(dt) {
    this.auraPulse += dt * 4;

    if (this.isActive) {
      this.timer -= dt;
      // Drain energy proportionally to duration
      this.energy = (this.timer / GAME_CONFIG.MATCH.SHADOW_MODE_DURATION) * this.maxEnergy;

      if (this.timer <= 0) {
        this.deactivate();
      }
    }
  }

  deactivate() {
    this.isActive = false;
    this.energy = 0;
    this.timer = 0;
  }

  reset() {
    this.isActive = false;
    this.energy = 0;
    this.timer = 0;
  }
}

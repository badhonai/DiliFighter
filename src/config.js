export const GAME_CONFIG = {
  TITLE: 'DiliFighter',
  VERSION: '1.0.0',
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  FIXED_TIMESTEP: 1 / 60,
  MAX_DELTA_TIME: 0.1,
  
  PHYSICS: {
    GRAVITY: 1400,
    GROUND_Y: 580,
    STAGE_LEFT: 100,
    STAGE_RIGHT: 1180,
    FRICTION: 0.85,
  },
  
  MATCH: {
    ROUND_TIME: 60,
    ROUNDS_TO_WIN: 2,
    MAX_HEALTH: 1000,
    MAX_SHADOW: 100,
    SHADOW_GAIN_ON_HIT: 12,
    SHADOW_GAIN_ON_DAMAGE: 6,
    SHADOW_GAIN_ON_BLOCK: 4,
    SHADOW_MODE_DURATION: 12, // in seconds
  },

  CAMERA: {
    MIN_ZOOM: 0.9,
    MAX_ZOOM: 1.15,
    SMOOTHING: 0.08,
    HIT_SHAKE_DURATION: 0.2,
  },

  KEYS: {
    MOVE_LEFT: ['KeyA', 'ArrowLeft'],
    MOVE_RIGHT: ['KeyD', 'ArrowRight'],
    JUMP: ['KeyW', 'ArrowUp'],
    CROUCH: ['KeyS', 'ArrowDown'],
    PUNCH: ['KeyJ', 'KeyZ'],
    KICK: ['KeyK', 'KeyX'],
    RANGED: ['KeyL', 'KeyC'],
    SHADOW: ['Space', 'KeyU'],
    PAUSE: ['Escape', 'KeyP'],
  }
};

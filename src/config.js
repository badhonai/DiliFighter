export const GAME_CONFIG = {
  TITLE: 'DiliFighter',
  VERSION: '1.0.0',
  // Internal "design" resolution the game world is laid out in. The actual
  // canvas is sized dynamically to fill the device's real viewport, and the
  // world is uniformly scaled (and horizontally centered) to fit while
  // preserving gameplay coordinates and aspect ratio.
  WORLD_WIDTH: 1280,
  WORLD_HEIGHT: 720,
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
    MAX_HEALTH: 1500,
  // Fighters render & fight this much larger than the original sprites
  FIGHTER_SCALE: 1.22,
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
    // Two mirrored clusters: left hand (ZXCVB) + right hand (JKL;I) so the
    // player can pick WASD or arrows for movement and always reach attacks
    // with a free hand.
    MOVE_LEFT: ['KeyA', 'ArrowLeft'],
    MOVE_RIGHT: ['KeyD', 'ArrowRight'],
    JUMP: ['KeyW', 'ArrowUp'],
    CROUCH: ['KeyS', 'ArrowDown'],
    PUNCH: ['KeyJ', 'KeyZ'],
    KICK: ['KeyK', 'KeyX'],
    RANGED: ['KeyL', 'KeyC'],
    HEAVY: ['KeyI', 'KeyB'],
    BLOCK: ['Semicolon', 'KeyV'],
    SHADOW: ['Space', 'KeyU'],
    PAUSE: ['Escape', 'KeyP'],
  }
};

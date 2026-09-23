import { GAME_CONFIG } from '../config.js';
import { Camera } from './Camera.js';
import { InputManager } from './InputManager.js';
import { SoundEngine } from '../audio/SoundEngine.js';
import { ParticleSystem } from '../entities/ParticleSystem.js';
import { Dili } from '../characters/Dili.js';
import { Tsunami } from '../characters/Tsunami.js';
import { ImageStage } from '../stages/ImageStage.js';
import { HUD } from '../ui/HUD.js';
import { VirtualJoystick } from '../ui/VirtualJoystick.js';
import { TouchButtons } from '../ui/TouchButtons.js';
import { MatchAnnouncer } from '../ui/MatchAnnouncer.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { MusicToggle } from '../ui/MusicToggle.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // Systems
    this.inputManager = new InputManager();
    this.soundEngine = new SoundEngine();
    this.camera = new Camera();
    this.particleSystem = new ParticleSystem();
    this.stage = new ImageStage();
    this.hud = new HUD();
    this.announcer = new MatchAnnouncer();
    this.joystick = new VirtualJoystick(this.inputManager, this.canvas);
    this.touchButtons = new TouchButtons(this.inputManager, this.canvas);
    this.pauseMenu = new PauseMenu(this);
    this.musicToggle = new MusicToggle(this.soundEngine);

    // Entities
    this.player = new Dili(350, GAME_CONFIG.PHYSICS.GROUND_Y);
    this.opponent = new Tsunami(930, GAME_CONFIG.PHYSICS.GROUND_Y);
    this.projectiles = [];

    // Match State
    this.roundNumber = 1;
    this.matchTimer = GAME_CONFIG.MATCH.ROUND_TIME;
    this.matchState = 'INTRO'; // 'INTRO' | 'FIGHTING' | 'KO' | 'MATCH_OVER'
    this.stateTimer = 2.0;

    // Audio edge-detection state (rising edges of game events)
    this.audioState = { lastTimerCeil: null, shadowReadyP1: false, shadowReadyP2: false };

    // Hitstop: fighters/projectiles freeze for a few frames on impact —
    // THE ingredient that makes hits feel heavy (classic fighting games)
    this.hitstop = 0;

    // Time Accumulator
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.timeScale = 1.0; // Slow motion during KO

    this.setupResize();
    this.startRound();
  }

  setupResize() {
    const resize = () => this.resizeViewport();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    this.resizeViewport();
  }

  resizeViewport() {
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.viewport = {
      x: 0,
      y: 0,
      width,
      height,
      scale: Math.min(width / GAME_CONFIG.WORLD_WIDTH, height / GAME_CONFIG.WORLD_HEIGHT),
      offsetX: (width - GAME_CONFIG.WORLD_WIDTH * Math.min(width / GAME_CONFIG.WORLD_WIDTH, height / GAME_CONFIG.WORLD_HEIGHT)) / 2,
      offsetY: (height - GAME_CONFIG.WORLD_HEIGHT * Math.min(width / GAME_CONFIG.WORLD_WIDTH, height / GAME_CONFIG.WORLD_HEIGHT)) / 2,
    };
    this.dpr = dpr;
  }

  getViewport() {
    return this.viewport;
  }

  clientToWorld(clientX, clientY) {
    const v = this.viewport;
    return {
      x: (clientX - v.x - v.offsetX) / v.scale,
      y: (clientY - v.y - v.offsetY) / v.scale,
    };
  }

  startRound() {
    this.player.reset(350, 1);
    this.opponent.reset(930, -1);
    this.projectiles = [];
    this.particleSystem.clear();
    this.matchTimer = GAME_CONFIG.MATCH.ROUND_TIME;
    this.matchState = 'INTRO';
    this.stateTimer = 2.2;
    this.timeScale = 1.0;

    // Rotate arena each round (first round of a match keeps the initial pick)
    if (this.roundNumber > 1) {
      this.stage.advance();
    }

    this.announcer.announce(
      `ROUND ${this.roundNumber}`,
      this.stage.arena.name,
      2.0,
      '#f8fafc'
    );
    setTimeout(() => {
      this.soundEngine.playGong();
    }, 400);
  }

  restartMatch() {
    this.roundNumber = 1;
    this.player.roundsWon = 0;
    this.opponent.roundsWon = 0;
    this.startRound();
  }

  update(dt) {
    // Check Pause
    if (this.inputManager.isActionJustPressed('pause')) {
      this.pauseMenu.togglePause();
    }
    if (this.pauseMenu.isPaused) return;

    // Scale dt for slow-mo
    const effectiveDt = dt * this.timeScale;

    // Hitstop freeze for combat actors (particles/camera/stage keep flowing)
    this.hitstop = Math.max(0, this.hitstop - dt);
    const actorDt = this.hitstop > 0 ? 0 : effectiveDt;

    // State machine updates
    if (this.matchState === 'INTRO') {
      this.stateTimer -= effectiveDt;
      if (this.stateTimer <= 0) {
        this.matchState = 'FIGHTING';
        this.announcer.announce('FIGHT!', '', 1.2, '#f59e0b');
      }
    } else if (this.matchState === 'FIGHTING') {
      this.matchTimer = Math.max(0, this.matchTimer - actorDt);

      // Timeout check
      if (this.matchTimer <= 0) {
        this.evaluateRoundWinner();
      }
    } else if (this.matchState === 'KO') {
      this.stateTimer -= effectiveDt;
      if (this.stateTimer <= 0) {
        this.evaluateNextRound();
      }
    }

    // Input & Character updates
    if (this.matchState === 'FIGHTING') {
      this.player.handleInput(this.inputManager, this.soundEngine);
      this.opponent.updateAI(actorDt, this.player, this.soundEngine);
    }

    // Detect Shadow Mode triggers for announcements
    if (this.player.shadowSystem.isActive && this.player.shadowSystem.timer > GAME_CONFIG.MATCH.SHADOW_MODE_DURATION - 0.1) {
      this.announcer.showShadowBanner();
      this.camera.shake(12, 0.4);
    }

    // Update Fighters
    this.player.update(actorDt, this.opponent, this.soundEngine, this.particleSystem, this.projectiles);
    this.opponent.update(effectiveDt, this.player, this.soundEngine, this.particleSystem, this.projectiles);

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(actorDt, { left: GAME_CONFIG.PHYSICS.STAGE_LEFT, right: GAME_CONFIG.PHYSICS.STAGE_RIGHT }, this.particleSystem);
      if (!proj.active) {
        this.projectiles.splice(i, 1);
      }
    }

    // Combat & Collision Evaluation (frozen during hitstop)
    if (this.hitstop <= 0) {
      this.evaluateCombat();
    }

    // Adaptive audio (music theme/intensity, event edge-triggered stingers)
    const isAnyShadow = this.player.shadowSystem.isActive || this.opponent.shadowSystem.isActive;
    this.syncAudio(isAnyShadow);

    // Stage & Particles
    this.stage.update(effectiveDt, isAnyShadow);
    this.particleSystem.update(effectiveDt);
    this.camera.update(effectiveDt, this.player, this.opponent);
    this.hud.update(effectiveDt, this.player, this.opponent);
    this.announcer.update(effectiveDt);

    // Clear input frame buffers
    this.inputManager.update();
  }

  evaluateCombat() {
    // 1. Player active attack vs Opponent
    const p1Hitbox = this.player.getActiveHitbox();
    if (p1Hitbox && !this.player.hasHitOpponent) {
      const oppHurtboxes = this.opponent.getHurtboxes();
      for (const hb of oppHurtboxes) {
        if (p1Hitbox.intersects(hb)) {
          this.player.hasHitOpponent = true;
          this.player.comboCount++;
          this.hud.showCombo(1, this.player.comboCount);

          const result = this.opponent.takeHit(p1Hitbox, this.player, this.soundEngine, this.particleSystem);
          this.camera.shake(p1Hitbox.properties.isHeavy ? 14 : 8, 0.22);
          this.applyHitFeel(result, p1Hitbox.properties.isHeavy);

          if (result === 'ko') {
            this.triggerKO(this.player, this.opponent);
          }
          break;
        }
      }
    }

    // 2. Opponent active attack vs Player
    const p2Hitbox = this.opponent.getActiveHitbox();
    if (p2Hitbox && !this.opponent.hasHitOpponent) {
      const playerHurtboxes = this.player.getHurtboxes();
      for (const hb of playerHurtboxes) {
        if (p2Hitbox.intersects(hb)) {
          this.opponent.hasHitOpponent = true;
          this.opponent.comboCount++;
          this.hud.showCombo(2, this.opponent.comboCount);

          const result = this.player.takeHit(p2Hitbox, this.opponent, this.soundEngine, this.particleSystem);
          this.camera.shake(p2Hitbox.properties.isHeavy ? 14 : 8, 0.22);
          this.applyHitFeel(result, p2Hitbox.properties.isHeavy);

          if (result === 'ko') {
            this.triggerKO(this.opponent, this.player);
          }
          break;
        }
      }
    }

    // 3. Projectile Collisions
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      const target = proj.owner === this.player ? this.opponent : this.player;
      const projHitbox = proj.getHitbox();

      for (const hb of target.getHurtboxes()) {
        if (projHitbox.intersects(hb)) {
          proj.active = false;
          this.soundEngine.playRangedImpact();
          const result = target.takeHit(projHitbox, proj.owner, this.soundEngine, this.particleSystem);
          this.camera.shake(8, 0.18);
          this.applyHitFeel(result, projHitbox.properties.isHeavy);
          if (result === 'ko') {
            this.triggerKO(proj.owner, target);
          }
          break;
        }
      }
    }
  }

  /** Hit feel: hitstop freeze frames + screen flash on heavy impacts. */
  applyHitFeel(result, isHeavy) {
    if (result === 'blocked') {
      this.hitstop = Math.max(this.hitstop, 0.03);
    } else if (result === 'hit') {
      this.hitstop = Math.max(this.hitstop, isHeavy ? 0.09 : 0.055);
      if (isHeavy) this.hud.flash(0.14);
    } else if (result === 'ko') {
      this.hitstop = Math.max(this.hitstop, 0.12);
      this.hud.flash(0.3);
    }
  }

  /** Game-state -> audio translation, polled every frame (edge-safe). */
  syncAudio(anyShadow) {
    const fighting = this.matchState === 'FIGHTING';
    this.soundEngine.syncMusic({
      theme: this.stage.arenaIndex === 0 ? 'neon' : 'cliff',
      intensity: this.matchState === 'INTRO' ? 0.45 : fighting ? 1 : 0.65,
      urgent: fighting && this.matchTimer <= 10,
      shadow: anyShadow,
    });

    // Rising edge: either shadow bar just filled -> shimmer cue
    const p1Ready = this.player.shadowSystem.isReady();
    const p2Ready = this.opponent.shadowSystem.isReady();
    if (p1Ready && !this.audioState.shadowReadyP1) this.soundEngine.playShadowReady();
    if (p2Ready && !this.audioState.shadowReadyP2) this.soundEngine.playShadowReady();
    this.audioState.shadowReadyP1 = p1Ready;
    this.audioState.shadowReadyP2 = p2Ready;

    // Final-five countdown ticks
    if (fighting) {
      const c = Math.ceil(this.matchTimer);
      if (c !== this.audioState.lastTimerCeil) {
        this.audioState.lastTimerCeil = c;
        if (c <= 5 && c >= 1) this.soundEngine.playCountdownTick(c === 1);
      }
    }
  }

  triggerKO(winner, loser) {
    if (this.matchState === 'KO') return;
    this.matchState = 'KO';
    this.stateTimer = 3.0;
    this.timeScale = 0.3; // Visceral slow motion impact!
    this.announcer.announce('K.O.!', '', 2.5, '#ef4444');
    this.soundEngine.playKO();

    setTimeout(() => {
      this.timeScale = 1.0;
    }, 1200);
  }

  evaluateRoundWinner() {
    let winner = null;
    if (this.player.health > this.opponent.health) {
      winner = this.player;
    } else if (this.opponent.health > this.player.health) {
      winner = this.opponent;
    }
    this.finishRound(winner);
  }

  finishRound(winner) {
    if (winner) {
      winner.roundsWon++;
      if (winner.roundsWon >= GAME_CONFIG.MATCH.ROUNDS_TO_WIN) {
        this.matchState = 'MATCH_OVER';
        const isPlayerWin = winner === this.player;
        this.announcer.announce(
          isPlayerWin ? 'VICTORY!' : 'DEFEAT',
          isPlayerWin ? 'WARRIOR OF THE SHADOW REALM' : 'HONOR LOST IN COMBAT',
          4.0,
          isPlayerWin ? '#eab308' : '#ef4444'
        );
        if (isPlayerWin) this.soundEngine.playVictory();
        else this.soundEngine.playDefeat();
        setTimeout(() => {
          this.restartMatch();
        }, 4500);
        return;
      }
    }

    this.roundNumber++;
    this.startRound();
  }

  evaluateNextRound() {
    const winner = this.player.health > 0 ? this.player : this.opponent;
    this.finishRound(winner);
  }

  render() {
    const v = this.viewport;
    const dpr = this.dpr || 1;
    const ctx = this.ctx;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Fill entire viewport (respecting device pixel ratio) with the page background.
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, v.width * dpr, v.height * dpr);

    ctx.save();
    // Transform from physical canvas pixels into the fixed logical world space.
    ctx.setTransform(dpr * v.scale, 0, 0, dpr * v.scale, dpr * v.offsetX, dpr * v.offsetY);

    // Apply Dynamic Camera Zoom & Shake
    this.camera.applyTransform(ctx);

    // 1. Stage (Temple Courtyard / Shadow Realm)
    this.stage.render(ctx);

    // 2. Projectiles
    for (const proj of this.projectiles) {
      proj.render(ctx);
    }

    // 3. Fighters (Render order based on who is attacking)
    if (this.player.state === 'ATTACKING') {
      this.opponent.render(ctx);
      this.player.render(ctx);
    } else {
      this.player.render(ctx);
      this.opponent.render(ctx);
    }

    // 4. Particles & Slashes
    this.particleSystem.render(ctx);

    this.camera.restoreTransform(ctx);

    // 5. Fixed HUD & UI Elements (canvas is currently in world-space transform)
    this.hud.render(ctx, this.player, this.opponent, this.matchTimer, this.roundNumber);
    this.joystick.render(ctx);
    this.touchButtons.render(ctx, this.player);
    this.announcer.render(ctx);

    ctx.restore();
  }

  run() {
    const loop = (currentTime) => {
      const frameTime = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      const dt = Math.min(frameTime, GAME_CONFIG.MAX_DELTA_TIME);
      this.accumulator += dt;

      while (this.accumulator >= GAME_CONFIG.FIXED_TIMESTEP) {
        this.update(GAME_CONFIG.FIXED_TIMESTEP);
        this.accumulator -= GAME_CONFIG.FIXED_TIMESTEP;
      }

      this.render();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

import { GAME_CONFIG } from '../config.js';
import { LOW_FX, MAX_DPR } from './PerfFlags.js';
import { Camera } from './Camera.js';
import { InputManager } from './InputManager.js';
import { SoundEngine } from '../audio/SoundEngine.js';
import { ParticleSystem } from '../entities/ParticleSystem.js';
import { Dili } from '../characters/Dili.js';
import { Tsunami } from '../characters/Tsunami.js';
import { Lafaek } from '../characters/Lafaek.js';
import { Manu } from '../characters/Manu.js';
import { loadCharacterSprites } from '../entities/SpriteStore.js';
import { ImageStage } from '../stages/ImageStage.js';
import { HUD } from '../ui/HUD.js';
import { VirtualJoystick } from '../ui/VirtualJoystick.js';
import { TouchButtons } from '../ui/TouchButtons.js';
import { MatchAnnouncer } from '../ui/MatchAnnouncer.js';
import { PauseMenu } from '../ui/PauseMenu.js';
import { VSSplash } from '../ui/VSSplash.js';
import { Difficulty } from './Difficulty.js';
import { GraphicsQuality } from './GraphicsQuality.js';
import { Tutorial } from '../ui/Tutorial.js';

export class Engine {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{autoStart?: boolean}} [options] autoStart=false parks the engine
   *   in the HOME attract state (living arena behind the title screen) until
   *   beginMatch(difficulty) is called from the UI flow.
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.renderSuspended = false;

    // Mobile GPU rescue: canvas shadowBlur/shadowColor are the single most
    // expensive 2D ops and this game used them ~30x per frame. On coarse
    // pointers we neutralize them at the context level — every existing
    // draw call keeps working, just without the glow tax.
    if (LOW_FX) {
      try {
        Object.defineProperty(this.ctx, 'shadowBlur', {
          get: () => 0,
          set: () => {},
          configurable: true,
        });
        Object.defineProperty(this.ctx, 'shadowColor', {
          get: () => 'rgba(0,0,0,0)',
          set: () => {},
          configurable: true,
        });
      } catch {
        /* some engines refuse instance overrides — ParticleSystem still has its own lowFX path */
      }
    }

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
    this.vsSplash = new VSSplash();
    this.tutorial = new Tutorial(this);

    // Entities
    this.player = new Dili(350, GAME_CONFIG.PHYSICS.GROUND_Y);
    this.opponent = new Tsunami(930, GAME_CONFIG.PHYSICS.GROUND_Y);
    this.playerCharacter = 'dili';
    // Sprite frames for the default duel must start loading immediately —
    // the sprite-only renderer has no legacy vector body to fall back on.
    loadCharacterSprites(this.player.charId, import.meta.env.BASE_URL);
    loadCharacterSprites(this.opponent.charId, import.meta.env.BASE_URL);
    this.projectiles = [];

    // Match State
    this.roundNumber = 1;
    this.matchTimer = GAME_CONFIG.MATCH.ROUND_TIME;
    this.matchState = 'INTRO'; // 'INTRO' | 'FIGHTING' | 'KO' | 'MATCH_OVER'
    this.stateTimer = 2.0;

    // The opponent stays idle until the player makes ANY input — an AFK
    // player must never get combo'd by the AI.
    this.playerHasActed = false;

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
    this.setupAutoPause();

    if (options.autoStart === false) {
      // Attract mode: a living arena idles behind the title screen until the
      // player picks a difficulty and beginMatch() starts the real bout.
      this.matchState = 'HOME';
    } else {
      this.startRound();
      this.tutorial.maybeStart(); // first-play guided walkthrough
    }
  }

  /**
   * Swap the fighter references for character select. The player picks a
   * character; the opponent becomes the OTHER fighter (AI-controlled).
   */
  configureFighters(playerCharId = 'dili') {
    const GY = GAME_CONFIG.PHYSICS.GROUND_Y;
    const CLASSES = { dili: Dili, tsunami: Tsunami, lafaek: Lafaek, manu: Manu };
    const PlayerClass = CLASSES[playerCharId] || Dili;
    // The campaign duel: pick Tsunami and Dili answers; otherwise Tsunami.
    const OppClass = playerCharId === 'tsunami' ? Dili : Tsunami;
    this.player = new PlayerClass(350, GY, { isPlayer: true, direction: 1 });
    this.opponent = new OppClass(930, GY, { isPlayer: false, direction: -1 });
    this.playerCharacter = this.player.charId;
    // Sprite-sheet trial: pull pose frames for both duelists (no-op until
    // loaded; the renderer falls back to vector meanwhile).
    loadCharacterSprites(this.player.charId, import.meta.env.BASE_URL);
    loadCharacterSprites(this.opponent.charId, import.meta.env.BASE_URL);
    // HUD trailing-health bars track whatever fighters are live now
    this.hud.reset();
  }

  /**
   * Kick off a fresh match from the title/difficulty flow. Safe to call
   * again later (acts like a full restart with a new difficulty).
   * @param {string|null} difficulty
   * @param {{arenaIndex?:number, levelId?:number, tag?:string,
   *          playerCharacter?:string, aiMods?:object,
   *          onMatchEnd?: (r:{playerWon:boolean, playerHealthPct:number,
   *          levelId?:number, tag?:string}) => void}} [opts]
   *   onMatchEnd replaces the default auto-restart so the lobby can show a
   *   results screen instead.
   */
  beginMatch(difficulty = null, opts = {}) {
    if (difficulty) Difficulty.set(difficulty);
    if (typeof document !== 'undefined') document.body.classList.add('in-match');
    if (opts.playerCharacter && opts.playerCharacter !== this.playerCharacter) {
      this.configureFighters(opts.playerCharacter);
    }
    // Guarantee frames for whoever is actually in the ring this match.
    loadCharacterSprites(this.player.charId, import.meta.env.BASE_URL);
    loadCharacterSprites(this.opponent.charId, import.meta.env.BASE_URL);
    this.vsSplash.setMatchup(this.player.charId, this.opponent.charId);
    // Per-level opponent brain tuning (campaign). Cleared for quick match.
    this.opponent.aiMods = opts.aiMods || null;
    if (Number.isInteger(opts.arenaIndex)) this.stage.select(opts.arenaIndex);
    else this.stage.unpin();
    this.levelId = opts.levelId ?? null;
    this.matchTag = opts.tag || 'quick';
    this.matchOppName = opts.oppName || null;
    this.matchEndHook = opts.onMatchEnd || null;
    if (this.pauseMenu.isPaused) this.pauseMenu.togglePause(false);
    clearTimeout(this.matchEndTimer);
    this.roundNumber = 1;
    this.player.roundsWon = 0;
    this.opponent.roundsWon = 0;
    this.startRound();
    this.tutorial.maybeStart();
  }

  /**
   * Park the engine back on the title/lobby backdrop: fighters reset to
   * their idle poses, combat state cleared, no HUD.
   */
  toAttract() {
    if (typeof document !== 'undefined') document.body.classList.remove('in-match');
    if (this.pauseMenu.isPaused) this.pauseMenu.togglePause(false);
    clearTimeout(this.matchEndTimer);
    this.matchState = 'HOME';
    this.matchEndHook = null;
    this.levelId = null;
    this.matchOppName = null;
    if (this.opponent) this.opponent.aiMods = null;
    this.projectiles = [];
    this.particleSystem.clear();
    this.player.reset(350, 1);
    this.opponent.reset(930, -1);
    this.playerHasActed = false;
    this.hitstop = 0;
    this.timeScale = 1.0;
    this.hud.reset();
  }

  setupResize() {
    const resize = () => this.resizeViewport();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);
    this.resizeViewport();
  }

  /**
   * Auto-pause whenever the player leaves the screen — tab switch, app
   * switch, minimize. Same spirit as opening the manual: the fight waits.
   */
  setupAutoPause() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && !this.pauseMenu.isPaused && this.matchState !== 'MATCH_OVER') {
        this.pauseMenu.togglePause(true);
      }
    });
  }

  resizeViewport() {
    // Native devicePixelRatio (3x on many phones) renders 9x the pixels of
    // 1x for zero visible benefit in a stylized game — cap it hard. The
    // player's Graphics Quality preset lowers the cap further at runtime.
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR, GraphicsQuality.dprCap());
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
    this.playerHasActed = false; // opponent waits for the player's first move

    // Rotate arena each round (first round of a match keeps the initial pick)
    if (this.roundNumber > 1) {
      this.stage.advance();
    }

    this.announcer.announce(
      `ROUND ${this.roundNumber}`,
      this.matchOppName || this.stage.arena.name,
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
    // Attract mode behind the title screen: the arena breathes (stage
    // animation, idle fighters, ambient particles) but nothing fights.
    if (this.matchState === 'HOME') {
      this.stage.update(dt, false);
      this.particleSystem.update(dt);
      this.player.update(dt, this.opponent, this.soundEngine, this.particleSystem, this.projectiles);
      this.opponent.update(dt, this.player, this.soundEngine, this.particleSystem, this.projectiles);
      this.inputManager.update();
      return;
    }

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
        // Only inputs from THIS moment on can wake the waiting opponent
        this.inputManager.markActivityEpoch();
        this.announcer.announce(
          'FIGHT!',
          this.playerHasActed ? '' : 'Opponent waits — make your move',
          this.playerHasActed ? 1.2 : 1.8,
          '#f59e0b'
        );
      }
    } else if (this.matchState === 'FIGHTING') {
      // Latch the first sign of life from the player (tutorial keeps the
      // world calm: no latch, no ticking clock while the guide runs)
      if (!this.playerHasActed && !this.tutorial.active && this.inputManager.hasAnyActivity()) {
        this.playerHasActed = true;
      }

      // Round timer only runs once the player has engaged
      if (this.playerHasActed && !this.tutorial.active) {
        this.matchTimer = Math.max(0, this.matchTimer - actorDt);

        // Timeout check
        if (this.matchTimer <= 0) {
          this.evaluateRoundWinner();
        }
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
      // Tsunami stays calm and idle until the player makes the first move
      // (and never acts during the tutorial — the guide is a safe sandbox)
      if (this.playerHasActed && !this.tutorial.active) {
        this.opponent.updateAI(actorDt, this.player, this.soundEngine);
      }
    }

    // Detect Shadow Mode triggers for announcements
    if (this.player.shadowSystem.isActive && this.player.shadowSystem.timer > GAME_CONFIG.MATCH.SHADOW_MODE_DURATION - 0.1) {
      this.announcer.showShadowBanner();
      this.camera.shake(12, 0.4);
    }

    // First-play guide progression (action-completed checks)
    this.tutorial.update();

    // Update Fighters
    this.player.update(actorDt, this.opponent, this.soundEngine, this.particleSystem, this.projectiles);
    this.opponent.update(effectiveDt, this.player, this.soundEngine, this.particleSystem, this.projectiles);

    // Body pushboxes: fighters are SOLID. They shove each other instead of
    // overlapping/phasing — no more "connected" feeling when walking.
    {
      const p = this.player, o = this.opponent;
      const minSep = 64;
      const dx = o.x - p.x;
      const bothUp = p.y >= 570 && o.y >= 570;
      if (bothUp && p.state !== 'KNOCKDOWN' && o.state !== 'KNOCKDOWN' && Math.abs(dx) < minSep) {
        const dir = dx === 0 ? (p.direction || 1) : Math.sign(dx);
        const push = (minSep - Math.abs(dx)) / 2;
        p.x -= push * dir;
        o.x += push * dir;
        const L = GAME_CONFIG.PHYSICS.STAGE_LEFT, R = GAME_CONFIG.PHYSICS.STAGE_RIGHT;
        p.x = Math.max(L, Math.min(R, p.x));
        o.x = Math.max(L, Math.min(R, o.x));
        // Cornered against a wall? shove the free fighter the rest
        const dx2 = o.x - p.x;
        if (Math.abs(dx2) < minSep) {
          const need = minSep - Math.abs(dx2);
          const d2 = dx2 === 0 ? dir : Math.sign(dx2);
          const oFree = o.x + need * d2 <= R && o.x + need * d2 >= L;
          if (oFree) o.x += need * d2;
          else p.x = Math.max(L, Math.min(R, p.x - need * d2));
        }
      }
    }

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
          p1Hitbox.properties.damage = Math.round(p1Hitbox.properties.damage * Difficulty.preset.playerDamage * (this.player.damageMult || 1));
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
          p2Hitbox.properties.damage = Math.round(p2Hitbox.properties.damage * Difficulty.preset.aiDamage * (this.opponent.damageMult || 1));
          this.opponent.hasHitOpponent = true;
          this.opponent.comboCount++;
          this.hud.showCombo(2, this.opponent.comboCount);

          const result = this.player.takeHit(p2Hitbox, this.opponent, this.soundEngine, this.particleSystem);
          this.camera.shake(p2Hitbox.properties.isHeavy ? 14 : 8, 0.22);
          this.applyHitFeel(result, p2Hitbox.properties.isHeavy);

          // Fairness: after landing a hit, Tsunami takes a breath before the
          // next decision — the player always gets a window to fight back
          // instead of being re-hit the instant stun ends (stun-lock).
          if (result === 'hit' || result === 'ko') {
            this.opponent.aiTimer = Math.max(this.opponent.aiTimer, p2Hitbox.properties.isHeavy ? 0.55 : 0.38);
          }

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
      projHitbox.properties.damage = Math.round(projHitbox.properties.damage *
        (proj.owner === this.player
          ? Difficulty.preset.playerDamage * (this.player.damageMult || 1)
          : Difficulty.preset.aiDamage * (this.opponent.damageMult || 1)));

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

        if (this.matchEndHook) {
          // Lobby flow: hand the outcome to the results screen. The hook is
          // kept alive for the whole match session (pause -> restart still
          // ends back on a results screen); only toAttract/beginMatch reset it.
          const hook = this.matchEndHook;
          clearTimeout(this.matchEndTimer);
          this.matchEndTimer = setTimeout(() => {
            hook({
              playerWon: isPlayerWin,
              playerHealthPct: Math.max(0, Math.round(
                (this.player.health / GAME_CONFIG.MATCH.MAX_HEALTH) * 100)),
              levelId: this.levelId ?? undefined,
              tag: this.matchTag,
            });
          }, 1600);
        } else {
          clearTimeout(this.matchEndTimer);
          this.matchEndTimer = setTimeout(() => {
            this.restartMatch();
          }, 4500);
        }
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

    // 2. Fighters (Render order based on who is attacking)
    if (this.player.state === 'ATTACKING') {
      this.opponent.render(ctx);
      this.player.render(ctx);
    } else {
      this.player.render(ctx);
      this.opponent.render(ctx);
    }

    // 3. Projectiles — above fighters so kunai never vanish behind bodies
    for (const proj of this.projectiles) {
      proj.render(ctx);
    }

    // 4. Particles & Slashes
    this.particleSystem.render(ctx);

    this.camera.restoreTransform(ctx);

    // Title screen (attract mode): show ONLY the living arena — no HUD, no
    // touch controls, no banners. The HTML home overlay sits on top.
    if (this.matchState === 'HOME') {
      ctx.restore();
      return;
    }

    // 5. Fixed HUD & UI Elements (canvas is currently in world-space transform)
    this.hud.render(ctx, this.player, this.opponent, this.matchTimer, this.roundNumber, this.projectiles);

    // Character-select splash on top of everything during the round intro
    if (this.matchState === 'INTRO') {
      this.vsSplash.render(ctx, this.vsSplash.len - Math.max(0, this.stateTimer));
    }

    // Guided first-play highlights above the HUD
    this.tutorial.render(ctx);

    this.joystick.render(ctx);
    this.touchButtons.render(ctx, this.player);
    this.announcer.render(ctx);

    ctx.restore();
  }

  run() {
    const loop = (currentTime) => {
      const frameTime = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;

      // Opaque menu screens (title/lobby) carry their own cinematic art —
      // skip all simulation + drawing behind them (battery/GPU rescue).
      if (!this.renderSuspended) {
        const dt = Math.min(frameTime, GAME_CONFIG.MAX_DELTA_TIME);
        this.accumulator += dt;

        while (this.accumulator >= GAME_CONFIG.FIXED_TIMESTEP) {
          this.update(GAME_CONFIG.FIXED_TIMESTEP);
          this.accumulator -= GAME_CONFIG.FIXED_TIMESTEP;
        }

        this.render();
      }
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  /** Pause the whole sim+draw loop while an opaque screen covers it. */
  suspendRendering(on) {
    this.renderSuspended = !!on;
  }
}

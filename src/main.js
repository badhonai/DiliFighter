/**
 * GameFlow — title -> auth -> lobby -> match -> results, all wired together.
 *
 * The engine always exists; screens decide what it shows:
 *  - lobby/title screens park it in attract mode (living arena backdrop)
 *  - PLAY transitions run the real fight and report results back to the DB
 */
import { GAME_CONFIG } from './config.js';
import { Engine } from './core/Engine.js';
import { GraphicsQuality } from './core/GraphicsQuality.js';
import { HomeScreen } from './ui/HomeScreen.js';
import { HelpMenu } from './ui/HelpMenu.js';
import { SettingsMenu } from './ui/SettingsMenu.js';
import { DifficultySelect } from './ui/DifficultySelect.js';
import { AuthScreen } from './ui/lobby/AuthScreen.js';
import { Lobby } from './ui/lobby/Lobby.js';
import { ResultScreen } from './ui/lobby/ResultScreen.js';
import { Auth } from './net/auth.js';
import { DB } from './net/db.js';
import { CAMPAIGN } from './data/campaign.js';

function initGame() {
  const canvas = document.getElementById('game-canvas');
  if (!canvas) return;

  const engine = new Engine(canvas, { autoStart: false });
  const helpMenu = new HelpMenu(engine);
  new SettingsMenu(engine, helpMenu);

  // ---------- session helpers ----------

  async function bindSession(session) {
    const username = Auth.usernameOf(session.user);
    await DB.bind(session.user.id, username);
    // Guests get a readable name the first time they arrive
    if (!DB.data.profile.username) {
      await DB.ensureUsername('Guest_' + Math.random().toString(36).slice(2, 6).toUpperCase());
    }
    applyCloudPrefs();
  }

  function applyCloudPrefs() {
    const s = DB.data.settings;
    if (s.graphics && GraphicsQuality.all().includes(s.graphics)) {
      GraphicsQuality.set(s.graphics, { persist: true });
      window.dispatchEvent(new Event('resize'));
    }
    if (typeof s.music === 'boolean' && engine.soundEngine.musicEnabled !== s.music) {
      engine.soundEngine.toggleMusic();
    }
  }

  function setInGameUI(visible) {
    document.body.classList.toggle('in-lobby', !visible);
  }

  async function ensureSession() {
    const session = await Auth.getSession();
    if (session) {
      await bindSession(session);
      return true;
    }
    return new Promise((resolve) => {
      new AuthScreen({
        onDone: async () => {
          const fresh = await Auth.getSession();
          if (fresh) await bindSession(fresh);
          resolve(true);
        },
        onBack: () => {
          home.show();
          resolve(false);
        },
      });
    });
  }

  // ---------- match lifecycle ----------

  function startMatch(diff, opts = {}) {
    setInGameUI(true);
    lobby.hide();
    engine.beginMatch(diff, opts);
  }

  function backToLobby() {
    engine.toAttract();
    lobby.show();
    setInGameUI(false);
  }

  const resultScreen = new ResultScreen({
    onRematch: () => startMatch(lastMatch.diff, lastMatch.opts),
    onNext: () => {
      const next = CAMPAIGN.find((c) => c.id === (lastMatch.level ? lastMatch.level.id + 1 : 0));
      if (next && DB.levelUnlocked(next.id)) startLevel(next, lastMatch.charId);
      else backToLobby();
    },
    onLobby: backToLobby,
  });

  let lastMatch = { diff: 'easy', opts: {}, level: null, charId: 'dili' };

  function selectedCharacter() {
    try { return localStorage.getItem('df_character') || 'dili'; } catch { return 'dili'; }
  }

  function onMatchEnd(r) {
    DB.reportMatch(r).then((reward) => {
      resultScreen.show({
        playerWon: r.playerWon,
        stars: reward.stars,
        coins: reward.coins,
        newItem: reward.newItem,
        unlockedNext: reward.unlockedNext,
        levelId: r.levelId,
      });
      setInGameUI(false);
    });
  }

  function startLevel(level, charId = selectedCharacter()) {
    lastMatch = {
      diff: level.diff,
      level,
      charId,
      opts: {
        arenaIndex: level.arena, levelId: level.id, tag: 'campaign',
        aiMods: level.mods, oppName: level.opp, playerCharacter: charId,
        onMatchEnd,
      },
    };
    startMatch(level.diff, lastMatch.opts);
  }

  // ---------- lobby ----------

  const lobby = new Lobby({
    onQuickMatch: (diff, charId) => {
      lastMatch = {
        diff, level: null, charId,
        opts: { tag: 'quick', playerCharacter: charId, onMatchEnd },
      };
      startMatch(diff, lastMatch.opts);
    },
    onLevel: startLevel,
    onSignOut: async () => {
      await Auth.signOut();
      DB.unbind();
      engine.toAttract();
      lobby.hide();
      setInGameUI(true);
      home.show();
    },
  });

  // ---------- title / quick-play path ----------

  const difficultySelect = new DifficultySelect((difficulty) => {
    const charId = selectedCharacter();
    lastMatch = {
      diff: difficulty, level: null, charId,
      opts: { tag: 'quick', playerCharacter: charId, onMatchEnd },
    };
    startMatch(difficulty, lastMatch.opts);
  });

  const home = new HomeScreen({
    onPlay: async () => {
      const ok = await ensureSession();
      if (!ok) return; // back-to-title was pressed
      difficultySelect.show();
    },
    onLobby: async () => {
      const ok = await ensureSession();
      if (!ok) return;
      backToLobby();
    },
    onHelp: () => helpMenu.open(),
    version: GAME_CONFIG.VERSION,
  });

  engine.run();

  // Returning player: silently restore the session so LOBBY opens instantly
  (async () => {
    const session = await Auth.getSession();
    if (session) await bindSession(session);
  })();

  // Expose on window for debugging & testing
  window.DiliFighter = engine;
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

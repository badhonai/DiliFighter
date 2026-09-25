/**
 * Lobby — the hub every mode hangs off: quick match, campaign, inventory,
 * profile, settings and graphics. Pure DOM (cheap to render, zero canvas
 * cost) layered over the engine's attract-mode arena.
 */
import { GAME_CONFIG } from '../../config.js';
import { Difficulty } from '../../core/Difficulty.js';
import { GraphicsQuality } from '../../core/GraphicsQuality.js';
import { DB } from '../../net/db.js';
import { CAMPAIGN, LEVEL_ITEMS } from '../../data/campaign.js';

const NAV = [
  { id: 'play',      label: 'PLAY',      icon: 'M8 5v14l11-7z' },
  { id: 'levels',    label: 'LEVELS',    icon: 'M3 17h4v-6H3v6zm7 0h4V7h-4v10zm7 0h4v-9h-4v9z' },
  { id: 'inventory', label: 'ITEMS',     icon: 'M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.3 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8z' },
  { id: 'profile',   label: 'PROFILE',   icon: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-8 1.7-8 5v3h16v-3c0-3.3-4.7-5-8-5z' },
  { id: 'settings',  label: 'SETTINGS',  icon: 'M19.4 13a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2.1-1.7-2-3.4-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3H9l-.3 2.9a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.4L4.6 11a7.8 7.8 0 0 0 0 2l-2.1 1.7 2 3.4 2.5-1a7.6 7.6 0 0 0 1.7 1L9 21h6l.3-2.9a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.4zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z' },
  { id: 'graphics',  label: 'GRAPHICS',  icon: 'M21 3H3v14h8v2H7v2h10v-2h-4v-2h8zM5 15V5h14v10z' },
];

const DIFF_INFO = {
  easy:   { name: 'EASY',   note: 'Tsunami holds back' },
  medium: { name: 'MEDIUM', note: 'A fair duel' },
  hard:   { name: 'HARD',   note: 'No mercy' },
};

export class Lobby {
  /**
   * @param {{onQuickMatch:(diff:string)=>void, onLevel:(level:object)=>void,
   *          onSignOut:()=>void}} opts
   */
  constructor({ onQuickMatch, onLevel, onSignOut }) {
    this.onQuickMatch = onQuickMatch;
    this.onLevel = onLevel;
    this.onSignOut = onSignOut;
    this.panel = 'play';
    this.quickDiff = Difficulty.current;
    this.createDOM();
    this.bindNav();
    DB.onChange(() => this.refreshHeader());
  }

  createDOM() {
    this.el = document.createElement('div');
    this.el.id = 'lobby';
    this.el.innerHTML = `
      <header class="lobby-top">
        <div class="lobby-brand">DILI<span>FIGHTER</span><em>v${GAME_CONFIG.VERSION}</em></div>
        <div class="lobby-player">
          <span class="lobby-player-dot" aria-hidden="true"></span>
          <span id="lobby-player-name">Player</span>
          <span id="lobby-player-badge" class="lobby-badge">GUEST</span>
          <span class="lobby-coins" id="lobby-coins" title="Coins">0</span>
        </div>
      </header>
      <div class="lobby-body">
        <nav class="lobby-nav">
          ${NAV.map((n) => `
            <button class="lobby-nav-btn ${n.id === 'play' ? 'active' : ''}" data-panel="${n.id}" type="button">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${n.icon}" fill="currentColor"/></svg>
              <span>${n.label}</span>
            </button>`).join('')}
        </nav>
        <main class="lobby-panel" id="lobby-panel"></main>
      </div>
    `;
    document.body.appendChild(this.el);
    this.panelEl = this.el.querySelector('#lobby-panel');
  }

  bindNav() {
    this.el.querySelectorAll('.lobby-nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.setPanel(btn.dataset.panel));
    });
  }

  setPanel(id) {
    this.panel = id;
    this.el.querySelectorAll('.lobby-nav-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.panel === id));
    this.renderPanel();
  }

  show() {
    this.el.classList.add('active');
    this.refreshHeader();
    this.renderPanel();
  }

  hide() {
    this.el.classList.remove('active');
  }

  refreshHeader() {
    this.el.querySelector('#lobby-player-name').textContent = DB.displayName();
    const badge = this.el.querySelector('#lobby-player-badge');
    const guest = DB.data.profile.is_guest;
    badge.textContent = guest ? 'GUEST' : 'FIGHTER';
    badge.classList.toggle('guest', guest);
    this.el.querySelector('#lobby-coins').textContent = DB.data.profile.coins;
  }

  // ------------------------------------------------------------ panels

  renderPanel() {
    const fn = {
      play: this.panelPlay,
      levels: this.panelLevels,
      inventory: this.panelInventory,
      profile: this.panelProfile,
      settings: this.panelSettings,
      graphics: this.panelGraphics,
    }[this.panel] || this.panelPlay;
    fn.call(this);
  }

  panelPlay() {
    this.panelEl.innerHTML = `
      <h2 class="panel-title">CHOOSE YOUR BATTLE</h2>
      <div class="mode-grid">
        <button class="mode-card" id="mode-quick" type="button">
          <div class="mode-name">QUICK MATCH</div>
          <div class="mode-desc">One duel against Tsunami. Pick your difficulty and fight.</div>
          <div class="quick-diff-row">
            ${Object.keys(DIFF_INFO).map((d) => `
              <span class="quick-diff ${d === this.quickDiff ? 'on' : ''}" data-diff="${d}">${DIFF_INFO[d].name}</span>`).join('')}
          </div>
          <div class="mode-cta">FIGHT</div>
        </button>

        <button class="mode-card" id="mode-campaign" type="button">
          <div class="mode-name">CAMPAIGN</div>
          <div class="mode-desc">Six trials across every arena. Earn stars, coins and trophies.</div>
          <div class="mode-progress">${CAMPAIGN.filter((c) => DB.starsOf(c.id) > 0).length}/${CAMPAIGN.length} cleared</div>
          <div class="mode-cta">CONTINUE</div>
        </button>

        <div class="mode-card locked" aria-disabled="true">
          <div class="mode-name">MULTIPLAYER</div>
          <div class="mode-desc">Fight players from around the world.</div>
          <div class="mode-soon">COMING SOON</div>
        </div>
      </div>
    `;

    this.panelEl.querySelectorAll('.quick-diff').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        this.quickDiff = chip.dataset.diff;
        Difficulty.set(this.quickDiff);
        this.panelEl.querySelectorAll('.quick-diff').forEach((c) =>
          c.classList.toggle('on', c.dataset.diff === this.quickDiff));
      });
    });
    this.panelEl.querySelector('#mode-quick').addEventListener('click', () => {
      this.onQuickMatch(this.quickDiff);
    });
    this.panelEl.querySelector('#mode-campaign').addEventListener('click', () => {
      this.setPanel('levels');
    });
  }

  panelLevels() {
    this.panelEl.innerHTML = `
      <h2 class="panel-title">CAMPAIGN — TRIALS OF THE SHADOW REALM</h2>
      <div class="level-grid">
        ${CAMPAIGN.map((lv) => {
          const unlocked = DB.levelUnlocked(lv.id);
          const stars = DB.starsOf(lv.id);
          return `
          <button class="level-card ${unlocked ? '' : 'locked'}" data-level="${lv.id}" type="button">
            <div class="level-num">${unlocked ? 'LV ' + lv.id : ''}</div>
            <div class="level-name">${unlocked ? lv.name : 'LOCKED'}</div>
            <div class="level-diff d-${lv.diff}">${DIFF_INFO[lv.diff].name}</div>
            <div class="level-stars">${[1, 2, 3].map((i) =>
              `<span class="lstar ${i <= stars ? 'on' : ''}">★</span>`).join('')}</div>
            <div class="level-desc">${unlocked ? lv.desc : 'Clear the previous trial to unlock.'}</div>
          </button>`;
        }).join('')}
      </div>
    `;
    this.panelEl.querySelectorAll('.level-card').forEach((card) => {
      card.addEventListener('click', () => {
        const lv = CAMPAIGN.find((c) => c.id === Number(card.dataset.level));
        if (lv && DB.levelUnlocked(lv.id)) this.onLevel(lv);
      });
    });
  }

  panelInventory() {
    const base = import.meta.env.BASE_URL;
    const items = Object.values(LEVEL_ITEMS);
    const owned = items.filter((it) => DB.hasItem(it.id)).length;
    this.panelEl.innerHTML = `
      <h2 class="panel-title">INVENTORY <em>${owned}/${items.length} trophies</em></h2>
      <div class="inv-grid">
        ${items.map((it) => {
          const has = DB.hasItem(it.id);
          const levelNo = Object.keys(LEVEL_ITEMS).find((k) => LEVEL_ITEMS[k].id === it.id);
          return `
          <div class="inv-card ${has ? '' : 'locked'} rarity-${it.rarity}">
            <div class="inv-icon"><img src="${base}icons/${it.icon}.svg" alt="" draggable="false" /></div>
            <div class="inv-name">${has ? it.name : '???'}</div>
            <div class="inv-rarity">${it.rarity.toUpperCase()}</div>
            <div class="inv-desc">${has ? it.desc : `Clear Level ${levelNo} to earn this trophy.`}</div>
          </div>`;
        }).join('')}
      </div>
    `;
  }

  panelProfile() {
    const p = DB.data.profile;
    const winRate = p.matches > 0 ? Math.round((p.wins / p.matches) * 100) : 0;
    const rows = [
      ['MATCHES', p.matches], ['WINS', p.wins], ['LOSSES', p.losses],
      ['WIN RATE', winRate + '%'], ['COINS', p.coins],
      ['LEVELS CLEARED', CAMPAIGN.filter((c) => DB.starsOf(c.id) > 0).length],
    ];
    this.panelEl.innerHTML = `
      <h2 class="panel-title">PROFILE</h2>
      <div class="profile-card">
        <div class="profile-id">
          <span class="lobby-player-dot big" aria-hidden="true"></span>
          <div>
            <div class="profile-name">${DB.displayName()}</div>
            <div class="lobby-badge ${p.is_guest ? 'guest' : ''}">${p.is_guest ? 'GUEST' : 'FIGHTER'}</div>
          </div>
        </div>
        <div class="profile-stats">
          ${rows.map(([k, v]) => `<div class="stat"><span class="stat-v">${v}</span><span class="stat-k">${k}</span></div>`).join('')}
        </div>
        ${p.is_guest ? `
          <p class="profile-note">Guest progress lives on this device. Create an account
          in Settings to keep it forever.</p>` : ''}
      </div>
    `;
  }

  panelSettings() {
    const p = DB.data.profile;
    this.panelEl.innerHTML = `
      <h2 class="panel-title">SETTINGS</h2>
      <div class="settings-list">
        <div class="settings-row" id="st-music" role="button" tabindex="0">
          <span class="settings-label">MUSIC</span>
          <span class="settings-value" id="st-music-state"></span>
        </div>
        <div class="settings-row">
          <span class="settings-label">ACCOUNT</span>
          <span class="settings-value dim">${p.is_guest ? 'Guest session' : DB.displayName()}</span>
        </div>
        <div class="settings-row" id="st-signout" role="button" tabindex="0">
          <span class="settings-label">SIGN OUT</span>
          <span class="settings-value link">CONFIRM</span>
        </div>
      </div>
      <div class="settings-foot">DILIFIGHTER v${GAME_CONFIG.VERSION} — Shadow Realm Arena</div>
    `;

    const musicRow = this.panelEl.querySelector('#st-music');
    const musicState = this.panelEl.querySelector('#st-music-state');
    const syncMusic = () => {
      const on = window.DiliFighter.soundEngine.musicEnabled;
      musicState.textContent = on ? 'ON' : 'OFF';
      musicState.classList.toggle('dim', !on);
    };
    syncMusic();
    musicRow.addEventListener('click', () => {
      window.DiliFighter.soundEngine.toggleMusic();
      window.DiliFighter.soundEngine.playUIClick();
      DB.setSetting('music', window.DiliFighter.soundEngine.musicEnabled);
      syncMusic();
    });

    this.panelEl.querySelector('#st-signout').addEventListener('click', () => this.onSignOut());
  }

  panelGraphics() {
    this.panelEl.innerHTML = `
      <h2 class="panel-title">GRAPHICS</h2>
      <p class="panel-sub">Lower quality if the fight ever stutters on your device. Changes apply instantly.</p>
      <div class="quality-row">
        ${GraphicsQuality.all().map((q) => `
          <button class="quality-btn ${GraphicsQuality.current === q ? 'on' : ''}" data-q="${q}" type="button">
            ${q.toUpperCase()}
          </button>`).join('')}
      </div>
      <div class="quality-notes">
        <div><strong>LOW</strong> — best for older phones: sharp-free rendering, fewer particles</div>
        <div><strong>MEDIUM</strong> — balanced: smoother image, reduced effects</div>
        <div><strong>HIGH</strong> — full resolution and effects</div>
      </div>
    `;
    this.panelEl.querySelectorAll('.quality-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        GraphicsQuality.set(btn.dataset.q);
        DB.setSetting('graphics', btn.dataset.q);
        window.DiliFighter.soundEngine.playUIClick();
        // Force the engine to re-measure with the new DPR cap
        window.dispatchEvent(new Event('resize'));
        this.panelEl.querySelectorAll('.quality-btn').forEach((b) =>
          b.classList.toggle('on', b.dataset.q === GraphicsQuality.current));
      });
    });
  }
}

/**
 * Lobby — the hub every mode hangs off. Pure DOM (cheap to render, zero
 * canvas cost) layered over the engine's attract-mode arena.
 *
 * Sections: PLAY · LEVELS · FIGHTERS · SOCIAL (friends + ranking) ·
 * PROFILE · SETTINGS · GRAPHICS.
 */
import { GAME_CONFIG } from '../../config.js';
import { Difficulty } from '../../core/Difficulty.js';
import { GraphicsQuality } from '../../core/GraphicsQuality.js';
import { DB } from '../../net/db.js';
import { Social } from '../../net/social.js';
import { Auth } from '../../net/auth.js';
import { CAMPAIGN } from '../../data/campaign.js';
import { ROSTER, characterById, isUnlocked } from '../../data/roster.js';

const NAV = [
  { id: 'play',      label: 'PLAY',     icon: 'M8 5v14l11-7z' },
  { id: 'levels',    label: 'LEVELS',   icon: 'M3 17h4v-6H3v6zm7 0h4V7h-4v10zm7 0h4v-9h-4v9z' },
  { id: 'fighters',  label: 'FIGHTERS', icon: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-7 8c0-3 3.5-4.6 7-4.6s7 1.6 7 4.6v1H5z' },
  { id: 'social',    label: 'SOCIAL',   icon: 'M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm-8 1a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.3 0-6 1.2-6 3.5V19h9.4a5.6 5.6 0 0 1-.4-2 4.4 4.4 0 0 1 .5-2zm8-2c-.6 0-1.2 0-1.7.2A5 5 0 0 1 16 14c0 .9 0 1.6-.2 2.2.7.5 1.2 1.2 1.2 1.8H22v-1.5c0-2.3-3.7-3.5-6-3.5z' },
  { id: 'profile',   label: 'PROFILE',  icon: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-3.3 0-8 1.7-8 5v3h16v-3c0-3.3-4.7-5-8-5z' },
  { id: 'settings',  label: 'SETTINGS', icon: 'M19.4 13a7.8 7.8 0 0 0 .1-1 7.8 7.8 0 0 0-.1-1l2.1-1.7-2-3.4-2.5 1a7.6 7.6 0 0 0-1.7-1L15 3H9l-.3 2.9a7.6 7.6 0 0 0-1.7 1l-2.5-1-2 3.4L4.6 11a7.8 7.8 0 0 0 0 2l-2.1 1.7 2 3.4 2.5-1a7.6 7.6 0 0 0 1.7 1L9 21h6l.3-2.9a7.6 7.6 0 0 0 1.7-1l2.5 1 2-3.4zM12 15.5A3.5 3.5 0 1 1 15.5 12 3.5 3.5 0 0 1 12 15.5z' },
  { id: 'graphics',  label: 'GRAPHICS', icon: 'M21 3H3v14h8v2H7v2h10v-2h-4v-2h8zM5 15V5h14v10z' },
];

const DIFF_INFO = {
  easy:   { name: 'EASY',   note: 'Tsunami holds back' },
  medium: { name: 'MEDIUM', note: 'A fair duel' },
  hard:   { name: 'HARD',   note: 'No mercy' },
};

export class Lobby {
  /**
   * @param {{onQuickMatch:(diff:string, charId:string)=>void,
   *          onLevel:(level:object, charId:string)=>void,
   *          onSignOut:()=>void}} opts
   */
  constructor({ onQuickMatch, onLevel, onSignOut }) {
    this.onQuickMatch = onQuickMatch;
    this.onLevel = onLevel;
    this.onSignOut = onSignOut;
    this.panel = 'play';
    this.socialTab = 'friends';
    this.quickDiff = Difficulty.current;
    this.selectedChar = this._loadChar();
    this.createDOM();
    this.bindNav();
    DB.onChange(() => this.refreshChrome());
  }

  _loadChar() {
    const fromCloud = DB.data.settings && DB.data.settings.character;
    try {
      const local = localStorage.getItem('df_character');
      return characterById(fromCloud || local).id;
    } catch { return characterById(fromCloud).id; }
  }

  setCharacter(id) {
    this.selectedChar = characterById(id).id;
    try { localStorage.setItem('df_character', this.selectedChar); } catch { /* ignore */ }
    DB.setSetting('character', this.selectedChar);
    if (this.el) this.refreshChrome(); // backdrop + avatar follow the pick
  }

  createDOM() {
    const base = import.meta.env.BASE_URL;
    this.el = document.createElement('div');
    this.el.id = 'lobby';
    // Reference layout: cinematic full-body backdrop (swaps with the
    // selected fighter), floating glass top bar, fanned glass card dock.
    const DOCK = [
      { id: 'social',   label: 'SOCIAL',   icon: NAV.find((n) => n.id === 'social').icon },
      { id: 'levels',   label: 'LEVELS',   icon: NAV.find((n) => n.id === 'levels').icon },
      { id: 'play',     label: 'PLAY',     icon: 'M6 4l7 6-7 6V4zm9 2l7 6-7 6V6z' },
      { id: 'fighters', label: 'FIGHTERS', icon: NAV.find((n) => n.id === 'fighters').icon },
      { id: 'profile',  label: 'PROFILE',  icon: NAV.find((n) => n.id === 'profile').icon },
    ];
    const TILT = [-6, -3, 0, 3, 6];
    this.el.innerHTML = `
      <div class="lobby-bg" id="lobby-bg" aria-hidden="true"></div>
      <header class="lobby-top">
        <div class="lobby-id">
          <img class="lobby-avatar" id="lobby-avatar" src="${base}brand/dili_happy.gif" alt="" draggable="false" />
          <div class="lobby-id-text">
            <span id="lobby-player-name">Player</span>
            <span id="lobby-player-lvl" class="lobby-lvl">LVL 1</span>
          </div>
        </div>
        <div class="lobby-logo">DILI<span>FIGHTER</span></div>
        <div class="lobby-currencies">
          <span class="cur cur-coins" title="Coins"><b id="lobby-coins">0</b></span>
          <span class="cur cur-stars" title="Total stars">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l7 7-7 13L5 9l7-7z" fill="#38bdf8"/></svg>
            <b id="lobby-stars">0</b>
          </span>
          <span class="cur cur-prog" title="Campaign progress">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2z" fill="#4ade80"/></svg>
            <b id="lobby-prog">0/8</b>
          </span>
          <button class="lobby-pill" data-panel="settings" type="button" aria-label="Settings">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm8.6 5.2.1-1.7-.1-1.7 2-1.5-1.9-3.3-2.4.9a8 8 0 0 0-2.9-1.7L15 2h-3.8l-.4 2.7a8 8 0 0 0-2.9 1.7l-2.4-.9L3.6 8.8l2 1.5-.2 1.7.2 1.7-2 1.5 1.9 3.3 2.4-.9a8 8 0 0 0 2.9 1.7L11.2 22h3.8l.4-2.7a8 8 0 0 0 2.9-1.7l2.4.9 1.9-3.3-2-1.5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
          </button>
          <button class="lobby-pill" data-panel="graphics" type="button" aria-label="Graphics">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3H3v14h8v2H7v2h10v-2h-4v-2h8zM5 5h14v10H5z" fill="currentColor"/></svg>
          </button>
        </div>
      </header>
      <main class="lobby-panel" id="lobby-panel"></main>
      <nav class="lobby-dock" aria-label="Sections">
        ${DOCK.map((n, i) => `
          <button class="dock-card ${n.id === 'play' ? 'cta' : ''}" data-panel="${n.id}" type="button" style="--tilt:${TILT[i]}deg">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${n.icon}" fill="currentColor"/></svg>
            <span class="dock-label">${n.label}</span>
            <span class="dock-sub" id="dock-sub-${n.id}"></span>
          </button>`).join('')}
      </nav>
    `;
    document.body.appendChild(this.el);
    this.panelEl = this.el.querySelector('#lobby-panel');
    this.bgEl = this.el.querySelector('#lobby-bg');
  }

  bindNav() {
    this.el.querySelectorAll('[data-panel]').forEach((btn) => {
      if (btn.classList.contains('lobby-pill')) {
        btn.addEventListener('click', () => this.setPanel(btn.dataset.panel));
        return;
      }
      if (btn.classList.contains('dock-card')) {
        btn.addEventListener('click', () => {
          if (btn.dataset.panel === 'play') {
            // PLAY is the CTA card: straight into a quick duel.
            this.onQuickMatch('medium', this.selectedChar);
          } else {
            this.setPanel(btn.dataset.panel);
          }
        });
      }
    });
  }

  setPanel(id) {
    this.panel = id;
    this.el.querySelectorAll('.dock-card').forEach((b) =>
      b.classList.toggle('active', b.dataset.panel === id));
    this.renderPanel();
  }

  show() {
    this.el.classList.add('active');
    this.refreshChrome();
    this.renderPanel();
  }

  hide() {
    this.el.classList.remove('active');
  }

  /** Top bar currencies/id + backdrop + dock sublabels (reference layout). */
  refreshChrome() {
    const base = import.meta.env.BASE_URL;
    const char = characterById(this.selectedChar);
    const p = DB.data.profile;
    const lvl = DB.data.progress.highest_level;

    this.el.querySelector('#lobby-player-name').textContent = DB.displayName();
    this.el.querySelector('#lobby-player-lvl').textContent = `LVL ${lvl}`;
    const avatar = this.el.querySelector('#lobby-avatar');
    const src = char.portrait ? `${base}${char.portrait}` : `${base}brand/dili_happy.gif`;
    if (avatar.dataset.src !== src) { avatar.dataset.src = src; avatar.src = src; }

    this.el.querySelector('#lobby-coins').textContent = p.coins;
    const totalStars = CAMPAIGN.reduce((a, c) => a + DB.starsOf(c.id), 0);
    this.el.querySelector('#lobby-stars').textContent = totalStars;
    const cleared = CAMPAIGN.filter((c) => DB.starsOf(c.id) > 0).length;
    this.el.querySelector('#lobby-prog').textContent = `${cleared}/${CAMPAIGN.length}`;

    // Cinematic backdrop follows the selected fighter.
    this.bgEl.style.backgroundImage = `url('${base}lobby/bg_${char.id}.jpg')`;

    // Dock sublabels
    const unlockedCount = ROSTER.filter((c) => !c.comingSoon && isUnlocked(c, (id) => DB.starsOf(id))).length;
    const playable = ROSTER.filter((c) => !c.comingSoon).length;
    const subs = {
      play: 'QUICK DUEL',
      levels: `CAMPAIGN ${cleared}-${cleared + 1 > CAMPAIGN.length ? CAMPAIGN.length : cleared + 1}`,
      fighters: `ROSTER ${unlockedCount}/${playable}`,
      social: p.is_guest ? 'GO ACCOUNT' : 'FRIENDS & RANKS',
      profile: `${p.is_guest ? 'GUEST' : 'FIGHTER'} · LVL ${lvl}`,
    };
    for (const [id, text] of Object.entries(subs)) {
      const el = this.el.querySelector(`#dock-sub-${id}`);
      if (el) el.textContent = text;
    }
  }

  renderPanel() {
    // PLAY shows the bare cinematic backdrop (dock CTA starts the duel).
    this.panelEl.classList.toggle('empty', this.panel === 'play');
    const fn = {
      play: this.panelPlay,
      levels: this.panelLevels,
      fighters: this.panelFighters,
      social: this.panelSocial,
      profile: this.panelProfile,
      settings: this.panelSettings,
      graphics: this.panelGraphics,
    }[this.panel] || this.panelPlay;
    fn.call(this);
  }

  // ------------------------------------------------------------ PLAY

  panelPlay() {
    // The backdrop IS the play panel; nothing renders in the sheet.
    this.panelEl.innerHTML = '';
  }

  // ------------------------------------------------------------ LEVELS

  panelLevels() {
    this.panelEl.innerHTML = `
      <h2 class="panel-title">CAMPAIGN <em>more levels, tougher storms</em></h2>
      <div class="level-grid">
        ${CAMPAIGN.map((lv) => {
          const unlocked = DB.levelUnlocked(lv.id);
          const stars = DB.starsOf(lv.id);
          return `
          <button class="level-card ${unlocked ? '' : 'locked'}" data-level="${lv.id}" type="button">
            <div class="level-num">${unlocked ? 'LV ' + lv.id : ''}</div>
            <div class="level-name">${unlocked ? lv.name : 'LOCKED'}</div>
            ${unlocked ? `<div class="level-opp">${lv.opp}</div>` : ''}
            <div class="level-meta">
              <span class="level-diff d-${lv.diff}">${DIFF_INFO[lv.diff].name}</span>
              <span class="level-stars">${[1, 2, 3].map((i) =>
                `<span class="lstar ${i <= stars ? 'on' : ''}">★</span>`).join('')}</span>
            </div>
            <div class="level-desc">${unlocked ? lv.desc : 'Clear the previous trial to unlock.'}</div>
          </button>`;
        }).join('')}
      </div>
    `;
    this.panelEl.querySelectorAll('.level-card').forEach((card) => {
      card.addEventListener('click', () => {
        const lv = CAMPAIGN.find((c) => c.id === Number(card.dataset.level));
        if (lv && DB.levelUnlocked(lv.id)) this.onLevel(lv, this.selectedChar);
      });
    });
  }

  // ------------------------------------------------------------ FIGHTERS

  panelFighters() {
    const base = import.meta.env.BASE_URL;
    const picked = characterById(this.selectedChar);
    this.panelEl.innerHTML = `
      <h2 class="panel-title">CHOOSE YOUR FIGHTER</h2>
      <p class="panel-sub">FIGHTING AS: <strong style="color:${picked.accent}">${picked.name}</strong> — tap a portrait to switch.</p>
      <div class="roster-grid">
        ${ROSTER.map((c) => {
          const unlocked = isUnlocked(c, (id) => DB.starsOf(id));
          const selected = this.selectedChar === c.id;
          return `
          <button type="button" class="roster-card ${selected ? 'selected' : ''} ${unlocked ? '' : 'locked'}" data-char="${c.id}" ${unlocked ? '' : 'aria-disabled="true"'}>
            <div class="roster-portrait" style="--accent:${c.accent}">
              ${c.portrait ? `<img src="${base}${c.portrait}" alt="" draggable="false" />` : ''}
              ${!unlocked && !c.comingSoon ? `<div class="roster-lock">CLEAR LEVEL ${c.unlockLevel}</div>` : ''}
              ${c.comingSoon ? '<div class="roster-lock">COMING SOON</div>' : ''}
            </div>
            <div class="roster-name" style="color:${unlocked ? c.accent : '#51617d'}">${c.name}</div>
            <div class="roster-sub">${c.subtitle}</div>
            <div class="roster-style">${c.style}</div>
            ${unlocked ? `<div class="roster-pick">${selected ? 'SELECTED' : 'SELECT'}</div>` : ''}
          </button>`;
        }).join('')}
      </div>
    `;
    this.panelEl.querySelectorAll('.roster-card').forEach((card) => {
      card.addEventListener('click', () => {
        const c = characterById(card.dataset.char);
        if (card.classList.contains('locked') || c.comingSoon) return;
        this.setCharacter(c.id);
        this.panelFighters();
      });
    });
  }

  // ------------------------------------------------------------ SOCIAL

  panelSocial() {
    this.panelEl.innerHTML = `
      <h2 class="panel-title">SOCIAL</h2>
      <div class="social-tabs">
        <button class="social-tab ${this.socialTab === 'friends' ? 'active' : ''}" data-tab="friends" type="button">FRIENDS</button>
        <button class="social-tab ${this.socialTab === 'ranking' ? 'active' : ''}" data-tab="ranking" type="button">RANKING</button>
      </div>
      <div id="social-content" class="social-content"></div>
    `;
    this.panelEl.querySelectorAll('.social-tab').forEach((t) => {
      t.addEventListener('click', () => {
        this.socialTab = t.dataset.tab;
        this.panelSocial();
      });
    });
    if (this.socialTab === 'friends') this.renderFriends();
    else this.renderRanking();
  }

  async renderFriends() {
    const box = this.panelEl.querySelector('#social-content');
    if (DB.data.profile.is_guest) {
      box.innerHTML = `<p class="social-note">Create a real account (Profile section) to search players,
        send friend requests and appear on the ranking board.</p>`;
      return;
    }
    box.innerHTML = `
      <div class="friend-search-row">
        <input id="friend-search" type="text" maxlength="16" placeholder="Search exact username…" spellcheck="false" />
        <button id="friend-search-btn" class="btn-action btn-small" type="button">SEARCH</button>
      </div>
      <div id="friend-search-results"></div>
      <div id="friend-requests"></div>
      <div id="friend-list"></div>
    `;

    const input = box.querySelector('#friend-search');
    const results = box.querySelector('#friend-search-results');
    const doSearch = async () => {
      const q = input.value.trim();
      if (!q) return;
      results.innerHTML = '<p class="social-note">Searching…</p>';
      const res = await Social.searchPlayers(q);
      if (!res.ok) { results.innerHTML = `<p class="social-note">${res.error}</p>`; return; }
      if (!res.rows.length) {
        results.innerHTML = `<p class="social-note">No fighter named “${q}” found. Usernames are exact.</p>`;
        return;
      }
      results.innerHTML = res.rows.map((r) => `
        <div class="friend-row">
          <span class="friend-name">${r.nickname || r.username}</span>
          <span class="friend-sub">LV ${r.highest_level} · ★${r.total_stars}</span>
          <button class="btn-action btn-small" data-add="${r.user_id || r.id}" type="button">ADD</button>
        </div>`).join('');
      results.querySelectorAll('[data-add]').forEach((b) => {
        b.addEventListener('click', async () => {
          b.disabled = true;
          const r2 = await Social.sendRequest(b.dataset.add);
          b.textContent = r2.ok ? 'SENT' : 'FAILED';
          if (r2.ok) setTimeout(() => this.renderFriends(), 500);
        });
      });
    };
    box.querySelector('#friend-search-btn').addEventListener('click', doSearch);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

    await this.refreshFriendList();
  }

  async refreshFriendList() {
    const box = this.panelEl.querySelector('#social-content');
    if (!box) return;
    const reqBox = box.querySelector('#friend-requests');
    const listBox = box.querySelector('#friend-list');
    if (!reqBox || !listBox) return;

    const res = await Social.friendList();
    if (!res.ok) {
      listBox.innerHTML = `<p class="social-note">${res.error}</p>`;
      return;
    }
    const incoming = res.rows.filter((r) => r.status === 'pending' && r.direction === 'in');
    const outgoing = res.rows.filter((r) => r.status === 'pending' && r.direction === 'out');
    const friends = res.rows.filter((r) => r.status === 'accepted');

    reqBox.innerHTML = incoming.length ? `
      <h3 class="social-h">INCOMING REQUESTS</h3>
      ${incoming.map((r) => `
        <div class="friend-row">
          <span class="friend-name">${r.nickname || r.username}</span>
          <span class="friend-sub">LV ${r.highest_level}</span>
          <button class="btn-action btn-small" data-accept="${r.friendship_id}" type="button">ACCEPT</button>
          <button class="btn-action btn-small btn-dim" data-decline="${r.friendship_id}" type="button">DECLINE</button>
        </div>`).join('')}` : '';

    reqBox.querySelectorAll('[data-accept]').forEach((b) => {
      b.addEventListener('click', async () => {
        await Social.acceptRequest(b.dataset.accept);
        this.refreshFriendList();
      });
    });
    reqBox.querySelectorAll('[data-decline]').forEach((b) => {
      b.addEventListener('click', async () => {
        await Social.removeFriendship(b.dataset.decline);
        this.refreshFriendList();
      });
    });

    const rows = [
      ...friends.map((r) => ({ ...r, tag: '' })),
      ...outgoing.map((r) => ({ ...r, tag: ' · REQUEST SENT' })),
    ];
    listBox.innerHTML = `
      <h3 class="social-h">YOUR FRIENDS ${friends.length ? `(${friends.length})` : ''}</h3>
      ${rows.length ? rows.map((r) => `
        <div class="friend-row">
          <span class="friend-name">${r.nickname || r.username}${r.tag}</span>
          <span class="friend-sub">LV ${r.highest_level} · ★${r.total_stars ?? ''}</span>
          <button class="btn-action btn-small btn-dim" data-view='${JSON.stringify({
            username: r.username, nickname: r.nickname, level: r.highest_level,
          })}' type="button">PROFILE</button>
          <button class="friend-x" data-remove="${r.friendship_id}" title="Remove" type="button">&times;</button>
        </div>`).join('')
      : '<p class="social-note">No friends yet. Search a username above to send a request.</p>'}
    `;
    listBox.querySelectorAll('[data-view]').forEach((b) => {
      b.addEventListener('click', () => this.showPlayerCard(JSON.parse(b.dataset.view)));
    });
    listBox.querySelectorAll('[data-remove]').forEach((b) => {
      b.addEventListener('click', async () => {
        await Social.removeFriendship(b.dataset.remove);
        this.refreshFriendList();
      });
    });
  }

  async renderRanking() {
    const box = this.panelEl.querySelector('#social-content');
    box.innerHTML = '<p class="social-note">Loading ranking…</p>';
    const res = await Social.leaderboard();
    if (!res.ok) { box.innerHTML = `<p class="social-note">${res.error || 'Ranking unavailable.'}</p>`; return; }
    if (!res.rows.length) {
      box.innerHTML = '<p class="social-note">No ranked fighters yet — clear campaign levels to claim the top.</p>';
      return;
    }
    box.innerHTML = `
      <p class="social-note">Ranked by campaign level, then total stars.</p>
      <div class="rank-list">
        ${res.rows.map((r) => `
          <div class="rank-row ${r.user_id === DB.userId ? 'me' : ''}">
            <span class="rank-pos">${r.rank}</span>
            <span class="friend-name">${r.nickname || r.username}${r.user_id === DB.userId ? ' (YOU)' : ''}</span>
            <span class="friend-sub">LV ${r.highest_level} · ★${r.total_stars}</span>
          </div>`).join('')}
      </div>
    `;
  }

  showPlayerCard({ username, nickname, level }) {
    const old = document.getElementById('player-card');
    if (old) old.remove();
    const card = document.createElement('div');
    card.id = 'player-card';
    card.innerHTML = `
      <div class="player-card-inner">
        <h3>${nickname || username}</h3>
        <p class="friend-sub">@${username} · Campaign level ${level}</p>
        <button class="btn-action btn-small" id="player-card-close" type="button">CLOSE</button>
      </div>
    `;
    document.body.appendChild(card);
    card.addEventListener('click', (e) => {
      if (e.target === card || e.target.id === 'player-card-close') card.remove();
    });
  }

  // ------------------------------------------------------------ PROFILE

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

        <div class="nickname-row">
          <span class="settings-label">NICKNAME</span>
          <input id="nickname-input" type="text" maxlength="16" spellcheck="false"
                 placeholder="${Auth.usernameOf ? (p.username || 'your username') : 'your username'}"
                 value="${p.nickname || ''}" />
          <button id="nickname-save" class="btn-action btn-small" type="button">SAVE</button>
          <span id="nickname-msg" class="nickname-msg"></span>
        </div>

        <div class="profile-stats">
          ${rows.map(([k, v]) => `<div class="stat"><span class="stat-v">${v}</span><span class="stat-k">${k}</span></div>`).join('')}
        </div>
        ${p.is_guest ? `
          <p class="profile-note">Guest progress lives on this device and can't appear on the
          ranking board. Create an account on the title screen to keep it forever.</p>` : ''}
      </div>
    `;

    const input = this.panelEl.querySelector('#nickname-input');
    const msg = this.panelEl.querySelector('#nickname-msg');
    this.panelEl.querySelector('#nickname-save').addEventListener('click', async () => {
      msg.textContent = 'Saving…';
      const res = await Social.setNickname(input.value);
      if (res.ok) {
        DB.data.profile.nickname = res.nickname;
        DB._persist();
        msg.textContent = 'Saved.';
        this.refreshChrome();
      } else {
        msg.textContent = res.error;
      }
    });
  }

  // ------------------------------------------------------------ SETTINGS

  panelSettings() {
    const p = DB.data.profile;
    this.panelEl.innerHTML = `
      <h2 class="panel-title">SETTINGS</h2>
      <div class="settings-list">
        <button type="button" class="settings-row" id="st-music">
          <span class="settings-label">MUSIC</span>
          <span class="settings-value" id="st-music-state"></span>
        </button>
        <div class="settings-row">
          <span class="settings-label">ACCOUNT</span>
          <span class="settings-value dim">${p.is_guest ? 'Guest session' : '@' + (p.username || DB.displayName())}</span>
        </div>
        <button type="button" class="settings-row" id="st-signout">
          <span class="settings-label">SIGN OUT</span>
          <span class="settings-value link">CONFIRM</span>
        </button>
      </div>
      <div class="settings-foot">DILIFIGHTER v${GAME_CONFIG.VERSION} — Shadow Realm Arena</div>
    `;

    const musicState = this.panelEl.querySelector('#st-music-state');
    const syncMusic = () => {
      const on = window.DiliFighter.soundEngine.musicEnabled;
      musicState.textContent = on ? 'ON' : 'OFF';
      musicState.classList.toggle('dim', !on);
    };
    syncMusic();
    this.panelEl.querySelector('#st-music').addEventListener('click', () => {
      window.DiliFighter.soundEngine.toggleMusic();
      window.DiliFighter.soundEngine.playUIClick();
      DB.setSetting('music', window.DiliFighter.soundEngine.musicEnabled);
      syncMusic();
    });

    this.panelEl.querySelector('#st-signout').addEventListener('click', () => this.onSignOut());
  }

  // ------------------------------------------------------------ GRAPHICS

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
        <div><strong>LOW</strong> — best for older phones: lighter rendering, fewer particles</div>
        <div><strong>MEDIUM</strong> — balanced: smoother image, reduced effects</div>
        <div><strong>HIGH</strong> — full resolution and effects</div>
      </div>
    `;
    this.panelEl.querySelectorAll('.quality-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        GraphicsQuality.set(btn.dataset.q);
        DB.setSetting('graphics', btn.dataset.q);
        window.DiliFighter.soundEngine.playUIClick();
        window.dispatchEvent(new Event('resize'));
        this.panelEl.querySelectorAll('.quality-btn').forEach((b) =>
          b.classList.toggle('on', b.dataset.q === GraphicsQuality.current));
      });
    });
  }
}

/**
 * ResultScreen — shown after every match started from the lobby:
 * outcome, star rating (campaign), rewards, and where to go next.
 */
import { CAMPAIGN } from '../../data/campaign.js';

export class ResultScreen {
  /**
   * @param {{onRematch: () => void, onNext: (() => void)|null, onLobby: () => void}} opts
   */
  constructor({ onRematch, onNext = null, onLobby }) {
    this.onRematch = onRematch;
    this.onNext = onNext;
    this.onLobby = onLobby;
    this.el = null;
  }

  /**
   * @param {{playerWon:boolean, stars?:number, coins:number, newItem?:object,
   *          unlockedNext?:boolean, levelId?:number}} r
   */
  show(r) {
    this.hide();
    const level = r.levelId ? CAMPAIGN.find((c) => c.id === r.levelId) : null;
    const won = r.playerWon;

    const starsHtml = level && won
      ? `<div class="result-stars">${[1, 2, 3].map((i) =>
          `<span class="rstar ${i <= (r.stars || 0) ? 'on' : ''}">★</span>`).join('')}</div>`
      : '';

    const rewards = [];
    if (r.coins > 0) rewards.push(`<div class="reward-line coins">+${r.coins} COINS</div>`);
    if (r.newItem) rewards.push(
      `<div class="reward-line item">NEW ITEM UNLOCKED — <strong>${r.newItem.name}</strong></div>`);
    if (r.unlockedNext) rewards.push(
      `<div class="reward-line unlock">NEXT LEVEL UNLOCKED</div>`);

    this.el = document.createElement('div');
    this.el.id = 'result-screen';
    this.el.innerHTML = `
      <div class="result-card ${won ? 'win' : 'loss'}">
        <div class="result-kicker">${level ? `LEVEL ${level.id} — ${level.name}` : 'QUICK MATCH'}</div>
        <h2 class="result-title">${won ? 'VICTORY' : 'DEFEAT'}</h2>
        ${starsHtml}
        <p class="result-sub">${won
          ? (level ? 'Tsunami has been defeated.' : 'Well fought, warrior.')
          : 'Tsunami stands. Train and return.'}</p>
        <div class="result-rewards">${rewards.join('') || '<div class="reward-line none">No rewards this time.</div>'}</div>
        <div class="result-actions">
          <button id="result-rematch" class="btn-action" type="button">${won ? 'REMATCH' : 'TRY AGAIN'}</button>
          ${this.onNext && won ? '<button id="result-next" class="btn-action btn-secondary" type="button">NEXT LEVEL</button>' : ''}
          <button id="result-lobby" class="btn-action btn-secondary" type="button">LOBBY</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.el);

    this.el.querySelector('#result-rematch').addEventListener('click', () => { this.hide(); this.onRematch(); });
    const next = this.el.querySelector('#result-next');
    if (next) next.addEventListener('click', () => { this.hide(); this.onNext(); });
    this.el.querySelector('#result-lobby').addEventListener('click', () => { this.hide(); this.onLobby(); });
  }

  hide() {
    if (this.el) { this.el.remove(); this.el = null; }
  }
}

import { Difficulty } from '../core/Difficulty.js';

/**
 * DifficultySelect — shown right after PLAY NOW, before every match starts.
 * Three cards with a one-line promise each; the last-used difficulty comes
 * pre-selected. Real fighting games ask this up-front, not buried in pause.
 */
const CARDS = [
  {
    id: 'easy',
    name: 'EASY',
    blurb: 'Tsunami holds back. Learn the ropes and land your hits.',
    pips: 1,
  },
  {
    id: 'medium',
    name: 'MEDIUM',
    blurb: 'A fair duel. No mercy given, none received.',
    pips: 2,
  },
  {
    id: 'hard',
    name: 'HARD',
    blurb: 'Tsunami fights to win. Fast reads, heavy hands.',
    pips: 3,
  },
];

export class DifficultySelect {
  /** @param {(difficulty: string) => void} onSelect */
  constructor(onSelect) {
    this.onSelect = onSelect;
    this.selected = Difficulty.current;
    this.createDOM();
    this.bindEvents();
  }

  createDOM() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'difficulty-modal';
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = `
      <div class="modal-card difficulty-card">
        <h2 class="modal-title">CHOOSE YOUR DIFFICULTY</h2>
        <p class="difficulty-sub">How should Tsunami fight you?</p>
        <div class="difficulty-grid">
          ${CARDS.map((c) => `
            <button class="diff-option" data-diff="${c.id}" type="button">
              <span class="diff-name">${c.name}</span>
              <span class="diff-pips" aria-hidden="true">
                ${'<i class="pip on"></i>'.repeat(c.pips)}${'<i class="pip"></i>'.repeat(3 - c.pips)}
              </span>
              <span class="diff-blurb">${c.blurb}</span>
            </button>`).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(this.overlay);
  }

  bindEvents() {
    this.overlay.querySelectorAll('.diff-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        const diff = btn.dataset.diff;
        this.selected = diff;
        this.refresh();
        // Small beat so the selection glow registers before the fight loads
        setTimeout(() => {
          this.hide();
          this.onSelect(diff);
        }, 160);
      });
    });
  }

  refresh() {
    this.overlay.querySelectorAll('.diff-option').forEach((btn) => {
      btn.classList.toggle('selected', btn.dataset.diff === this.selected);
    });
  }

  show() {
    this.selected = Difficulty.current; // remember their last choice
    this.refresh();
    this.overlay.classList.add('active');
  }

  hide() {
    this.overlay.classList.remove('active');
  }
}

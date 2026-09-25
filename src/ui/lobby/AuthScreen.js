/**
 * AuthScreen — the only gate into the lobby.
 * Two fields (username + password), or one tap for guest play.
 */
import { Auth } from '../../net/auth.js';

export class AuthScreen {
  /** @param {{onDone: (user:object) => void, onBack?: () => void}} opts */
  constructor({ onDone, onBack = null }) {
    this.onDone = onDone;
    this.onBack = onBack;
    this.busy = false;
    this.mode = 'signin'; // 'signin' | 'signup'
    this.createDOM();
    this.bindEvents();
  }

  createDOM() {
    this.el = document.createElement('div');
    this.el.id = 'auth-screen';
    this.el.innerHTML = `
      <div class="auth-card">
        <div class="auth-kicker">SHADOW REALM ARENA</div>
        <h1 class="auth-logo">DILI<span>FIGHTER</span></h1>

        <div class="auth-tabs">
          <button type="button" class="auth-tab active" data-mode="signin">SIGN IN</button>
          <button type="button" class="auth-tab" data-mode="signup">CREATE ACCOUNT</button>
        </div>

        <label class="auth-field">
          <span>USERNAME</span>
          <input id="auth-username" type="text" autocomplete="username"
                 maxlength="16" spellcheck="false" placeholder="your fighter name" />
        </label>
        <label class="auth-field">
          <span>PASSWORD</span>
          <input id="auth-password" type="password" autocomplete="current-password"
                 maxlength="64" placeholder="at least 6 characters" />
        </label>

        <div id="auth-error" class="auth-error" role="alert"></div>

        <button id="auth-go-btn" class="btn-action btn-hero auth-go" type="button">SIGN IN</button>

        <div class="auth-divider"><span>or</span></div>

        <button id="auth-guest-btn" class="auth-guest" type="button">PLAY AS GUEST</button>

        ${this.onBack ? '<button id="auth-back-btn" class="home-link" type="button">BACK TO TITLE</button>' : ''}
      </div>
    `;
    document.body.appendChild(this.el);
  }

  bindEvents() {
    const tabs = this.el.querySelectorAll('.auth-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        this.mode = tab.dataset.mode;
        tabs.forEach((t) => t.classList.toggle('active', t === tab));
        this.goBtn.textContent = this.mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT';
        this.setError('');
      });
    });

    this.goBtn = this.el.querySelector('#auth-go-btn');
    this.errorEl = this.el.querySelector('#auth-error');
    this.userInput = this.el.querySelector('#auth-username');
    this.passInput = this.el.querySelector('#auth-password');

    this.goBtn.addEventListener('click', () => this.submit());
    this.passInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submit();
    });

    this.el.querySelector('#auth-guest-btn').addEventListener('click', () => this.guest());

    const back = this.el.querySelector('#auth-back-btn');
    if (back) back.addEventListener('click', () => this.onBack && this.onBack());
  }

  setError(msg) {
    this.errorEl.textContent = msg || '';
    this.errorEl.classList.toggle('active', !!msg);
  }

  setBusy(busy, label) {
    this.busy = busy;
    this.goBtn.disabled = busy;
    if (label) this.goBtn.textContent = label;
    this.el.classList.toggle('busy', busy);
  }

  async submit() {
    if (this.busy) return;
    const username = this.userInput.value;
    const password = this.passInput.value;
    this.setBusy(true, this.mode === 'signin' ? 'SIGNING IN…' : 'CREATING…');
    const res = this.mode === 'signin'
      ? await Auth.signIn(username, password)
      : await Auth.signUp(username, password);
    this.setBusy(false);
    this.goBtn.textContent = this.mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT';
    if (!res.ok) {
      this.setError(res.error);
      return;
    }
    this.finish(res.user);
  }

  async guest() {
    if (this.busy) return;
    this.setBusy(true, 'ENTERING…');
    const res = await Auth.signInGuest();
    this.setBusy(false);
    if (!res.ok) {
      this.setError(res.error);
      return;
    }
    this.finish(res.user);
  }

  finish(user) {
    this.el.classList.add('leaving');
    setTimeout(() => this.el.remove(), 300);
    this.onDone(user);
  }
}

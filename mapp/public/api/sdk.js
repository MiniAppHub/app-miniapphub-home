/**
 * Клиентский SDK мини-приложения: мост к оболочке и инъекция токенов тем.
 * Токены приходят при старте (theme.get) и обновляются событием оболочки.
 * @module sdk
 */
const FROM_APP = 'mapp';
const FROM_SHELL = 'mapp-shell';
const FROM_RELAY = 'mapp-relay';

/**
 * @param {Record<string, string|number>} tokens
 * @returns {string}
 */
export function tokensCss(tokens) {
  const units = { '--radius': 'px', '--gap': 'px', '--font-size': 'px', '--icon-size': 'px' };
  const body = Object.entries(tokens)
    .map(([k, v]) => `${k}:${typeof v === 'number' ? v + (units[k] || '') : v}`)
    .join(';');
  return `:root{${body}}`;
}

export class Mapp {
  /**
   * @param {Window} [target] окно, к которому обращаемся (оболочка или лаунчер-ретранслятор)
   */
  constructor(target = window.parent) {
    this.target = target;
    this.seq = 0;
    /** @type {Map<number, Function>} */
    this.pending = new Map();
    /** @type {Set<(theme: any) => void>} */
    this.themeListeners = new Set();
    this.style = null;
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || msg.source !== FROM_SHELL) return;
      if (msg.event === 'theme') {
        this.applyTheme(msg.theme);
        return;
      }
      if (msg.id == null) return;
      const done = this.pending.get(msg.id);
      if (done) { this.pending.delete(msg.id); done(msg.response); }
    });
    if (Mapp.inShell) this.theme('get').then((r) => r.ok && this.applyTheme(r.result));
  }

  static get inShell() { return window.parent !== window; }

  /** @param {{ name: string, mode: string, tokens: Record<string, string|number> }} theme */
  applyTheme(theme) {
    if (!theme || !theme.tokens) return;
    if (!this.style) {
      this.style = document.createElement('style');
      this.style.id = 'mapp-tokens';
      document.head.appendChild(this.style);
    }
    this.style.textContent = tokensCss(theme.tokens);
    document.documentElement.dataset.theme = theme.mode || 'dark';
    for (const fn of this.themeListeners) fn(theme);
  }

  /** @param {(theme: any) => void} fn */
  onTheme(fn) { this.themeListeners.add(fn); }

  _call(namespace, action, params = {}, timeout = 8000) {
    if (window.parent === window) return Promise.resolve({ ok: false, error: 'not-in-shell' });
    const id = ++this.seq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.pending.delete(id); resolve({ ok: false, error: 'timeout' }); }, timeout);
      this.pending.set(id, (response) => { clearTimeout(timer); resolve(response); });
      this.target.postMessage({ source: FROM_APP, id, namespace, action, params }, '*');
    });
  }

  /** Окно разрешений ждёт пользователя, поэтому у apps() таймаут больше. */
  shell(action, params, timeout) { return this._call('shell', action, params, timeout); }
  apps(action, params, timeout = 180000) { return this._call('apps', action, params, timeout); }
  system(action, params, timeout) { return this._call('system', action, params, timeout); }
  theme(action, params, timeout) { return this._call('theme', action, params, timeout); }
}

export const mapp = new Mapp();

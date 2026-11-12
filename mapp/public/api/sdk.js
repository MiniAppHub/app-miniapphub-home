/**
 * Клиентский SDK MiniAppHub. Копия ядра, чтобы приложение работало автономно.
 * @module sdk
 */
const FROM_APP = 'mapp';
const FROM_SHELL = 'mapp-shell';

export class Mapp {
  constructor(target = window.parent) {
    this.target = target;
    this.seq = 0;
    this.pending = new Map();
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || msg.source !== FROM_SHELL || msg.id == null) return;
      const done = this.pending.get(msg.id);
      if (done) { this.pending.delete(msg.id); done(msg.response); }
    });
  }

  static get inShell() { return window.parent !== window; }

  _call(namespace, action, params = {}, timeout = 8000) {
    if (window.parent === window) return Promise.resolve({ ok: false, error: 'not-in-shell' });
    const id = ++this.seq;
    return new Promise((resolve) => {
      const timer = setTimeout(() => { this.pending.delete(id); resolve({ ok: false, error: 'timeout' }); }, timeout);
      this.pending.set(id, (response) => { clearTimeout(timer); resolve(response); });
      this.target.postMessage({ source: FROM_APP, id, namespace, action, params }, '*');
    });
  }

  shell(action, params) { return this._call('shell', action, params); }
  apps(action, params) { return this._call('apps', action, params); }
  system(action, params) { return this._call('system', action, params); }
}

export const mapp = new Mapp();

/**
 * Мост минибраузера рабочего стола: запросы вложенных приложений уходят в оболочку от имени этих приложений.
 * Вложенные окна — только те, что помечены data-nested. Веб-версии из маркета мост не получают.
 * @module bridge
 */
import { Mapp } from './api/sdk.js';

/** @type {Map<string, { win: Window, origId: any }>} */
const pending = new Map();
let seq = 0;

function nestedFrameOf(win) {
  for (const f of document.querySelectorAll('iframe')) {
    if (f.contentWindow === win) return f;
  }
  return null;
}

export function startBridge() {
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg) return;
    if (event.source === window.parent) {
      if (typeof msg.id === 'string' && msg.id.startsWith('r')) {
        const p = pending.get(msg.id);
        if (p) {
          pending.delete(msg.id);
          p.win.postMessage({ source: 'mapp-shell', id: p.origId, response: msg.response }, '*');
        }
        return;
      }
      if (msg.source === 'mapp-shell' && msg.event === 'theme') {
        for (const f of document.querySelectorAll('iframe[data-nested]')) {
          if (f.contentWindow) f.contentWindow.postMessage(msg, '*');
        }
      }
      return;
    }
    if (msg.source !== 'mapp' || msg.id == null) return;
    const frame = nestedFrameOf(event.source);
    if (!frame) return;
    const reply = (response) => event.source.postMessage({ source: 'mapp-shell', id: msg.id, response }, '*');
    if (!frame.hasAttribute('data-nested')) {
      reply({ ok: false, error: 'API недоступен в этом окне' });
      return;
    }
    if (!Mapp.inShell) {
      reply({ ok: false, error: 'not-in-shell' });
      return;
    }
    const rid = 'r' + (++seq);
    pending.set(rid, { win: event.source, origId: msg.id });
    window.parent.postMessage({
      source: 'mapp-relay',
      id: rid,
      appId: frame.dataset.appId,
      namespace: msg.namespace,
      action: msg.action,
      params: msg.params || {},
    }, '*');
  });
}

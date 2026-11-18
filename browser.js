/**
 * Встроенный браузер: полноэкранный iframe с верхней панелью (назад, название, действие, меню ⋮).
 * Для рабочего стола (data-nested, вызовы API через мост) и для маркета (без API).
 * @module browser
 */
import { esc } from './common.js';

/**
 * @param {{
 *   mode: 'desktop'|'market',
 *   title: string,
 *   url: string,
 *   appId?: string,
 *   action?: { label: string, danger?: boolean, onClick: () => void },
 *   menu?: Array<{ label: string, onClick: () => void }>,
 * }} opts
 * @returns {{ close: () => void, setAction: (a: { label: string, danger?: boolean, onClick: () => void }|null) => void, frame: HTMLIFrameElement }}
 */
export function openBrowser(opts) {
  const root = document.createElement('div');
  root.className = 'browser ' + opts.mode;
  root.innerHTML = `
    <header class="bbar">
      <button class="icon" type="button" data-back aria-label="Назад">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M15.4 6.4 14 5l-7 7 7 7 1.4-1.4L9.8 12z"/></svg>
      </button>
      <span class="btitle">${esc(opts.title)}</span>
      <span class="bactions"></span>
      <div class="menu">
        <button class="icon" type="button" data-more aria-label="Меню" aria-haspopup="true" aria-expanded="false">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="5" r="2" fill="currentColor"/><circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="12" cy="19" r="2" fill="currentColor"/></svg>
        </button>
        <div class="popover" hidden role="menu"></div>
      </div>
    </header>
    <iframe class="bframe" title="${esc(opts.title)}"
      sandbox="allow-scripts allow-same-origin allow-forms allow-downloads allow-popups allow-popups-to-escape-sandbox"></iframe>`;

  const frame = root.querySelector('.bframe');
  if (opts.mode === 'desktop') {
    frame.dataset.nested = '1';
    frame.dataset.appId = opts.appId || '';
  }
  frame.src = opts.url;

  const actions = root.querySelector('.bactions');
  const popover = root.querySelector('.popover');
  const more = root.querySelector('[data-more]');

  const setOpen = (open) => {
    popover.hidden = !open;
    more.setAttribute('aria-expanded', String(open));
  };

  const menu = [...(opts.menu || [])];
  popover.innerHTML = menu.map((m, i) => `<button type="button" role="menuitem" data-i="${i}">${esc(m.label)}</button>`).join('');
  popover.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-i]');
    if (!btn) return;
    setOpen(false);
    menu[Number(btn.dataset.i)].onClick();
  });
  more.addEventListener('click', (e) => { e.stopPropagation(); setOpen(popover.hidden); });
  root.addEventListener('click', (e) => { if (!popover.contains(e.target)) setOpen(false); });

  const close = () => { root.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  root.querySelector('[data-back]').addEventListener('click', close);

  const setAction = (a) => {
    actions.innerHTML = a
      ? `<button type="button" class="chip ${a.danger ? 'danger' : ''}">${esc(a.label)}</button>`
      : '';
    if (a) actions.querySelector('.chip').addEventListener('click', a.onClick);
  };
  setAction(opts.action || null);

  document.body.appendChild(root);
  return { close, setAction, frame };
}

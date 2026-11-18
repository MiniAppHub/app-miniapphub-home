/**
 * Маркет: каталог плиткой с отметками установленных. Приложения открываются во встроенном браузере.
 * @module market
 */
import { mapp, Mapp } from './api/sdk.js';
import { $, esc, initial, unwrap, toast, fetchJson } from './common.js';
import { openBrowser } from './browser.js';

const DEFAULT_CATALOG = 'https://miniapphub.github.io/catalog.json';

/** @type {any[]} */
let catalog = [];
/** @type {any[]} */
let installed = [];

async function loadInstalled() {
  try {
    installed = await unwrap(mapp.apps('getInstalled'));
  } catch {
    installed = [];
  }
}

function render() {
  const q = $('q').value.trim().toLowerCase();
  const items = catalog.filter((a) =>
    [a.name, a.description, a.author, a.id].some((v) => String(v || '').toLowerCase().includes(q)));
  $('grid').innerHTML = items.map((a) => {
    const on = installed.some((i) => i.id === a.id);
    const icon = a.icon ? `<img src="${esc(a.icon)}" alt="">` : initial(a.name);
    return `
      <button class="tile${on ? ' on' : ''}" data-id="${esc(a.id)}">
        <span class="ico">${icon}</span>
        <span class="label">${esc(a.name)}</span>
        <span class="mark">${on ? 'установлено' : ''}</span>
      </button>`;
  }).join('');
  const msg = $('msg');
  msg.hidden = items.length > 0;
  if (!items.length) msg.textContent = catalog.length ? 'Ничего не найдено' : 'Каталог пуст';
}

async function installOrRemove(entry, browserHandle) {
  const on = installed.some((i) => i.id === entry.id);
  try {
    if (on) {
      await unwrap(mapp.apps('uninstallApp', { id: entry.id }));
      toast('«' + entry.name + '» удалено');
    } else {
      await unwrap(mapp.apps('installApp', { id: entry.id }));
      toast('«' + entry.name + '» установлено');
    }
    await loadInstalled();
    render();
    if (browserHandle) browserHandle.setAction(actionFor(entry, browserHandle));
  } catch (err) {
    toast('Не удалось: ' + err.message);
  }
}

function actionFor(entry, handle) {
  const on = installed.some((i) => i.id === entry.id);
  return {
    label: on ? 'Удалить' : 'Установить',
    danger: on,
    onClick: () => installOrRemove(entry, handle),
  };
}

function openEntry(entry) {
  const url = entry.web || entry.url;
  const handle = openBrowser({
    mode: 'market',
    title: entry.name,
    url,
    action: null,
    menu: [{ label: 'Открыть в браузере', onClick: () => window.open(url, '_blank', 'noopener') }],
  });
  handle.setAction(actionFor(entry, handle));
}

$('grid').addEventListener('click', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  const entry = catalog.find((a) => a.id === tile.dataset.id);
  if (entry) openEntry(entry);
});
$('q').addEventListener('input', render);
$('home').addEventListener('click', () => {
  unwrap(mapp.shell('closeApp')).catch((err) => toast('Не удалось вернуться: ' + err.message));
});

async function loadCatalog() {
  $('msg').hidden = false;
  $('msg').textContent = 'Загрузка каталога…';
  try {
    let url = DEFAULT_CATALOG;
    if (Mapp.inShell) {
      const settings = await unwrap(mapp.shell('getSettings'));
      if (settings.catalogUrl) url = settings.catalogUrl;
    }
    const data = await fetchJson(url);
    catalog = (Array.isArray(data.apps) ? data.apps : []).filter((a) => a && a.id && (a.web || a.url));
    await loadInstalled();
    render();
  } catch (err) {
    catalog = [];
    $('grid').innerHTML = '';
    $('msg').hidden = false;
    $('msg').textContent = 'Каталог недоступен: ' + err.message;
  }
}

async function boot() {
  if (Mapp.inShell) {
    try {
      const r = await mapp.theme('get');
      if (r.ok) mapp.applyTheme(r.result);
    } catch { /* тема по умолчанию */ }
  }
  loadCatalog();
}

boot();

/**
 * Маркет: каталог приложений и установка. Окно разрешений показывает оболочка.
 * @module market
 */
import { mapp, Mapp } from './api/sdk.js';

const DEFAULT_CATALOG = 'https://miniapphub.github.io/catalog.json';
const $ = (id) => document.getElementById(id);
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initial = (name) => esc(String(name || '?').trim()[0].toUpperCase());

/** @type {Array<any>} */
let catalog = [];
/** @type {Array<any>} */
let installed = [];
/** @type {any} */
let current = null;

async function unwrap(promise) {
  const res = await promise;
  if (!res || res.ok !== true) throw new Error((res && res.error) || 'api error');
  return res.result;
}

function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 2800);
}

function stateOf(entry) {
  const local = installed.find((a) => a.id === entry.id);
  if (!local) return 'new';
  return local.version === entry.version ? 'on' : 'update';
}

function render() {
  const q = $('q').value.trim().toLowerCase();
  const items = catalog.filter((a) =>
    [a.name, a.description, a.author, a.id].some((v) => String(v || '').toLowerCase().includes(q)));
  $('list').innerHTML = items.map((a) => {
    const state = stateOf(a);
    const label = state === 'on' ? 'установлено' : state === 'update' ? 'обновить' : 'установить';
    return `
      <button class="row" data-id="${esc(a.id)}">
        <span class="ico">${initial(a.name)}</span>
        <span class="info">
          <span class="name">${esc(a.name)}</span>
          <span class="muted small">${esc(a.version)} · ${esc(a.author || '')}</span>
          <span class="muted small">${esc(a.description || '')}</span>
        </span>
        <span class="badge ${state === 'on' ? 'on' : ''}">${label}</span>
      </button>`;
  }).join('');
  const msg = $('msg');
  msg.hidden = items.length > 0;
  msg.textContent = catalog.length ? 'Ничего не найдено' : msg.textContent;
}

async function loadInstalled() {
  try {
    installed = await unwrap(mapp.apps('getInstalled'));
  } catch {
    installed = [];
  }
}

async function loadCatalog() {
  const msg = $('msg');
  msg.hidden = false;
  msg.textContent = 'Загрузка каталога…';
  try {
    let url = DEFAULT_CATALOG;
    if (Mapp.inShell) {
      const settings = await unwrap(mapp.shell('getSettings'));
      if (settings.catalogUrl) url = settings.catalogUrl;
    }
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    catalog = Array.isArray(data.apps) ? data.apps : [];
    await loadInstalled();
    msg.textContent = 'Каталог пуст';
    render();
  } catch (err) {
    catalog = [];
    $('list').innerHTML = '';
    msg.hidden = false;
    msg.textContent = 'Каталог недоступен: ' + err.message;
  }
}

function openSheet(entry) {
  current = entry;
  const state = stateOf(entry);
  $('sheet-title').textContent = entry.name + ' ' + (entry.version || '');
  $('sheet-desc').textContent = entry.description || '';
  $('sheet-perm').textContent = Array.isArray(entry.permissions) && entry.permissions.length
    ? 'Запрашивает разрешения: ' + entry.permissions.join(', ')
    : 'Особых разрешений не требует';
  const primary = $('sheet-primary');
  primary.textContent = state === 'on' ? 'Установлено' : state === 'update' ? 'Обновить' : 'Установить';
  primary.disabled = state === 'on';
  $('sheet').hidden = false;
}

function closeSheet() {
  $('sheet').hidden = true;
  current = null;
}

$('q').addEventListener('input', render);
$('list').addEventListener('click', (e) => {
  const row = e.target.closest('.row');
  if (!row) return;
  const entry = catalog.find((a) => a.id === row.dataset.id);
  if (entry) openSheet(entry);
});
$('sheet-close').addEventListener('click', closeSheet);
$('sheet').addEventListener('click', (e) => { if (e.target === $('sheet')) closeSheet(); });

$('sheet-primary').addEventListener('click', async () => {
  if (!current) return;
  const btn = $('sheet-primary');
  const entry = current;
  btn.disabled = true;
  try {
    await unwrap(mapp.apps('installApp', { id: entry.id }));
    closeSheet();
    toast('«' + entry.name + '» установлено');
    await loadInstalled();
    render();
  } catch (err) {
    btn.disabled = false;
    toast('Не удалось установить: ' + err.message);
  }
});

$('home').addEventListener('click', async () => {
  try {
    await unwrap(mapp.shell('closeApp'));
  } catch (err) {
    toast('Не удалось вернуться: ' + err.message);
  }
});

async function boot() {
  if (Mapp.inShell) {
    try {
      const settings = await unwrap(mapp.shell('getSettings'));
      document.documentElement.dataset.theme = settings.theme || 'dark';
    } catch { /* тема по умолчанию */ }
  }
  loadCatalog();
}

boot();

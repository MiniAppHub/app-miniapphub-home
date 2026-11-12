/**
 * Home — лаунчер MiniAppHub. Весь интерфейс оболочки живёт здесь.
 * Общается с оболочкой через mapp.shell(...) и mapp.apps(...).
 * @module app
 */
import { mapp, Mapp } from './api/sdk.js';

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initial = (name) => esc(String(name || '?').trim()[0].toUpperCase());

/** @type {import('./api/sdk.js').Mapp} */
let api = mapp;
/** @type {Array<any>} */
let catalog = [];
/** @type {{catalogUrl:string, launcher:string|null, theme:string}} */
let settings = { catalogUrl: '', launcher: null, theme: 'dark' };

/**
 * Вызов действия оболочки с обработкой ошибок.
 * @param {Promise<{ok:boolean, result?:any, error?:string}>} promise
 * @returns {Promise<any>}
 */
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
  toast.timer = setTimeout(() => { el.hidden = true; }, 2400);
}

function showView(name) {
  for (const v of ['home', 'catalog', 'settings']) $(v).hidden = v !== name;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.dataset.view === name));
  if (name === 'home') renderHome();
  if (name === 'catalog') loadCatalog();
  if (name === 'settings') renderSettings();
}
document.querySelectorAll('[data-view]').forEach((el) =>
  el.addEventListener('click', () => showView(el.dataset.view)));

/* ----------------------------- Рабочий стол ----------------------------- */

async function renderHome() {
  let apps = [];
  try {
    apps = await unwrap(api.apps('getInstalled'));
  } catch (err) {
    apps = [];
    toast('Реестр недоступен: ' + err.message);
  }
  $('empty').hidden = apps.length > 0;
  $('grid').innerHTML = apps.map((a) => `
    <button class="tile" data-id="${esc(a.id)}">
      <span class="ico">${a.icon ? `<img src="${esc(a.icon)}" alt="" width="34" height="34">` : initial(a.name)}</span>
      <span class="label">${esc(a.name)}</span>
    </button>`).join('');
}

$('grid').addEventListener('click', async (e) => {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  try {
    await unwrap(api.shell('openApp', { id: tile.dataset.id }));
  } catch (err) {
    toast('Не удалось открыть: ' + err.message);
  }
});

/* ------------------------------- Каталог ------------------------------- */

async function loadCatalog() {
  const msg = $('catalog-msg');
  msg.hidden = false;
  msg.textContent = 'Загрузка каталога…';
  try {
    const res = await fetch(settings.catalogUrl, { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    catalog = Array.isArray(data.apps) ? data.apps : [];
    msg.hidden = catalog.length > 0;
    if (!catalog.length) msg.textContent = 'Каталог пуст';
    renderCatalog();
  } catch (err) {
    catalog = [];
    $('list').innerHTML = '';
    msg.hidden = false;
    msg.textContent = 'Каталог недоступен: ' + err.message;
  }
}

async function renderCatalog() {
  let installed = [];
  try { installed = await unwrap(api.apps('getInstalled')); } catch { installed = []; }
  const byId = new Map(installed.map((a) => [a.id, a]));
  const t = $('q').value.trim().toLowerCase();
  const items = catalog.filter((a) =>
    [a.name, a.description, a.author, a.id].some((v) => String(v || '').toLowerCase().includes(t)));

  $('list').innerHTML = items.map((a) => {
    const local = byId.get(a.id);
    const state = local
      ? (local.version === a.version ? 'on' : 'update')
      : 'new';
    const badge = state === 'on' ? 'установлено'
      : state === 'update' ? 'обновить' : 'не установлено';
    return `
      <button class="row" data-id="${esc(a.id)}">
        <span class="ico">${initial(a.name)}</span>
        <span class="info">
          <span class="name">${esc(a.name)}</span>
          <span class="muted small"> ${esc(a.version)}</span>
          <div class="muted small">${esc(a.description || '')}</div>
          <div class="muted small">${esc(a.author || '')}</div>
        </span>
        <span class="badge ${state === 'on' ? 'on' : ''}">${badge}</span>
      </button>`;
  }).join('');
  $('catalog-msg').hidden = items.length > 0;
  if (!items.length && catalog.length) $('catalog-msg').textContent = 'Ничего не найдено';
}

$('q').addEventListener('input', () => renderCatalog());

$('list').addEventListener('click', (e) => {
  const row = e.target.closest('.row');
  if (!row) return;
  const entry = catalog.find((a) => a.id === row.dataset.id);
  if (entry) openSheet(entry);
});

/* ------------------------------ Карточка ------------------------------ */

/** @type {any} */
let sheetEntry = null;

function openSheet(entry) {
  sheetEntry = entry;
  $('sheet-title').textContent = entry.name + ' ' + (entry.version || '');
  $('sheet-desc').textContent = entry.description || '';
  const perms = Array.isArray(entry.permissions) && entry.permissions.length
    ? 'Запрашивает доступ: ' + entry.permissions.join(', ')
    : 'Системные разрешения не требуются';
  $('sheet-perm').textContent = perms;
  $('sheet-primary').textContent = 'Установить';
  $('sheet').hidden = false;
}

$('sheet-close').addEventListener('click', () => { $('sheet').hidden = true; });
$('sheet').addEventListener('click', (e) => { if (e.target === $('sheet')) $('sheet').hidden = true; });

$('sheet-primary').addEventListener('click', async () => {
  if (!sheetEntry) return;
  const btn = $('sheet-primary');
  btn.disabled = true;
  try {
    await unwrap(api.apps('installApp', { id: sheetEntry.id }));
    toast('«' + sheetEntry.name + '» установлено');
    $('sheet').hidden = true;
    await renderCatalog();
    await renderHome();
  } catch (err) {
    toast('Ошибка установки: ' + err.message);
  } finally {
    btn.disabled = false;
  }
});

/* ------------------------------ Настройки ------------------------------ */

function renderSettings() {
  const form = $('form');
  form.catalogUrl.value = settings.catalogUrl || '';
  form.theme.value = settings.theme || 'dark';
  $('form-msg').hidden = true;
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    settings = await unwrap(api.shell('setSettings', {
      catalogUrl: form.catalogUrl.value.trim(),
      theme: form.theme.value,
    }));
    document.documentElement.dataset.theme = settings.theme;
    $('form-msg').hidden = false;
    $('form-msg').textContent = 'Сохранено';
    catalog = [];
  } catch (err) {
    $('form-msg').hidden = false;
    $('form-msg').textContent = 'Ошибка: ' + err.message;
  }
});

$('reload').addEventListener('click', async () => {
  await renderHome();
  toast('Список обновлён');
});

/* -------------------------------- Старт -------------------------------- */

async function boot() {
  if (!Mapp.inShell) {
    $('env').textContent = 'вне оболочки';
  } else {
    try {
      const v = await unwrap(api.shell('getVersion'));
      $('shell-ver').textContent = v.version;
      $('shell-platform').textContent = v.platform;
      $('env').textContent = v.platform + ' · ' + v.version;
    } catch {
      $('env').textContent = 'нет связи с оболочкой';
    }
    try {
      settings = await unwrap(api.shell('getSettings'));
    } catch { /* значения по умолчанию */ }
  }
  document.documentElement.dataset.theme = settings.theme || 'dark';
  renderHome();
}

boot();

/**
 * Рабочий стол MiniAppHub: плитки установленных приложений и меню с настройками.
 * @module app
 */
import { mapp, Mapp } from './api/sdk.js';

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initial = (name) => esc(String(name || '?').trim()[0].toUpperCase());

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

async function renderHome() {
  let apps = [];
  try {
    apps = await unwrap(mapp.apps('getInstalled'));
  } catch (err) {
    toast('Реестр недоступен: ' + err.message);
  }
  $('empty').hidden = apps.length > 0;
  $('grid').innerHTML = apps.map((a) => `
    <button class="tile" data-id="${esc(a.id)}">
      <span class="ico">${a.icon ? `<img src="${esc(a.icon)}" alt="">` : initial(a.name)}</span>
      <span class="label">${esc(a.name)}</span>
    </button>`).join('');
}

$('grid').addEventListener('click', async (e) => {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  try {
    await unwrap(mapp.shell('openApp', { id: tile.dataset.id }));
  } catch (err) {
    toast('Не удалось открыть: ' + err.message);
  }
});

const gear = $('gear');
const menu = $('menu');
function setMenu(open) {
  menu.hidden = !open;
  gear.setAttribute('aria-expanded', String(open));
}
gear.addEventListener('click', (e) => {
  e.stopPropagation();
  setMenu(menu.hidden);
});
document.addEventListener('click', (e) => {
  if (!menu.hidden && !menu.contains(e.target)) setMenu(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') setMenu(false);
});

async function boot() {
  if (!Mapp.inShell) {
    document.documentElement.dataset.theme = 'dark';
  } else {
    try {
      const settings = await unwrap(mapp.shell('getSettings'));
      document.documentElement.dataset.theme = settings.theme || 'dark';
    } catch {
      document.documentElement.dataset.theme = 'dark';
    }
  }
  renderHome();
}

boot();

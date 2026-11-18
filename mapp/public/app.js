/**
 * Рабочий стол MiniAppHub: плитки установленных приложений, минибраузер и меню.
 * Сам home на столе не показывается.
 * @module app
 */
import { mapp, Mapp } from './api/sdk.js';
import { $, esc, initial, unwrap, toast, fetchJson, HOME_ID } from './common.js';
import { openBrowser } from './browser.js';
import { startBridge } from './bridge.js';
import { compare } from './semver.js';

let installed = [];

async function renderHome() {
  try {
    installed = await unwrap(mapp.apps('getInstalled'));
  } catch (err) {
    installed = [];
    toast('Реестр недоступен: ' + err.message);
  }
  const apps = installed.filter((a) => a.id !== HOME_ID);
  $('empty').hidden = apps.length > 0;
  $('grid').innerHTML = apps.map((a) => `
    <button class="tile" data-id="${esc(a.id)}">
      <span class="ico">${a.icon ? `<img src="${esc(a.icon)}" alt="">` : initial(a.name)}</span>
      <span class="label">${esc(a.name)}</span>
    </button>`).join('');
}

$('grid').addEventListener('click', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  const app = installed.find((a) => a.id === tile.dataset.id);
  if (!app) return;
  if (app.system) {
    unwrap(mapp.shell('openApp', { id: app.id })).catch((err) => toast('Не удалось открыть: ' + err.message));
    return;
  }
  const browser = openBrowser({
    mode: 'desktop',
    title: app.name,
    url: app.url,
    appId: app.id,
    menu: [{ label: 'Перезагрузить', onClick: () => { browser.frame.src = app.url; } }],
  });
});

const gear = $('gear');
const menu = $('menu');
function setMenu(open) {
  menu.hidden = !open;
  gear.setAttribute('aria-expanded', String(open));
}
gear.addEventListener('click', (e) => { e.stopPropagation(); setMenu(menu.hidden); });
document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target)) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

function showSheet(title, desc, primary) {
  $('sheet-title').textContent = title;
  $('sheet-desc').textContent = desc;
  const btn = $('sheet-primary');
  btn.hidden = !primary;
  btn.onclick = primary ? primary.onClick : null;
  if (primary) btn.textContent = primary.label;
  $('sheet').hidden = false;
}
$('sheet-close').addEventListener('click', () => { $('sheet').hidden = true; });
$('sheet').addEventListener('click', (e) => { if (e.target === $('sheet')) $('sheet').hidden = true; });

async function checkHomeUpdate() {
  try {
    const settings = await unwrap(mapp.shell('getSettings'));
    const catalog = await fetchJson(settings.catalogUrl || 'https://miniapphub.github.io/catalog.json');
    const entry = (catalog.apps || []).find((a) => a.id === HOME_ID);
    const local = installed.find((a) => a.id === HOME_ID) || (await unwrap(mapp.apps('getInstalled'))).find((a) => a.id === HOME_ID);
    const latest = entry && entry.version && entry.version.latest ? entry.version.latest.v : null;
    if (!latest || !local || compare(latest, local.version) <= 0) {
      showSheet('Обновлений нет', `Установлена версия ${local ? local.version : '—'}.`, null);
      return;
    }
    showSheet('Доступно обновление', `home ${latest} (у вас ${local.version}).`, {
      label: 'Установить',
      onClick: async () => {
        const btn = $('sheet-primary');
        btn.disabled = true;
        btn.textContent = 'Установка…';
        try {
          await unwrap(mapp.apps('installApp', { id: HOME_ID }));
          await unwrap(mapp.shell('openApp', { id: HOME_ID }));
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Установить';
          toast('Не удалось обновить: ' + err.message);
        }
      },
    });
  } catch (err) {
    toast('Проверка не удалась: ' + err.message);
  }
}

document.querySelector('[data-act="update"]').addEventListener('click', () => {
  setMenu(false);
  checkHomeUpdate();
});

async function boot() {
  startBridge();
  if (Mapp.inShell) {
    try {
      const r = await mapp.theme('get');
      if (r.ok) mapp.applyTheme(r.result);
    } catch { /* тема по умолчанию */ }
  }
  renderHome();
}

boot();

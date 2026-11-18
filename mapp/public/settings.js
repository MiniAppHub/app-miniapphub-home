/**
 * Настройки оболочки: адрес каталога и тема (список тем берётся у оболочки).
 * @module settings
 */
import { mapp, Mapp } from './api/sdk.js';
import { $, esc, unwrap } from './common.js';

function showMsg(text, isError = false) {
  const el = $('form-msg');
  el.hidden = false;
  el.style.color = isError ? 'var(--danger)' : '';
  el.textContent = text;
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    const saved = await unwrap(mapp.shell('setSettings', {
      catalogUrl: form.catalogUrl.value.trim(),
      theme: form.theme.value,
    }));
    showMsg('Сохранено');
  } catch (err) {
    showMsg('Ошибка: ' + err.message, true);
  }
});

async function boot() {
  if (!Mapp.inShell) {
    $('shell-platform').textContent = 'вне оболочки';
    return;
  }
  try {
    const r = await mapp.theme('get');
    if (r.ok) mapp.applyTheme(r.result);
    const settings = await unwrap(mapp.shell('getSettings'));
    const list = await unwrap(mapp.theme('list'));
    $('form').catalogUrl.value = settings.catalogUrl || '';
    $('form').theme.innerHTML = list.themes.map((t) =>
      `<option value="${esc(t.name)}"${t.name === settings.theme ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
    const v = await unwrap(mapp.shell('getVersion'));
    $('shell-ver').textContent = v.version;
    $('shell-platform').textContent = v.platform;
  } catch (err) {
    showMsg('Нет связи с оболочкой: ' + err.message, true);
  }
}

boot();

/**
 * Настройки оболочки: адрес каталога и тема. Сохраняются в оболочке.
 * @module settings
 */
import { mapp, Mapp } from './api/sdk.js';

const $ = (id) => document.getElementById(id);

async function unwrap(promise) {
  const res = await promise;
  if (!res || res.ok !== true) throw new Error((res && res.error) || 'api error');
  return res.result;
}

function showMsg(text, isError = false) {
  const el = $('form-msg');
  el.hidden = false;
  el.style.color = isError ? '#ff7a7a' : '';
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
    document.documentElement.dataset.theme = saved.theme;
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
    const settings = await unwrap(mapp.shell('getSettings'));
    $('form').catalogUrl.value = settings.catalogUrl || '';
    $('form').theme.value = settings.theme || 'dark';
    document.documentElement.dataset.theme = settings.theme || 'dark';
    const v = await unwrap(mapp.shell('getVersion'));
    $('shell-ver').textContent = v.version;
    $('shell-platform').textContent = v.platform;
  } catch (err) {
    showMsg('Нет связи с оболочкой: ' + err.message, true);
  }
}

boot();

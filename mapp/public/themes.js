/**
 * Редактор тем: поля --var с контролами. Изменения сразу применяются ко всей оболочке и открытым приложениям.
 * Сохранение и выбор темы идут через API оболочки (theme/*).
 * @module themes
 */
import { mapp, Mapp } from './api/sdk.js';
import { $, esc, unwrap, toast } from './common.js';
import { TOKEN_SPECS, validateTokens, BUILTIN_THEMES } from './api/tokens.js';

/** @type {Array<{ name: string, builtin: boolean }>} */
let themes = [];
let selected = 'dark';
/** @type {Record<string, string|number>} */
let tokens = {};
let previewTimer = 0;

const HEX = /^#[0-9a-fA-F]{6}$/;

function schedulePreview() {
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    mapp.theme('preview', { tokens }).catch(() => {});
  }, 60);
}

/**
 * Удерживаемая кнопка: один шаг по нажатию, после паузы — автоповтор, который ускоряется.
 * @param {HTMLElement} btn
 * @param {() => void} step
 */
function holdRepeat(btn, step) {
  let timer = 0;
  let interval = 0;
  let count = 0;
  const tick = () => {
    count += 1;
    const times = count > 20 ? 5 : count > 8 ? 2 : 1;
    for (let i = 0; i < times; i += 1) step();
  };
  const stop = () => {
    clearTimeout(timer);
    clearInterval(interval);
    count = 0;
  };
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tick();
    timer = setTimeout(() => { interval = setInterval(tick, 80); }, 400);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) btn.addEventListener(ev, stop);
}

function fieldRow(spec) {
  const row = document.createElement('div');
  row.className = 'field';
  const label = document.createElement('span');
  label.className = 'fname';
  label.textContent = spec.name + ':';
  row.appendChild(label);

  if (spec.type === 'color') {
    const control = document.createElement('div');
    control.className = 'color';
    control.innerHTML = `
      <button type="button" class="swatch" aria-label="Выбрать цвет"></button>
      <input type="text" class="hex" maxlength="7" spellcheck="false">
      <input type="color" class="picker" tabindex="-1" aria-hidden="true">`;
    const swatch = control.querySelector('.swatch');
    const hex = control.querySelector('.hex');
    const picker = control.querySelector('.picker');
    const apply = (value) => {
      tokens[spec.name] = value;
      swatch.style.background = value;
      hex.value = value;
      picker.value = value;
      schedulePreview();
    };
    apply(tokens[spec.name]);
    swatch.addEventListener('click', () => picker.click());
    picker.addEventListener('input', () => apply(picker.value));
    hex.addEventListener('change', () => {
      const v = hex.value.trim();
      if (HEX.test(v)) apply(v.toLowerCase());
      else hex.value = tokens[spec.name];
    });
    row.appendChild(control);
  } else {
    const control = document.createElement('div');
    control.className = 'stepper';
    control.innerHTML = `
      <button type="button" class="step" data-dir="-1" aria-label="Меньше">−</button>
      <input type="number" class="num" min="${spec.min}" max="${spec.max}" step="${spec.step}">
      <button type="button" class="step" data-dir="1" aria-label="Больше">+</button>
      <span class="unit">${esc(spec.unit || '')}</span>`;
    const input = control.querySelector('.num');
    const set = (raw) => {
      const n = Math.min(spec.max, Math.max(spec.min, Math.round(Number(raw) / spec.step) * spec.step));
      if (!Number.isFinite(n)) return;
      tokens[spec.name] = n;
      input.value = n;
      schedulePreview();
    };
    input.value = tokens[spec.name];
    input.addEventListener('change', () => set(input.value));
    control.querySelectorAll('.step').forEach((btn) => {
      const dir = Number(btn.dataset.dir);
      holdRepeat(btn, () => set(Number(tokens[spec.name]) + dir * spec.step));
    });
    row.appendChild(control);
  }
  return row;
}

function renderFields() {
  const box = $('fields');
  box.innerHTML = '';
  for (const spec of TOKEN_SPECS) box.appendChild(fieldRow(spec));
}

function renderPicker() {
  $('pick').innerHTML = themes.map((t) =>
    `<option value="${esc(t.name)}"${t.name === selected ? ' selected' : ''}>${esc(t.name)}${t.builtin ? ' (встроенная)' : ''}</option>`).join('');
  const builtin = BUILTIN_THEMES.includes(selected);
  $('remove').disabled = builtin;
  $('hint').textContent = builtin
    ? 'Встроенные темы нельзя удалить. Их можно изменить и сохранить.'
    : 'Изменения применяются сразу. «Сохранить» запишет тему под её названием.';
}

async function loadTheme(name) {
  const r = await unwrap(mapp.theme('get', { name }));
  selected = name;
  tokens = { ...r.tokens };
  renderPicker();
  renderFields();
  schedulePreview();
}

async function refresh(name) {
  const list = await unwrap(mapp.theme('list'));
  themes = list.themes;
  selected = name || list.active;
  await loadTheme(selected);
  return list;
}

$('pick').addEventListener('change', async (e) => {
  try {
    await loadTheme(e.target.value);
  } catch (err) {
    toast('Не удалось загрузить: ' + err.message);
  }
});

$('save').addEventListener('click', async () => {
  try {
    validateTokens(tokens);
    await unwrap(mapp.theme('save', { name: selected, tokens }));
    toast('Тема «' + selected + '» сохранена');
    await refresh(selected);
  } catch (err) {
    toast('Не сохранено: ' + err.message);
  }
});

$('create').addEventListener('click', async () => {
  const name = $('newName').value.trim();
  if (!name) {
    toast('Введите название темы');
    return;
  }
  try {
    await unwrap(mapp.theme('save', { name, tokens }));
    $('newName').value = '';
    toast('Создана тема «' + name + '»');
    await refresh(name);
  } catch (err) {
    toast('Не создано: ' + err.message);
  }
});

$('activate').addEventListener('click', async () => {
  try {
    await unwrap(mapp.theme('activate', { name: selected }));
    toast('Тема «' + selected + '» установлена');
    await refresh(selected);
  } catch (err) {
    toast('Не установлено: ' + err.message);
  }
});

$('remove').addEventListener('click', async () => {
  const btn = $('remove');
  if (btn.dataset.armed !== selected) {
    btn.dataset.armed = selected;
    btn.textContent = 'Точно удалить?';
    setTimeout(() => { btn.dataset.armed = ''; btn.textContent = 'Удалить'; }, 4000);
    return;
  }
  btn.dataset.armed = '';
  btn.textContent = 'Удалить';
  try {
    await unwrap(mapp.theme('remove', { name: selected }));
    toast('Тема удалена');
    await refresh();
  } catch (err) {
    toast('Не удалено: ' + err.message);
  }
});

async function boot() {
  if (!Mapp.inShell) {
    $('hint').textContent = 'Редактор работает внутри оболочки MiniAppHub.';
    return;
  }
  try {
    const r = await mapp.theme('get');
    if (r.ok) mapp.applyTheme(r.result);
    await refresh();
  } catch (err) {
    toast('Нет связи с оболочкой: ' + err.message);
  }
}

boot();

/**
 * Общие утилиты страниц home: DOM, экранирование, вызов API оболочки, уведомления.
 * @module common
 */

export const $ = (id) => document.getElementById(id);

export const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const initial = (name) => esc(String(name || '?').trim()[0].toUpperCase());

/**
 * @param {Promise<{ok: boolean, result?: any, error?: string}>} promise
 */
export async function unwrap(promise) {
  const res = await promise;
  if (!res || res.ok !== true) throw new Error((res && res.error) || 'api error');
  return res.result;
}

/** @param {string} text */
export function toast(text) {
  const el = $('toast');
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 2800);
}

/** @param {string} url */
export async function fetchJson(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

export const HOME_ID = 'miniapphub.home';

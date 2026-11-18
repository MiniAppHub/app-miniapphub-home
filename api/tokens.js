/**
 * Дизайн-токены оболочки и мини-приложений: спецификация, наборы dark/light, проверка и CSS.
 * @module tokens
 */

export const BUILTIN_THEMES = ['dark', 'light'];

/** @type {Array<{ name: string, type: 'color'|'number', min?: number, max?: number, step?: number, unit?: string }>} */
export const TOKEN_SPECS = [
  { name: '--bg', type: 'color' },
  { name: '--surface', type: 'color' },
  { name: '--surface-2', type: 'color' },
  { name: '--line', type: 'color' },
  { name: '--text', type: 'color' },
  { name: '--muted', type: 'color' },
  { name: '--accent', type: 'color' },
  { name: '--accent-text', type: 'color' },
  { name: '--danger', type: 'color' },
  { name: '--radius', type: 'number', unit: 'px', min: 0, max: 32, step: 1 },
  { name: '--gap', type: 'number', unit: 'px', min: 0, max: 40, step: 1 },
  { name: '--font-size', type: 'number', unit: 'px', min: 10, max: 24, step: 1 },
  { name: '--icon-size', type: 'number', unit: 'px', min: 32, max: 96, step: 2 },
];

/** @type {Record<string, string|number>} */
export const DARK = {
  '--bg': '#0b0d10', '--surface': '#14171c', '--surface-2': '#1c2028', '--line': '#222730',
  '--text': '#e7eaf0', '--muted': '#8a93a3', '--accent': '#5b8cff', '--accent-text': '#ffffff',
  '--danger': '#ff7a7a', '--radius': 14, '--gap': 12, '--font-size': 15, '--icon-size': 64,
};

/** @type {Record<string, string|number>} */
export const LIGHT = {
  '--bg': '#f4f6fa', '--surface': '#ffffff', '--surface-2': '#eceff5', '--line': '#dde2ea',
  '--text': '#1a1d24', '--muted': '#6b7280', '--accent': '#3b6ff5', '--accent-text': '#ffffff',
  '--danger': '#d93b3b', '--radius': 14, '--gap': 12, '--font-size': 15, '--icon-size': 64,
};

export const DEFAULT_THEMES = { dark: DARK, light: LIGHT };

const COLOR = /^#[0-9a-fA-F]{6}$/;
const NAME = /^[\p{L}\p{N} _.-]{1,32}$/u;

/**
 * @param {any} input
 * @returns {Record<string, string|number>} полный набор токенов
 */
export function validateTokens(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('tokens: нужен объект');
  const known = new Set(TOKEN_SPECS.map((s) => s.name));
  for (const key of Object.keys(input)) {
    if (!known.has(key)) throw new Error('tokens: неизвестный токен ' + key);
  }
  const out = {};
  for (const spec of TOKEN_SPECS) {
    const value = input[spec.name];
    if (value === undefined) throw new Error('tokens: нет токена ' + spec.name);
    if (spec.type === 'color') {
      if (typeof value !== 'string' || !COLOR.test(value)) throw new Error(spec.name + ': нужен цвет #rrggbb');
      out[spec.name] = value.toLowerCase();
    } else {
      if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(spec.name + ': нужно число');
      if (value < spec.min || value > spec.max) throw new Error(`${spec.name}: от ${spec.min} до ${spec.max}`);
      out[spec.name] = value;
    }
  }
  return out;
}

/** @param {string} name */
export function validateThemeName(name) {
  if (typeof name !== 'string' || !NAME.test(name.trim())) throw new Error('название темы: 1–32 символа');
  return name.trim();
}

/**
 * @param {Record<string, string|number>} tokens
 * @returns {string} CSS-правило :root с переменными
 */
export function toCss(tokens) {
  const body = TOKEN_SPECS.map((s) => {
    const v = tokens[s.name];
    return `${s.name}:${s.type === 'number' ? v + s.unit : v}`;
  }).join(';');
  return `:root{${body}}`;
}

/**
 * @param {string} hex
 * @returns {'light'|'dark'}
 */
export function modeOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? 'light' : 'dark';
}

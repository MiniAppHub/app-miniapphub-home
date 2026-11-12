// Проверка манифеста мини-приложения.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../mapp/', import.meta.url).pathname;
const m = JSON.parse(readFileSync(join(root, 'mapp.manifest.json'), 'utf8'));
const errors = [];

for (const key of ['id', 'name', 'version', 'author', 'description']) {
  if (!m[key]) errors.push('нет поля ' + key);
}
if (m.id && !/^[a-z0-9-]+\.[a-z0-9-]+$/i.test(m.id)) errors.push('id должен быть вида author.app-name');
if (m.version && !/^\d+\.\d+\.\d+$/.test(m.version)) errors.push('version должен быть X.Y.Z');
if (m.id && m.author && !m.id.toLowerCase().startsWith(m.author.toLowerCase() + '.')) {
  errors.push('префикс id должен совпадать с author');
}
const VALID = ['filesystem.external', 'apps.manage', 'apps.execute', 'network.server',
  'network.bluetooth', 'shell.launcher', 'system.contacts'];
for (const p of m.permissions || []) {
  if (!VALID.includes(p)) errors.push('неизвестное разрешение: ' + p);
}
if (m.icon && !existsSync(join(root, m.icon))) errors.push('нет иконки ' + m.icon);
if (!existsSync(join(root, 'public', 'index.html'))) errors.push('нет public/index.html');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('OK: ' + m.id + '@' + m.version);

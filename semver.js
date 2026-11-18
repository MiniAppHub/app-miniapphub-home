const RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function parse(v) {
  const m = RE.exec(String(v));
  if (!m) throw new Error('версия должна быть X.Y.Z или X.Y.Z-pre: ' + v);
  return { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.') : [] };
}

export function isPrerelease(v) {
  return parse(v).pre.length > 0;
}

export function compare(a, b) {
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < 3; i += 1) {
    if (x.core[i] !== y.core[i]) return x.core[i] < y.core[i] ? -1 : 1;
  }
  if (!x.pre.length && !y.pre.length) return 0;
  if (!x.pre.length) return 1;
  if (!y.pre.length) return -1;
  const n = Math.max(x.pre.length, y.pre.length);
  for (let i = 0; i < n; i += 1) {
    const p = x.pre[i];
    const q = y.pre[i];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    const pNum = /^\d+$/.test(p);
    const qNum = /^\d+$/.test(q);
    if (pNum && qNum) {
      if (Number(p) !== Number(q)) return Number(p) < Number(q) ? -1 : 1;
    } else if (pNum) {
      return -1;
    } else if (qNum) {
      return 1;
    } else if (p !== q) {
      return p < q ? -1 : 1;
    }
  }
  return 0;
}

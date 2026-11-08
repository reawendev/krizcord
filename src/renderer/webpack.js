// Discord'un webpack modüllerine erişim ve modül bulucular.

export let wpRequire = null;

export function init(timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const chunk = window.webpackChunkdiscord_app;
      if (chunk) {
        let req;
        try {
          chunk.push([[Symbol("krizcord")], {}, (r) => (req = r)]);
          chunk.pop();
        } catch {
          /* henüz hazır değil */
        }
        if (req && req.c && Object.keys(req.c).length > 100) {
          clearInterval(timer);
          wpRequire = req;
          return resolve(req);
        }
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error("Discord webpack modülleri bulunamadı (zaman aşımı)"));
      }
    }, 250);
  });
}

function* exportsOf() {
  if (!wpRequire) return;
  for (const id in wpRequire.c) {
    let exp;
    try {
      exp = wpRequire.c[id]?.exports;
    } catch {
      continue;
    }
    if (exp && exp !== window) yield exp;
  }
}

function candidates(exp) {
  const out = [exp];
  try {
    if (exp.default) out.push(exp.default);
    if (exp.Z) out.push(exp.Z);
    if (exp.ZP) out.push(exp.ZP);
  } catch {
    /* getter hatası */
  }
  return out;
}

export function find(filter) {
  for (const exp of exportsOf()) {
    for (const c of candidates(exp)) {
      try {
        if (c && filter(c)) return c;
      } catch {
        /* geç */
      }
    }
  }
  return null;
}

export function findAll(filter) {
  const res = [];
  for (const exp of exportsOf()) {
    for (const c of candidates(exp)) {
      try {
        if (c && filter(c)) res.push(c);
      } catch {
        /* geç */
      }
    }
  }
  return res;
}

export const findByProps = (...props) =>
  find((m) => props.every((p) => m[p] !== undefined));

export const findByCode = (...snippets) =>
  find((m) => {
    if (typeof m !== "function") return false;
    const src = Function.prototype.toString.call(m);
    return snippets.every((s) => src.includes(s));
  });

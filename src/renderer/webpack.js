// Discord'un webpack/rspack modüllerine erişim ve modül bulucular.
// Discord'un yeni derlemelerinde modüller "default"/"Z" gibi sabit adlar yerine rastgele kısa adlarla
// dışa aktarılıyor (ör. exports.Ay). Bu yüzden her modülün TÜM dışa aktarımlarına bakılır.

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

export const moduleCount = () => (wpRequire?.c ? Object.keys(wpRequire.c).length : 0);

function* exportsOf() {
  if (!wpRequire) return;
  for (const id in wpRequire.c) {
    let exp;
    try {
      exp = wpRequire.c[id]?.exports;
    } catch {
      continue;
    }
    if (exp && exp !== window && (typeof exp === "object" || typeof exp === "function")) yield exp;
  }
}

const MAX_KEYS = 400;

// Modülün kendisi + tüm dışa aktarım değerleri (getter hatalarına karşı korumalı)
function* candidates(exp) {
  yield exp;
  if (exp instanceof Node || exp === document) return;
  let keys;
  try {
    keys = Object.keys(exp);
  } catch {
    return;
  }
  if (keys.length > MAX_KEYS) return; // ikon/çeviri tabloları gibi devasa nesneler
  for (const k of keys) {
    let v;
    try {
      v = exp[k];
    } catch {
      continue;
    }
    if (v && v !== exp && v !== window && (typeof v === "object" || typeof v === "function")) yield v;
  }
}

export function find(filter) {
  for (const exp of exportsOf()) {
    for (const c of candidates(exp)) {
      try {
        if (filter(c)) return c;
      } catch {
        /* geç */
      }
    }
  }
  return null;
}

export function findAll(filter) {
  const res = new Set();
  for (const exp of exportsOf()) {
    for (const c of candidates(exp)) {
      try {
        if (filter(c)) res.add(c);
      } catch {
        /* geç */
      }
    }
  }
  return [...res];
}

export const findByProps = (...props) => find((m) => props.every((p) => m[p] !== undefined));

export const findByCode = (...snippets) =>
  find((m) => {
    if (typeof m !== "function") return false;
    const src = Function.prototype.toString.call(m);
    return snippets.every((s) => src.includes(s));
  });

/** Flux mağazasını adıyla bulur (ör. "PresenceStore"). Discord güncellemelerine en dayanıklı yol. */
export function findStore(name) {
  return find((m) => {
    if (typeof m !== "object" || typeof m.getName !== "function") return false;
    if (m.constructor?.displayName === name || m.constructor?.persistKey === name) return true;
    try {
      return m.getName() === name;
    } catch {
      return false;
    }
  });
}

/** Bulunana kadar (en fazla timeoutMs) tekrar dener. */
export function waitFor(finder, timeoutMs = 15000, interval = 300) {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      let v = null;
      try {
        v = finder();
      } catch {
        v = null;
      }
      if (v) return resolve(v);
      if (Date.now() - started > timeoutMs) return resolve(null);
      setTimeout(tick, interval);
    };
    tick();
  });
}

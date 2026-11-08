// Discord'un webpack/rspack modüllerine erişim ve modül bulucular.
// Discord'un yeni derlemelerinde modüller "default"/"Z" gibi sabit adlar yerine rastgele kısa adlarla
// dışa aktarılıyor (ör. exports.Ay). Bu yüzden her modülün TÜM dışa aktarımlarına bakılır.

export let wpRequire = null;
let runtimes = []; // Discord'da birden fazla webpack/rspack çalışma zamanı aynı kanalı paylaşıyor

// webpackChunkdiscord_app.push zincirinde HER çalışma zamanı paketi işler ve geri çağrıyı kendi
// require fonksiyonuyla çağırır. Hepsini toplarız; en büyüğü asıl Discord uygulamasıdır.
function collect() {
  const chunk = window.webpackChunkdiscord_app;
  if (!chunk) return [];
  const found = new Set();
  try {
    chunk.push([[Symbol("krizcord")], {}, (r) => { if (r) found.add(r); }]);
    chunk.pop();
  } catch {
    /* henüz hazır değil */
  }
  return [...found].filter((r) => r.c);
}

const size = (r) => {
  try {
    return Object.keys(r.c).length;
  } catch {
    return 0;
  }
};

export function init(timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    let best = 0;
    let bestSince = 0;
    const timer = setInterval(() => {
      const list = collect();
      for (const r of list) if (!runtimes.includes(r)) runtimes.push(r);
      runtimes.sort((a, b) => size(b) - size(a));
      const top = runtimes[0] ? size(runtimes[0]) : 0;
      if (top > best) {
        best = top;
        bestSince = Date.now();
      }
      // Asıl uygulama yüklendiyse (çok modül) ya da sayı 2 sn'dir artmıyorsa hazır say
      const ready = top > 1500 || (top > 100 && Date.now() - bestSince > 2000);
      if (ready) {
        clearInterval(timer);
        wpRequire = runtimes[0];
        return resolve(wpRequire);
      }
      if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        if (runtimes[0]) {
          wpRequire = runtimes[0];
          return resolve(wpRequire);
        }
        reject(new Error("Discord webpack modülleri bulunamadı (zaman aşımı)"));
      }
    }, 250);
  });
}

/** Teşhis: her çalışma zamanındaki modül sayısı */
export const runtimeSizes = () => runtimes.map(size);
export const moduleCount = () => runtimes.reduce((n, r) => n + size(r), 0);

let lastCollect = 0;
function* exportsOf() {
  // Yeni çalışma zamanı eklenmiş olabilir (geç yüklenen paketler); en fazla 5 sn'de bir bak
  if (Date.now() - lastCollect > 5000) {
    lastCollect = Date.now();
    for (const r of collect()) if (!runtimes.includes(r)) runtimes.push(r);
  }
  for (const r of runtimes) {
    for (const id in r.c) {
      let exp;
      try {
        exp = r.c[id]?.exports;
      } catch {
        continue;
      }
      if (exp && exp !== window && (typeof exp === "object" || typeof exp === "function")) yield exp;
    }
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

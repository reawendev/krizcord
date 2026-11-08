// Fonksiyonlara before / after / instead kancaları ekler. Geri alınabilir.

const HOOK = Symbol.for("krizcord.hook");

function ensureHook(obj, key) {
  const current = obj[key];
  if (typeof current !== "function") {
    throw new Error(`Yamalanacak "${String(key)}" bir fonksiyon değil`);
  }
  if (current[HOOK]) return current[HOOK];

  const state = {
    orig: current,
    before: new Set(),
    after: new Set(),
    instead: new Set(),
  };

  function patched(...args) {
    const self = this;
    for (const fn of state.before) {
      try {
        const r = fn.call(self, args);
        if (Array.isArray(r)) args = r;
      } catch (e) {
        console.error("[Krizcord] before kancası hata verdi:", e);
      }
    }
    let run = (...a) => state.orig.apply(self, a);
    for (const fn of state.instead) {
      const next = run;
      run = (...a) => fn.call(self, a, next);
    }
    let ret = run(...args);
    for (const fn of state.after) {
      try {
        const r = fn.call(self, args, ret);
        if (r !== undefined) ret = r;
      } catch (e) {
        console.error("[Krizcord] after kancası hata verdi:", e);
      }
    }
    return ret;
  }

  Object.assign(patched, current);
  patched[HOOK] = state;
  patched.toString = () => state.orig.toString();
  obj[key] = patched;
  return state;
}

function restoreIfEmpty(obj, key, state) {
  if (!state.before.size && !state.after.size && !state.instead.size) {
    if (obj[key] && obj[key][HOOK] === state) obj[key] = state.orig;
  }
}

function add(type, obj, key, fn) {
  const state = ensureHook(obj, key);
  state[type].add(fn);
  return () => {
    state[type].delete(fn);
    restoreIfEmpty(obj, key, state);
  };
}

export const before = (obj, key, fn) => add("before", obj, key, fn);
export const after = (obj, key, fn) => add("after", obj, key, fn);
export const instead = (obj, key, fn) => add("instead", obj, key, fn);

// Her eklenti için ayrı kapsam: durdurulunca tüm yamalar otomatik geri alınır.
export function createScopedPatcher() {
  const undos = [];
  const wrap = (fn) => (obj, key, cb) => {
    const undo = fn(obj, key, cb);
    undos.push(undo);
    return undo;
  };
  return {
    before: wrap(before),
    after: wrap(after),
    instead: wrap(instead),
    unpatchAll() {
      while (undos.length) {
        try {
          undos.pop()();
        } catch {
          /* geç */
        }
      }
    },
  };
}

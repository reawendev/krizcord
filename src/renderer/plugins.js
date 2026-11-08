import * as settings from "./settings";
import * as webpack from "./webpack";
import { createScopedPatcher } from "./patcher";
import * as discord from "./discord";

const registry = new Map();
const userErrors = [];

const log = (...a) =>
  console.log("%c[Krizcord]", "color:#7c5cff;font-weight:bold", ...a);

export function define(def, source = "builtin") {
  if (!def || !def.name) throw new Error("Eklenti adı (name) zorunlu");
  if (registry.has(def.name)) {
    log(`"${def.name}" zaten kayıtlı, atlandı`);
    return def;
  }
  registry.set(def.name, {
    def,
    source,
    running: false,
    error: null,
    patcher: null,
    ctx: null,
  });
  return def;
}

function isEnabled(entry) {
  const saved = settings.get().plugins[entry.def.name];
  // Kayıtta "enabled" yoksa (ör. yalnızca ayar değiştirildiyse) eklentinin varsayılanı geçerlidir.
  return saved && "enabled" in saved ? !!saved.enabled : !!entry.def.enabledByDefault;
}

function pluginSettings(name) {
  const bag = () => {
    const s = settings.get().plugins;
    s[name] ||= {};
    s[name].options ||= {};
    return s[name].options;
  };
  const peek = () => settings.get().plugins[name]?.options || {};
  return {
    get: (key, fallback) => (key in peek() ? peek()[key] : fallback), // okurken kayıt oluşturmaz
    set: (key, value) => {
      bag()[key] = value;
      settings.save();
    },
  };
}

// Eklenti ayarı (options) varsayılanları: def.options = { anahtar: { type: "boolean", label, default } }
function optionValue(entry, key) {
  const def = entry.def.options?.[key];
  return pluginSettings(entry.def.name).get(key, def?.default);
}

// Eklentiye verilen bağlam. css / onDom / interval / patcher ile eklenenler, eklenti kapanınca otomatik temizlenir.
function makeContext(entry) {
  const name = entry.def.name;
  const cleanups = [];
  const patcher = createScopedPatcher();
  const ctx = {
    webpack,
    patcher,
    discord,
    log: (...a) => log(`[${name}]`, ...a),
    settings: pluginSettings(name),
    option: (key) => optionValue(entry, key),
    toast: (msg) => window.Krizcord?.ui?.toast?.(msg),
    Krizcord: window.Krizcord,
    css(text) {
      const style = document.createElement("style");
      style.dataset.krizcordPlugin = name;
      style.textContent = text;
      document.head.appendChild(style);
      cleanups.push(() => style.remove());
      return style;
    },
    onDom(cb, delay) {
      const off = discord.onDomChange(cb, delay);
      cleanups.push(off);
      return off;
    },
    interval(fn, ms) {
      const id = setInterval(fn, ms);
      cleanups.push(() => clearInterval(id));
      return id;
    },
    on(target, type, fn, opts) {
      target.addEventListener(type, fn, opts);
      cleanups.push(() => target.removeEventListener(type, fn, opts));
    },
    onCleanup: (fn) => cleanups.push(fn),
  };
  const dispose = () => {
    patcher.unpatchAll();
    while (cleanups.length) {
      try {
        cleanups.pop()();
      } catch {
        /* geç */
      }
    }
  };
  return { ctx, dispose };
}

async function start(entry) {
  if (entry.running) return;
  const name = entry.def.name;
  const { ctx, dispose } = makeContext(entry);
  try {
    await entry.def.start?.(ctx);
    entry.running = true;
    entry.error = null;
    entry.ctx = ctx;
    entry.dispose = dispose;
  } catch (e) {
    dispose();
    entry.error = String(e?.message ?? e);
    console.error(`[Krizcord] "${name}" başlatılamadı:`, e);
    window.KrizcordNative?.log?.(`eklenti başlatılamadı: ${name}:`, entry.error);
  }
}

async function stop(entry) {
  if (!entry.running) return;
  try {
    await entry.def.stop?.(entry.ctx);
  } catch (e) {
    console.error(`[Krizcord] "${entry.def.name}" durdurulurken hata:`, e);
  }
  entry.dispose?.();
  entry.running = false;
}

export function setOption(name, key, value) {
  const entry = registry.get(name);
  if (!entry) return;
  pluginSettings(name).set(key, value);
  try {
    entry.def.onOptionChange?.(key, value, entry.ctx);
  } catch (e) {
    console.error(`[Krizcord] "${name}" ayar değişikliği hatası:`, e);
  }
}

export async function startAll() {
  for (const entry of registry.values()) {
    if (isEnabled(entry)) await start(entry);
  }
}

export async function setEnabled(name, on) {
  const entry = registry.get(name);
  if (!entry) return;
  const s = settings.get().plugins;
  s[name] = { ...(s[name] || {}), enabled: on };
  settings.save();
  if (on) await start(entry);
  else await stop(entry);
}

export function list() {
  const items = [...registry.values()].map((e) => ({
    name: e.def.name,
    description: e.def.description || "",
    authors: e.def.authors || [],
    source: e.source,
    icon: e.def.icon || null,
    options: Object.entries(e.def.options || {}).map(([key, o]) => ({ key, label: o.label || key, type: o.type || "boolean", value: optionValue(e, key) })),
    enabled: isEnabled(e),
    running: e.running,
    error: e.error,
  }));
  for (const err of userErrors) {
    items.push({
      name: err.file,
      description: "",
      authors: [],
      source: "user",
      icon: null,
      options: [],
      enabled: false,
      running: false,
      error: err.message,
      broken: true,
    });
  }
  return items;
}

// %APPDATA%/krizcord/plugins/*.js dosyalarını yükler.
export async function loadUserPlugins() {
  let files = [];
  try {
    files = await window.KrizcordNative.listPlugins();
  } catch (e) {
    console.error("[Krizcord] kullanıcı eklentileri okunamadı:", e);
    return;
  }
  for (const { file, code } of files) {
    try {
      const api = {
        ...window.Krizcord,
        definePlugin: (def) => define(def, "user"),
      };
      new Function("Krizcord", code)(api);
    } catch (e) {
      userErrors.push({ file, message: String(e?.message ?? e) });
      console.error(`[Krizcord] ${file} yüklenemedi:`, e);
    }
  }
}

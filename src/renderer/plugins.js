import * as settings from "./settings";
import * as webpack from "./webpack";
import { createScopedPatcher } from "./patcher";

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
  return saved ? !!saved.enabled : !!entry.def.enabledByDefault;
}

function pluginSettings(name) {
  const bag = () => {
    const s = settings.get().plugins;
    s[name] ||= {};
    s[name].options ||= {};
    return s[name].options;
  };
  return {
    get: (key, fallback) => (key in bag() ? bag()[key] : fallback),
    set: (key, value) => {
      bag()[key] = value;
      settings.save();
    },
  };
}

async function start(entry) {
  if (entry.running) return;
  const patcher = createScopedPatcher();
  const name = entry.def.name;
  const ctx = {
    webpack,
    patcher,
    log: (...a) => log(`[${name}]`, ...a),
    settings: pluginSettings(name),
    Krizcord: window.Krizcord,
  };
  try {
    await entry.def.start?.(ctx);
    entry.running = true;
    entry.error = null;
    entry.patcher = patcher;
    entry.ctx = ctx;
  } catch (e) {
    patcher.unpatchAll();
    entry.error = String(e?.message ?? e);
    console.error(`[Krizcord] "${name}" başlatılamadı:`, e);
  }
}

async function stop(entry) {
  if (!entry.running) return;
  try {
    await entry.def.stop?.(entry.ctx);
  } catch (e) {
    console.error(`[Krizcord] "${entry.def.name}" durdurulurken hata:`, e);
  }
  entry.patcher?.unpatchAll();
  entry.running = false;
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

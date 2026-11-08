// Krizcord - ana süreç (Electron main) yamacı.
// discord_desktop_core/index.js tarafından, Discord pencere açmadan önce yüklenir.

const path = require("path");
const fs = require("fs");
const os = require("os");
const electron = require("electron");
const { app, ipcMain, shell } = electron;

const DATA_DIR = path.join(
  process.env.APPDATA || path.join(os.homedir(), ".config"),
  "krizcord"
);
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const PLUGINS_DIR = path.join(DATA_DIR, "plugins");
const THEMES_DIR = path.join(DATA_DIR, "themes");
const PRELOAD = path.join(__dirname, "preload.js");
const RENDERER = path.join(__dirname, "renderer.js");

for (const d of [DATA_DIR, PLUGINS_DIR, THEMES_DIR]) {
  fs.mkdirSync(d, { recursive: true });
}

// Hata ayıklama için dosyaya log: %APPDATA%\krizcord\krizcord.log
const LOG_FILE = path.join(DATA_DIR, "krizcord.log");
try {
  if (fs.existsSync(LOG_FILE) && fs.statSync(LOG_FILE).size > 200 * 1024) fs.unlinkSync(LOG_FILE);
} catch {
  /* geç */
}
function log(...parts) {
  try {
    const line = parts.map((p) => (p instanceof Error ? p.stack || p.message : String(p))).join(" ");
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${line}\n`);
  } catch {
    /* geç */
  }
}
log("ana süreç yüklendi, pid", process.pid, "dist:", __dirname);

const DEFAULT_SETTINGS = { plugins: {}, themes: { "varsayilan.css": true } };

function readSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function readDirFiles(dir, ext) {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith(ext))
      .map((file) => ({ file, content: fs.readFileSync(path.join(dir, file), "utf8") }));
  } catch {
    return [];
  }
}

// --- IPC ---------------------------------------------------------------

// Orijinal Discord preload yolu, pencere id'sine göre saklanır.
const origPreloads = new Map();

ipcMain.on("krizcord:orig-preload", (e) => {
  e.returnValue = origPreloads.get(e.sender.id) || null;
});

// renderer.js bu oturumun başında bir kez okunur. Böylece arka planda güncelleme indirilse bile
// Ctrl+R ile yenilenen sayfa eski ana süreçle uyumsuz yeni kodu almaz; yeni sürüm yeniden başlatınca gelir.
let rendererCode = null;
ipcMain.on("krizcord:renderer-code", (e) => {
  try {
    rendererCode ??= fs.readFileSync(RENDERER, "utf8");
    e.returnValue = rendererCode;
  } catch (err) {
    log("renderer.js okunamadı:", err);
    e.returnValue = null;
  }
});

ipcMain.handle("krizcord:get-settings", () => readSettings());

ipcMain.handle("krizcord:set-settings", (_e, data) => {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
  return true;
});

ipcMain.handle("krizcord:list-plugins", () =>
  readDirFiles(PLUGINS_DIR, ".js").map(({ file, content }) => ({ file, code: content }))
);

ipcMain.handle("krizcord:list-themes", () =>
  readDirFiles(THEMES_DIR, ".css").map(({ file, content }) => ({ file, css: content }))
);

ipcMain.handle("krizcord:open-folder", (_e, kind) => {
  const dir = kind === "plugins" ? PLUGINS_DIR : kind === "themes" ? THEMES_DIR : DATA_DIR;
  return shell.openPath(dir);
});

// --- BrowserWindow yamacı ---------------------------------------------

ipcMain.on("krizcord:log", (e, ...parts) => {
  log(`[${parts[0]}]`, ...parts.slice(1));
});

// --- Rozet listesi -----------------------------------------------------
// GitHub'daki badges.json indirilir (renderer'ın CSP'si dış istekleri engellediği için ana süreçte),
// diske önbelleğe alınır ve her 30 dakikada yenilenir. İnternet yoksa önbellek kullanılır.

const BADGES_URL =
  process.env.KRIZCORD_BADGES_URL ||
  "https://raw.githubusercontent.com/reawendev/krizcord/main/badges.json";
const BADGES_CACHE = path.join(DATA_DIR, "badges-cache.json");
const EMPTY_BADGES = { badges: {}, users: {} };

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

let badgesData = readJson(BADGES_CACHE, EMPTY_BADGES);

async function refreshBadges() {
  try {
    const res = await electron.net.fetch(BADGES_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    if (!json || typeof json !== "object" || typeof json.users !== "object") {
      throw new Error("geçersiz badges.json biçimi");
    }
    badgesData = json;
    fs.writeFileSync(BADGES_CACHE, JSON.stringify(json));
    log("rozet listesi güncellendi, kullanıcı sayısı:", Object.keys(json.users || {}).length);
  } catch (err) {
    log("rozet listesi alınamadı (önbellek kullanılacak):", err.message || err);
  }
  return badgesData;
}

ipcMain.handle("krizcord:get-badges", () => badgesData);
ipcMain.handle("krizcord:refresh-badges", () => refreshBadges());

app.whenReady().then(() => {
  refreshBadges();
  setInterval(refreshBadges, 30 * 60 * 1000).unref?.();
});

// --- Otomatik güncelleme ----------------------------------------------------
// GitHub Releases'teki en son sürüm denetlenir. Daha yeniyse main.js / preload.js / renderer.js indirilir,
// önce ".new" olarak yazılıp sonra hep birlikte değiştirilir (yarım güncelleme olmaz).
// Yeni kod Discord yeniden başlatılınca devreye girer.

/* global __KRIZCORD_VERSION__ */
const VERSION = typeof __KRIZCORD_VERSION__ === "string" ? __KRIZCORD_VERSION__ : "0.0.0-dev";
const UPDATE_API = process.env.KRIZCORD_UPDATE_API || "https://api.github.com/repos/reawendev/krizcord/releases/latest";
const UPDATER_FILE = path.join(DATA_DIR, "updater.json");
const DIST_FILES = ["main.js", "preload.js", "renderer.js"];
const ALLOWED_HOSTS = new Set(["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"]);

let update = {
  status: "idle", // idle | checking | up-to-date | available | downloading | ready | no-release | error
  current: VERSION,
  latest: null,
  notes: null,
  error: null,
  checkedAt: null,
  auto: readJson(UPDATER_FILE, {}).auto !== false,
};
let pendingVersion = null;
let checking = null;

function isNewer(a, b) {
  const pa = String(a).split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}

function assetAllowed(url) {
  if (process.env.KRIZCORD_UPDATE_API) return true; // yalnızca geliştirme/test için
  try {
    const u = new URL(url);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

async function downloadRelease(rel) {
  const assets = Array.isArray(rel.assets) ? rel.assets : [];
  const files = [];
  for (const name of DIST_FILES) {
    const asset = assets.find((a) => a && a.name === name);
    if (!asset || !asset.browser_download_url) throw new Error(`sürümde ${name} dosyası yok`);
    if (!assetAllowed(asset.browser_download_url)) throw new Error("izin verilmeyen indirme adresi");
    const res = await electron.net.fetch(asset.browser_download_url, { headers: { "User-Agent": "Krizcord-Updater" }, cache: "no-store" });
    if (!res.ok) throw new Error(`${name} indirilemedi (HTTP ${res.status})`);
    const text = await res.text();
    if (text.length < 200) throw new Error(`${name} beklenenden küçük`);
    files.push([name, text]);
  }
  for (const [name, text] of files) fs.writeFileSync(path.join(__dirname, name + ".new"), text);
  for (const [name] of files) fs.renameSync(path.join(__dirname, name + ".new"), path.join(__dirname, name));
}

async function checkForUpdates({ manual = false } = {}) {
  if (checking) return checking;
  checking = (async () => {
    update = { ...update, status: "checking", error: null };
    try {
      const res = await electron.net.fetch(UPDATE_API, {
        headers: { Accept: "application/vnd.github+json", "User-Agent": "Krizcord-Updater" },
        cache: "no-store",
      });
      if (res.status === 404) {
        update = { ...update, status: "no-release", checkedAt: Date.now() };
        return update;
      }
      if (!res.ok) throw new Error("GitHub yanıtı HTTP " + res.status);
      const rel = await res.json();
      const latest = String(rel.tag_name || "").replace(/^v/i, "");
      if (!/^\d+\.\d+\.\d+/.test(latest)) throw new Error("geçersiz sürüm etiketi: " + rel.tag_name);
      update = { ...update, latest, notes: typeof rel.body === "string" && rel.body.trim() ? rel.body.slice(0, 4000) : null, checkedAt: Date.now() };
      if (!isNewer(latest, VERSION)) {
        update.status = "up-to-date";
      } else if (pendingVersion === latest) {
        update.status = "ready";
      } else if (!manual && !update.auto) {
        update.status = "available";
      } else {
        update.status = "downloading";
        await downloadRelease(rel);
        pendingVersion = latest;
        update.status = "ready";
        log("güncelleme indirildi:", VERSION, "->", latest);
      }
    } catch (err) {
      update = { ...update, status: "error", error: String(err.message || err), checkedAt: Date.now() };
      log("güncelleme denetimi başarısız:", err);
    }
    return update;
  })();
  try {
    return await checking;
  } finally {
    checking = null;
  }
}

ipcMain.handle("krizcord:update-status", () => update);
ipcMain.handle("krizcord:update-check", () => checkForUpdates({ manual: true }));
ipcMain.handle("krizcord:set-auto-update", (_e, on) => {
  update = { ...update, auto: !!on };
  try {
    fs.writeFileSync(UPDATER_FILE, JSON.stringify({ auto: update.auto }));
  } catch (err) {
    log("updater.json yazılamadı:", err);
  }
  if (on && update.status !== "ready") checkForUpdates();
  return update;
});
ipcMain.handle("krizcord:relaunch", () => {
  log("yeniden başlatılıyor (güncelleme uygulanacak)");
  app.relaunch();
  app.exit(0);
});
ipcMain.on("krizcord:toggle-devtools", (e) => e.sender.toggleDevTools());

app.whenReady().then(() => {
  log("Krizcord sürümü:", VERSION);
  setTimeout(() => checkForUpdates(), 15 * 1000);
  setInterval(() => checkForUpdates(), 6 * 60 * 60 * 1000).unref?.();
});

// DİKKAT: Sınıfın adı tam olarak "BrowserWindow" olmalı. Electron, BrowserWindow.fromId() ve
// getAllWindows() içinde `win.constructor.name === 'BrowserWindow'` kontrolü yapar; farklı bir ad
// verilirse Discord ana pencereyi bulamaz ve kapat/küçült/büyüt düğmeleri çalışmaz.
class BrowserWindow extends electron.BrowserWindow {
  constructor(opts) {
    const wp = opts && opts.webPreferences;
    const orig = wp && wp.preload;
    if (orig) {
      wp.preload = PRELOAD;
      wp.devTools = true; // Ctrl+Shift+I ile geliştirici araçları (Discord stable'da kapalı)
    }
    super(opts);
    if (orig) {
      origPreloads.set(this.webContents.id, orig);
      log("pencere yamalandı, orijinal preload:", orig);
      this.webContents.on("before-input-event", (event, input) => {
        if (input.type === "keyDown" && input.control && input.shift && String(input.key).toLowerCase() === "i") {
          this.webContents.toggleDevTools();
        }
      });
    }
  }
}

Object.defineProperty(BrowserWindow, "name", { value: "BrowserWindow", configurable: true });
const PatchedBrowserWindow = BrowserWindow;

// require("electron") çıktısını, BrowserWindow'u bizimkiyle değiştirilmiş bir kopyayla değiştir.
// Not: modülün `exports` alanı salt-okunur olabildiği için önce silinir (BetterDiscord/Vencord da böyle yapar).
try {
  const electronPath = require.resolve("electron");
  const cached = require.cache[electronPath];
  delete cached.exports;
  cached.exports = { ...electron, BrowserWindow: PatchedBrowserWindow };
  const ok = require("electron").BrowserWindow === PatchedBrowserWindow;
  log("BrowserWindow yamalandı mı:", ok, "| sınıf adı:", PatchedBrowserWindow.name);
} catch (err) {
  log("BrowserWindow yaması BAŞARISIZ:", err);
}

app.once("ready", () => {
  log("app ready");
});

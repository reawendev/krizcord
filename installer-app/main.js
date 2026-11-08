const { app, BrowserWindow, ipcMain, net } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const core = require("./lib/core");

const resDir = app.isPackaged
  ? path.join(process.resourcesPath, "resources")
  : path.join(__dirname, "resources");

// Kurulumda önce GitHub'daki en son sürüm indirilir; internet yoksa veya henüz sürüm yoksa
// installer'ın içine gömülü sürüm kurulur. Böylece her güncellemede yeni installer gerekmez.
const RELEASE_API = process.env.KRIZCORD_UPDATE_API || "https://api.github.com/repos/reawendev/krizcord/releases/latest";
const DIST_FILES = ["main.js", "preload.js", "renderer.js"];
const ALLOWED_HOSTS = new Set(["github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"]);

function createWindow() {
  const win = new BrowserWindow({
    width: 560,
    height: 720,
    resizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    backgroundColor: "#16171a",
    title: "Krizcord Kurulum",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, "index.html"));
}

function assetAllowed(url) {
  if (process.env.KRIZCORD_UPDATE_API) return true; // yalnızca test için
  try {
    const u = new URL(url);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

// En son sürümü geçici bir klasöre indirir. Başarısız olursa null döner (gömülü sürüme düşülür).
async function downloadLatest() {
  try {
    const res = await net.fetch(RELEASE_API, {
      headers: { Accept: "application/vnd.github+json", "User-Agent": "Krizcord-Installer" },
      cache: "no-store",
    });
    if (!res.ok) return { dir: null, reason: res.status === 404 ? "henüz yayınlanmış sürüm yok" : `GitHub HTTP ${res.status}` };
    const rel = await res.json();
    const assets = Array.isArray(rel.assets) ? rel.assets : [];
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "krizcord-"));
    for (const name of DIST_FILES) {
      const asset = assets.find((a) => a && a.name === name);
      if (!asset || !assetAllowed(asset.browser_download_url)) return { dir: null, reason: `sürümde ${name} yok` };
      const r = await net.fetch(asset.browser_download_url, { headers: { "User-Agent": "Krizcord-Installer" } });
      if (!r.ok) return { dir: null, reason: `${name} indirilemedi` };
      const text = await r.text();
      if (text.length < 200) return { dir: null, reason: `${name} bozuk görünüyor` };
      fs.writeFileSync(path.join(dir, name), text);
    }
    return { dir, version: String(rel.tag_name || "").replace(/^v/i, "") };
  } catch (e) {
    return { dir: null, reason: "internete bağlanılamadı" };
  }
}

ipcMain.handle("status", () => Object.keys(core.CHANNELS).map((k) => core.detect(k)));

ipcMain.handle("install", async (_e, key, opts = {}) => {
  const latest = await downloadLatest();
  try {
    const r = core.install(key, {
      distDir: latest.dir || path.join(resDir, "dist"),
      defaultsDir: path.join(resDir, "defaults"),
      kill: !!opts.kill,
    });
    return {
      ok: true,
      ...r,
      source: latest.dir ? `GitHub'daki en son sürüm (${latest.version})` : `installer içindeki sürüm (${latest.reason})`,
    };
  } catch (e) {
    return { ok: false, error: e.message };
  } finally {
    if (latest.dir) fs.rmSync(latest.dir, { recursive: true, force: true });
  }
});

ipcMain.handle("uninstall", (_e, key, opts = {}) => {
  try {
    return { ok: true, ...core.uninstall(key, { kill: !!opts.kill }) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle("launch", (_e, key) => {
  try {
    core.launch(key);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

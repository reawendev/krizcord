// Krizcord kurulum çekirdeği. Hem CLI (installer/cli.js) hem Electron installer kullanır.
// Hata durumunda process.exit çağırmaz, Error fırlatır.

const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const MARK = "// krizcord";
const FILES = ["main.js", "preload.js", "renderer.js"];

const CHANNELS = {
  stable: { label: "Discord", dir: "Discord", exe: "Discord.exe" },
  ptb: { label: "Discord PTB", dir: "DiscordPTB", exe: "DiscordPTB.exe" },
  canary: { label: "Discord Canary", dir: "DiscordCanary", exe: "DiscordCanary.exe" },
};

function channelOf(key) {
  const ch = CHANNELS[key];
  if (!ch) throw new Error(`Bilinmeyen kanal: ${key} (stable | ptb | canary)`);
  return ch;
}

function dataDir() {
  if (!process.env.APPDATA) throw new Error("Bu kurulum şimdilik sadece Windows için (APPDATA bulunamadı).");
  return path.join(process.env.APPDATA, "krizcord");
}

function cmpVersion(a, b) {
  const pa = a.match(/\d+/g).map(Number);
  const pb = b.match(/\d+/g).map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

function channelRoot(key) {
  const local = process.env.LOCALAPPDATA;
  if (!local) throw new Error("Bu kurulum şimdilik sadece Windows için (LOCALAPPDATA bulunamadı).");
  return path.join(local, channelOf(key).dir);
}

// En yeni app-x.y.z içindeki discord_desktop_core klasörünü bulur; yoksa null.
function findCore(key) {
  const root = channelRoot(key);
  if (!fs.existsSync(root)) return null;
  const apps = fs.readdirSync(root).filter((n) => /^app-\d/.test(n)).sort(cmpVersion).reverse();
  for (const app of apps) {
    const modules = path.join(root, app, "modules");
    if (!fs.existsSync(modules)) continue;
    const cores = fs
      .readdirSync(modules)
      .filter((n) => n.startsWith("discord_desktop_core-"))
      .sort(cmpVersion)
      .reverse();
    for (const core of cores) {
      const dir = path.join(modules, core, "discord_desktop_core");
      const index = path.join(dir, "index.js");
      if (fs.existsSync(index)) return { app, dir, index };
    }
  }
  return null;
}

function isRunning(key) {
  const exe = channelOf(key).exe;
  try {
    const out = cp.execSync(`tasklist /FI "IMAGENAME eq ${exe}"`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return out.toLowerCase().includes(exe.toLowerCase());
  } catch {
    return false;
  }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function ensureClosed(key, kill) {
  if (!isRunning(key)) return;
  const ch = channelOf(key);
  if (!kill) {
    throw new Error(`${ch.label} çalışıyor. Önce Discord'u tamamen kapat (sistem tepsisinden Çık).`);
  }
  try {
    cp.execSync(`taskkill /F /IM ${ch.exe}`, { stdio: "ignore" });
  } catch {
    /* zaten kapanmış olabilir */
  }
  for (let i = 0; i < 20 && isRunning(key); i++) sleep(250);
  if (isRunning(key)) throw new Error(`${ch.label} kapatılamadı. Elle kapatıp tekrar dene.`);
}

function copyIfMissing(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const f of fs.readdirSync(srcDir)) {
    const dest = path.join(destDir, f);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(srcDir, f), dest);
  }
}

// --- Genel API --------------------------------------------------------

function detect(key) {
  const ch = channelOf(key);
  const info = { key, label: ch.label, found: false, installed: false, running: false, version: null };
  const core = findCore(key);
  if (!core) return info;
  info.found = true;
  info.version = core.app.replace("app-", "");
  info.installed = fs.readFileSync(core.index, "utf8").includes(MARK);
  info.running = isRunning(key);
  return info;
}

function install(key, { distDir, defaultsDir, kill = false }) {
  const ch = channelOf(key);
  for (const f of FILES) {
    if (!fs.existsSync(path.join(distDir, f))) {
      throw new Error("Krizcord dosyaları (dist) bulunamadı. Önce `npm run build` çalıştır.");
    }
  }
  const core = findCore(key);
  if (!core) {
    throw new Error(`${ch.label} bulunamadı. Discord'u bir kez açıp giriş yaptıktan sonra tekrar dene.`);
  }
  ensureClosed(key, kill);

  const outDist = path.join(dataDir(), "dist");
  fs.mkdirSync(outDist, { recursive: true });
  for (const f of FILES) fs.copyFileSync(path.join(distDir, f), path.join(outDist, f));
  if (defaultsDir) {
    copyIfMissing(path.join(defaultsDir, "themes"), path.join(dataDir(), "themes"));
    copyIfMissing(path.join(defaultsDir, "plugins"), path.join(dataDir(), "plugins"));
  }

  const loader =
    `${MARK}\n` +
    `try { require(${JSON.stringify(path.join(outDist, "main.js"))}); } catch (e) { console.error("[Krizcord]", e); }\n` +
    `module.exports = require("./core.asar");\n`;
  fs.writeFileSync(core.index, loader);
  return { label: ch.label, version: core.app.replace("app-", ""), dataDir: dataDir() };
}

function uninstall(key, { kill = false } = {}) {
  const ch = channelOf(key);
  const core = findCore(key);
  if (!core) throw new Error(`${ch.label} bulunamadı.`);
  ensureClosed(key, kill);
  fs.writeFileSync(core.index, 'module.exports = require("./core.asar");\n');
  return { label: ch.label, version: core.app.replace("app-", ""), dataDir: dataDir() };
}

function launch(key) {
  const ch = channelOf(key);
  const update = path.join(channelRoot(key), "Update.exe");
  if (!fs.existsSync(update)) throw new Error(`${ch.label} başlatılamadı (Update.exe yok).`);
  cp.spawn(update, ["--processStart", ch.exe], { detached: true, stdio: "ignore" }).unref();
}

module.exports = { CHANNELS, detect, install, uninstall, launch, dataDir };

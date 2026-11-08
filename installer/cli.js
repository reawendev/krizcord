#!/usr/bin/env node
// Krizcord komut satırı kurulumu: kur / onar / kaldir / durum
// Kullanım: node installer/cli.js kur [--kanal stable|ptb|canary] [--kapat]

const path = require("path");
const core = require("./core");

const ROOT = path.join(__dirname, "..");
const args = process.argv.slice(2);
const cmd = args[0] || "yardim";
const flag = (name) => args.includes(name);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const key = opt("--kanal", "stable");
const kill = flag("--kapat");

function run() {
  switch (cmd) {
    case "kur":
    case "onar": {
      const r = core.install(key, {
        distDir: path.join(ROOT, "dist"),
        defaultsDir: path.join(ROOT, "defaults"),
        kill,
      });
      console.log(`✔ Krizcord kuruldu (${r.label} ${r.version})`);
      console.log(`  Veri klasörü: ${r.dataDir}`);
      console.log("  Discord'u aç, Ctrl+Shift+K ile ya da Kullanıcı Ayarları > Krizcord'dan paneli aç.");
      console.log("  Discord güncellenirse bu komutu tekrar çalıştır.");
      break;
    }
    case "kaldir": {
      const r = core.uninstall(key, { kill });
      console.log(`✔ Krizcord kaldırıldı (${r.label} ${r.version}). Ayarların ${r.dataDir} içinde duruyor.`);
      break;
    }
    case "durum": {
      const d = core.detect(key);
      console.log(`Kanal:      ${d.label}`);
      console.log(`Bulundu:    ${d.found ? "evet (" + d.version + ")" : "hayır"}`);
      console.log(`Krizcord:   ${d.installed ? "KURULU" : "kurulu değil"}`);
      console.log(`Çalışıyor:  ${d.running ? "evet" : "hayır"}`);
      break;
    }
    default:
      console.log(`Krizcord kurulum aracı

  node installer/cli.js kur     [--kanal stable|ptb|canary] [--kapat]
  node installer/cli.js kaldir  [--kanal ...] [--kapat]
  node installer/cli.js durum   [--kanal ...]

--kapat: Discord açıksa otomatik kapatır.`);
  }
}

try {
  run();
} catch (e) {
  console.error("\n✖ " + e.message);
  process.exit(1);
}

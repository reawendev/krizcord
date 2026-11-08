// Installer'ın ihtiyaç duyduğu dosyaları kök projeden kopyalar:
//   ../dist           -> resources/dist      (derlenmiş Krizcord)
//   ../defaults       -> resources/defaults  (varsayılan tema/eklenti)
//   ../installer/core -> lib/core.js         (kurulum çekirdeği)

const fs = require("fs");
const path = require("path");

const app = path.join(__dirname, "..");
const root = path.join(app, "..");

const dist = path.join(root, "dist");
for (const f of ["main.js", "preload.js", "renderer.js"]) {
  if (!fs.existsSync(path.join(dist, f))) {
    console.error("✖ ../dist bulunamadı. Önce kök klasörde `npm install` ve `npm run build` çalıştır.");
    process.exit(1);
  }
}

fs.rmSync(path.join(app, "resources"), { recursive: true, force: true });
fs.cpSync(dist, path.join(app, "resources", "dist"), { recursive: true });
fs.cpSync(path.join(root, "defaults"), path.join(app, "resources", "defaults"), { recursive: true });

fs.mkdirSync(path.join(app, "lib"), { recursive: true });
fs.copyFileSync(path.join(root, "installer", "core.js"), path.join(app, "lib", "core.js"));

console.log("✔ Installer dosyaları hazır");

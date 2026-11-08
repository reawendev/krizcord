const esbuild = require("esbuild");
const { version } = require("./package.json");

// Sürüm tek kaynaktan (package.json) gelir; güncelleyici bunu GitHub'daki etiketle karşılaştırır.
const common = {
  bundle: true,
  logLevel: "info",
  legalComments: "none",
  define: { __KRIZCORD_VERSION__: JSON.stringify(version) },
};

Promise.all([
  esbuild.build({
    ...common,
    entryPoints: ["src/main/index.js"],
    outfile: "dist/main.js",
    platform: "node",
    format: "cjs",
    external: ["electron"],
  }),
  esbuild.build({
    ...common,
    entryPoints: ["src/preload/index.js"],
    outfile: "dist/preload.js",
    platform: "node",
    format: "cjs",
    external: ["electron"],
  }),
  esbuild.build({
    ...common,
    entryPoints: ["src/renderer/index.js"],
    outfile: "dist/renderer.js",
    platform: "browser",
    format: "iife",
    target: "chrome110",
  }),
]).catch(() => process.exit(1));

import * as settings from "./settings";
import * as webpack from "./webpack";
import * as patcher from "./patcher";
import * as plugins from "./plugins";
import * as themes from "./themes";
import * as ui from "./ui";
import * as badges from "./badges";
import { VERSION, BRAND } from "./brand";
import builtinPlugins from "../plugins/index";

async function domReady() {
  if (document.readyState === "loading") {
    await new Promise((r) => document.addEventListener("DOMContentLoaded", r, { once: true }));
  }
}

async function boot() {
  if (!/(^|\.)discord\.com$/.test(location.hostname)) return;
  if (window.Krizcord) return;
  if (!window.KrizcordNative) {
    console.warn("[Krizcord] KrizcordNative bulunamadı, başlatılmadı.");
    return;
  }

  await settings.load();
  window.KrizcordNative.log?.("başlatılıyor:", location.href);

  window.Krizcord = {
    version: VERSION,
    brand: BRAND,
    webpack,
    patcher,
    settings,
    plugins,
    ui,
    badges,
    definePlugin: (def) => plugins.define(def, "user"),
  };

  for (const p of builtinPlugins) plugins.define(p, "builtin");

  // Arayüz ve temalar Discord'un webpack'ine bağlı değil; önce onlar gelsin.
  await domReady();
  await themes.reload();
  ui.mount();
  window.KrizcordNative.log?.("arayüz yüklendi");

  console.log(
    `%c${BRAND.name} %cv${VERSION} yüklendi`,
    `color:${BRAND.accent};font-weight:bold;font-size:14px`,
    "color:inherit"
  );

  try {
    await webpack.init();
  } catch (e) {
    console.error("[Krizcord]", e.message);
  }
  await plugins.loadUserPlugins();
  await plugins.startAll();

  // Rozetler, Discord'un mağazalarına (MessageStore / UserStore) ihtiyaç duyar; webpack hazır olduktan sonra.
  try {
    await badges.start();
  } catch (e) {
    console.error("[Krizcord] rozet sistemi başlatılamadı:", e);
  }
}

boot().catch((e) => console.error("[Krizcord] başlatma hatası:", e));

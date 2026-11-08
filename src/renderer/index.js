import * as settings from "./settings";
import * as webpack from "./webpack";
import * as patcher from "./patcher";
import * as plugins from "./plugins";
import * as themes from "./themes";
import * as ui from "./ui";
import * as badges from "./badges";
import * as circle from "./circle";
import * as discord from "./discord";
import { t } from "./i18n";
import { VERSION, BRAND } from "./brand";
import builtinPlugins from "../plugins/index";

async function domReady() {
  if (document.readyState === "loading") {
    await new Promise((r) => document.addEventListener("DOMContentLoaded", r, { once: true }));
  }
}

const native = () => window.KrizcordNative;

// Çember menünün yerleşik kısayolları. Eklentiler Krizcord.circle.register(...) ile kendi kısayollarını ekleyebilir.
function registerCircleActions() {
  circle.register({ id: "panel", label: "Krizcord paneli", icon: "layoutDashboard", run: () => ui.show() });
  circle.register({ id: "reload", label: "Discord'u yenile", icon: "rotateCcw", run: () => location.reload() });
  circle.register({
    id: "copy-id",
    label: "ID'mi kopyala",
    icon: "copy",
    run: async () => {
      const id = badges.myId();
      if (!id) return;
      await navigator.clipboard.writeText(id);
      return { toast: t("toast.copied") };
    },
  });
  circle.register({
    id: "themes-toggle",
    label: "Temaları aç/kapat",
    icon: "palette",
    run: () => ({ toast: themes.togglePause() ? t("toast.themesPaused") : t("toast.themesResumed") }),
  });
  circle.register({
    id: "badges-refresh",
    label: "Rozetleri yenile",
    icon: "award",
    run: async () => {
      await badges.refresh();
      return { toast: t("toast.badgesRefreshed") };
    },
  });
  circle.register({ id: "devtools", label: "Geliştirici araçları", icon: "terminal", run: () => native().toggleDevTools() });
  circle.register({ id: "plugins-folder", label: "Eklenti klasörü", icon: "folderOpen", run: () => native().openFolder("plugins") });
  circle.register({ id: "themes-folder", label: "Tema klasörü", icon: "palette", run: () => native().openFolder("themes") });
  circle.register({ id: "updates", label: "Güncellemeler", icon: "download", run: () => ui.show("updates") });
  circle.register({ id: "circle-settings", label: "Çember menü ayarları", icon: "circleDot", run: () => ui.show("circle") });
}

// Güncelleme durumunu izler; yeni sürüm indirildiğinde bir kez bildirim gösterir.
function watchUpdates() {
  let notified = null;
  const poll = async () => {
    try {
      const s = await native().updateStatus();
      ui.setUpdateState(s);
      if (s.status === "ready" && notified !== s.latest) {
        notified = s.latest;
        ui.toast(`Krizcord ${s.latest} ${t("updates.toast")}`, { label: t("updates.restart"), run: () => native().relaunch() });
      }
    } catch {
      /* eski ana süreçte bu IPC olmayabilir */
    }
  };
  poll();
  setInterval(poll, 60 * 1000);
}

async function boot() {
  if (!/(^|\.)discord\.com$/.test(location.hostname)) return;
  if (window.Krizcord) return;
  if (!native()) {
    console.warn("[Krizcord] KrizcordNative bulunamadı, başlatılmadı.");
    return;
  }

  await settings.load();
  native().log?.("başlatılıyor:", location.href, "sürüm", VERSION);

  window.Krizcord = {
    version: VERSION,
    brand: BRAND,
    webpack,
    patcher,
    settings,
    plugins,
    ui,
    badges,
    themes,
    circle: { register: circle.register, unregister: circle.unregister, open: circle.open, close: circle.close, openPoint: circle.openPoint },
    definePlugin: (def) => plugins.define(def, "user"),
  };

  for (const p of builtinPlugins) plugins.define(p, "builtin");
  registerCircleActions();

  // Arayüz ve temalar Discord'un webpack'ine bağlı değil; önce onlar gelsin.
  await domReady();
  await themes.reload();
  ui.mount();
  themes.watch();
  themes.onChange(() => ui.refresh());
  circle.install({ toast: (msg) => ui.toast(msg) });
  native().log?.("arayüz yüklendi");
  watchUpdates();

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
  // Teşhis: eklentilerin dayandığı Discord modülleri bulunuyor mu? (krizcord.log'a yazılır)
  await discord.waitFor(discord.UserStore, 10000);
  const found = Object.entries({
    MessageStore: discord.MessageStore(),
    UserStore: discord.UserStore(),
    PresenceStore: discord.PresenceStore(),
    Dispatcher: discord.Dispatcher(),
    TypingActions: discord.TypingActions(),
  }).map(([k, v]) => `${k}:${v ? "var" : "YOK"}`);
  native().log?.("modüller:", found.join(" "), "| çalışma zamanları (modül sayısı):", webpack.runtimeSizes().join(", "));
  // Teşhis: temaları Discord'un gerçek sınıf adlarına göre ayarlamak için yerleşim iskeleti (bir kez)
  setTimeout(() => {
    try {
      native().log?.("yerleşim iskeleti:\n" + themes.layoutSkeleton());
    } catch (e) {
      native().log?.("yerleşim iskeleti alınamadı:", String(e));
    }
  }, 12000);

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

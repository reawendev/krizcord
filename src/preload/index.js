// Krizcord - preload köprüsü.
// 1) Discord'un orijinal preload'unu çalıştırır
// 2) Renderer'a güvenli bir KrizcordNative API'si verir
// 3) renderer.js paketini sayfaya enjekte eder

const { ipcRenderer, contextBridge, webFrame } = require("electron");

const send = (...a) => ipcRenderer.send("krizcord:log", ...a);
send("preload", "çalıştı:", location.href);

const origPreload = ipcRenderer.sendSync("krizcord:orig-preload");
if (origPreload) {
  try {
    require(origPreload);
  } catch (err) {
    console.error("[Krizcord] orijinal preload yüklenemedi:", err);
  }
}

const native = {
  getSettings: () => ipcRenderer.invoke("krizcord:get-settings"),
  setSettings: (data) => ipcRenderer.invoke("krizcord:set-settings", data),
  listPlugins: () => ipcRenderer.invoke("krizcord:list-plugins"),
  listThemes: () => ipcRenderer.invoke("krizcord:list-themes"),
  openFolder: (kind) => ipcRenderer.invoke("krizcord:open-folder", kind),
  getBadges: () => ipcRenderer.invoke("krizcord:get-badges"),
  refreshBadges: () => ipcRenderer.invoke("krizcord:refresh-badges"),
  updateStatus: () => ipcRenderer.invoke("krizcord:update-status"),
  checkUpdates: () => ipcRenderer.invoke("krizcord:update-check"),
  setAutoUpdate: (on) => ipcRenderer.invoke("krizcord:set-auto-update", !!on),
  relaunch: () => ipcRenderer.invoke("krizcord:relaunch"),
  toggleDevTools: () => ipcRenderer.send("krizcord:toggle-devtools"),
  download: (url, name) => ipcRenderer.invoke("krizcord:download", String(url), String(name || "")),
  saveText: (name, text) => ipcRenderer.invoke("krizcord:save-text", String(name), String(text)),
  archiveGet: () => ipcRenderer.invoke("krizcord:archive-get"),
  archiveSet: (list) => ipcRenderer.invoke("krizcord:archive-set", list),
  themeSave: (name, css) => ipcRenderer.invoke("krizcord:theme-save", String(name), String(css)),
  themeDelete: (file) => ipcRenderer.invoke("krizcord:theme-delete", String(file)),
  themeOpen: (file) => ipcRenderer.invoke("krizcord:theme-open", String(file)),
  themeFetch: (url) => ipcRenderer.invoke("krizcord:theme-fetch", String(url)),
  themeMedia: (ref, known) => ipcRenderer.invoke("krizcord:theme-media", String(ref), known ? String(known) : null),
  onThemesChanged: (cb) => {
    ipcRenderer.on("krizcord:themes-changed", () => cb());
  },
  log: (...a) => ipcRenderer.send("krizcord:log", "renderer", ...a.map(String)),
};

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld("KrizcordNative", native);
} else {
  window.KrizcordNative = native;
}

const code = ipcRenderer.sendSync("krizcord:renderer-code");
if (code) {
  webFrame.executeJavaScript(code).then(
    () => send("preload", "renderer enjekte edildi"),
    (err) => {
      console.error("[Krizcord] renderer enjekte edilemedi:", err);
      send("preload", "renderer enjekte EDİLEMEDİ:", String(err && err.stack ? err.stack : err));
    }
  );
} else {
  send("preload", "renderer.js okunamadı");
}

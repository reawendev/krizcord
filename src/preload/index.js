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

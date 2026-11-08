const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const core = require("./lib/core");

const resDir = app.isPackaged
  ? path.join(process.resourcesPath, "resources")
  : path.join(__dirname, "resources");

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

// Her işlem { ok: true, ... } ya da { ok: false, error } döner.
const safe = (fn) => {
  try {
    return { ok: true, ...(fn() || {}) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
};

ipcMain.handle("status", () => Object.keys(core.CHANNELS).map((k) => core.detect(k)));

ipcMain.handle("install", (_e, key, opts = {}) =>
  safe(() =>
    core.install(key, {
      distDir: path.join(resDir, "dist"),
      defaultsDir: path.join(resDir, "defaults"),
      kill: !!opts.kill,
    })
  )
);

ipcMain.handle("uninstall", (_e, key, opts = {}) =>
  safe(() => core.uninstall(key, { kill: !!opts.kill }))
);

ipcMain.handle("launch", (_e, key) => safe(() => core.launch(key)));

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());

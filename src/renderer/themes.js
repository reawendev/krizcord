import * as settings from "./settings";

let themeList = [];
let paused = false; // oturumluk: çember menüden "temaları aç/kapat"

function isEnabled(file) {
  const v = settings.get().themes[file];
  return v === undefined ? file === "varsayilan.css" : !!v;
}

function styleId(file) {
  return "krizcord-theme-" + file.replace(/[^a-z0-9_-]/gi, "_");
}

function apply() {
  document.querySelectorAll("style[data-krizcord-theme]").forEach((n) => n.remove());
  if (paused) return;
  for (const t of themeList) {
    if (!isEnabled(t.file)) continue;
    const style = document.createElement("style");
    style.id = styleId(t.file);
    style.dataset.krizcordTheme = t.file;
    style.textContent = t.css;
    document.head.appendChild(style);
  }
}

export async function reload() {
  try {
    themeList = await window.KrizcordNative.listThemes();
  } catch (e) {
    console.error("[Krizcord] temalar okunamadı:", e);
    themeList = [];
  }
  apply();
}

export function setEnabled(file, on) {
  settings.get().themes[file] = on;
  settings.save();
  apply();
}

// Tüm temaları bu oturum için geçici olarak kapatır / geri açar. Kayıtlı seçimleri değiştirmez.
export function togglePause() {
  paused = !paused;
  apply();
  return paused;
}

export const isPaused = () => paused;

export function list() {
  return themeList.map((t) => ({ file: t.file, enabled: isEnabled(t.file) }));
}

// Tema yöneticisi: hazır (yerleşik) temalar + %APPDATA%\krizcord\themes\*.css dosyaları.
// Dosyadan / URL'den yükleme, silme, düzenleyicide açma ve dosya değişince canlı yenileme.

import * as settings from "./settings";
import { BUILTIN_THEMES } from "./builtinThemes";

let fileThemes = [];
let paused = false; // oturumluk: çember menüden "temaları aç/kapat"
const listeners = new Set();

const native = () => window.KrizcordNative;

// BetterDiscord tarzı başlık: /** @name ... @description ... @author ... @version ... */
function parseMeta(css) {
  const block = /^\s*\/\*\*?([\s\S]*?)\*\//.exec(css)?.[1] || "";
  const meta = {};
  for (const m of block.matchAll(/@(\w+)\s+([^\n\r*]+)/g)) meta[m[1].toLowerCase()] = m[2].trim().slice(0, 160);
  return meta;
}

function isEnabled(id) {
  const v = settings.get().themes[id];
  return v === undefined ? id === "varsayilan.css" : !!v;
}

function all() {
  return [
    ...BUILTIN_THEMES.map((t) => ({ ...t, builtin: true })),
    ...fileThemes.map((t) => {
      const meta = parseMeta(t.css);
      return {
        id: t.file,
        file: t.file,
        name: meta.name || t.file.replace(/\.css$/i, ""),
        description: meta.description || "",
        author: meta.author || "",
        version: meta.version || "",
        css: t.css,
        builtin: false,
      };
    }),
  ];
}

function apply() {
  document.querySelectorAll("style[data-krizcord-theme]").forEach((n) => n.remove());
  if (paused) return;
  for (const t of all()) {
    if (!isEnabled(t.id)) continue;
    const style = document.createElement("style");
    style.dataset.krizcordTheme = t.id;
    style.textContent = t.css;
    document.head.appendChild(style);
  }
}

const emit = () => listeners.forEach((fn) => {
  try {
    fn();
  } catch {
    /* geç */
  }
});

export async function reload() {
  try {
    fileThemes = await native().listThemes();
  } catch (e) {
    console.error("[Krizcord] temalar okunamadı:", e);
    fileThemes = [];
  }
  apply();
  emit();
}

export function setEnabled(id, on) {
  settings.get().themes[id] = on;
  settings.save();
  apply();
}

export function togglePause() {
  paused = !paused;
  apply();
  return paused;
}

export const isPaused = () => paused;

export function list() {
  return all().map(({ css, ...t }) => ({ ...t, enabled: isEnabled(t.id), size: css.length }));
}

export const onChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// --- Yükleme / yönetim ---------------------------------------------------------

export async function importText(name, css) {
  if (!css || !/[{};]/.test(css)) throw new Error("Bu bir CSS dosyası gibi görünmüyor");
  const file = await native().themeSave(name, css);
  settings.get().themes[file] = true;
  settings.save();
  await reload();
  return file;
}

export async function importUrl(url) {
  const { css, name } = await native().themeFetch(url);
  return importText(parseMeta(css).name || name, css);
}

export async function remove(file) {
  await native().themeDelete(file);
  delete settings.get().themes[file];
  settings.save();
  await reload();
}

export const openInEditor = (file) => native().themeOpen(file);

export async function createNew() {
  const css = `/**
 * @name Yeni Tema
 * @description Kendi temam
 * @author ${"sen"}
 * @version 1.0.0
 */

/* Örnek: arka plan ve vurgu renkleri. Kaydedince Discord'da anında güncellenir. */
:root, .theme-dark {
  --background-primary: #16161a !important;
  --background-secondary: #111114 !important;
  --background-tertiary: #0b0b0d !important;
  --brand-500: #7c5cff !important;
}
`;
  const file = await native().themeSave("yeni-tema", css);
  settings.get().themes[file] = true;
  settings.save();
  await reload();
  await openInEditor(file);
  return file;
}

// Dosya klasörde değişince (düzenleyicide kaydedildi vb.) canlı yenile
export function watch() {
  native()?.onThemesChanged?.(() => reload());
}

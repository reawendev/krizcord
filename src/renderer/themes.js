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
        background: meta.background || "",
        logo: meta.logo || "",
        input: meta.input || "",
        css: t.css,
        builtin: false,
      };
    }),
  ];
}

// Tema stilleri sayfanın EN SONUNA konur: Discord'un sonradan yüklenen stillerinden sonra
// geldikleri için eşit öncelikte temalar kazanır.
function container() {
  let box = document.getElementById("krizcord-themes");
  if (!box) {
    box = document.createElement("krizcord-themes");
    box.id = "krizcord-themes";
    box.style.display = "none";
  }
  if (box !== document.documentElement.lastElementChild) document.documentElement.appendChild(box);
  return box;
}

let keepLast = null;
function keepThemesLast() {
  if (keepLast) return;
  keepLast = new MutationObserver(() => {
    const box = document.getElementById("krizcord-themes");
    if (box && document.documentElement.lastElementChild !== box) document.documentElement.appendChild(box);
  });
  keepLast.observe(document.documentElement, { childList: true });
}

function apply() {
  document.querySelectorAll("style[data-krizcord-theme]").forEach((n) => n.remove());
  if (paused) return;
  const box = container();
  for (const t of all()) {
    if (!isEnabled(t.id)) continue;
    const style = document.createElement("style");
    style.dataset.krizcordTheme = t.id;
    style.textContent = t.css;
    box.appendChild(style);
  }
}

function applyAll() {
  apply();
  syncBackground();
}

// --- Koruyucu ------------------------------------------------------------------------------
// Discord <html>'in sınıflarını zaman zaman baştan yazıyor; bizim sınıflarımız (krizcord-has-*) ve
// arka plan katmanı silinirse geri konur. Resim değişkenleri <html style>'a değil kendi <style>'ımıza yazılır.
const rootClasses = new Set();
const rootVars = new Map();
let guard = null;

function setRootClass(name, on) {
  if (on) rootClasses.add(name);
  else rootClasses.delete(name);
  document.documentElement.classList.toggle(name, on);
  startGuard();
}

function varsStyle() {
  let st = document.getElementById("krizcord-media-vars");
  if (!st) {
    st = document.createElement("style");
    st.id = "krizcord-media-vars";
    document.head.appendChild(st);
  }
  return st;
}

function setRootVar(name, value) {
  if (value == null) rootVars.delete(name);
  else rootVars.set(name, value);
  varsStyle().textContent = `:root{${[...rootVars].map(([k, v]) => `${k}:${v};`).join("")}}`;
}

function startGuard() {
  if (guard) return;
  const fix = () => {
    const html = document.documentElement;
    for (const c of rootClasses) if (!html.classList.contains(c)) html.classList.add(c);
    if (rootVars.size && !document.getElementById("krizcord-media-vars")) setRootVar("--krizcord-noop", null);
    const layer = bgLayerEl;
    if (layer && !layer.isConnected && document.body) {
      document.body.prepend(layer);
      layer.querySelector("video")?.play?.().catch(() => {});
    }
  };
  guard = new MutationObserver(fix);
  guard.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  guard.observe(document.head, { childList: true });
  if (document.body) guard.observe(document.body, { childList: true });
}

let bgLayerEl = null;

// --- Arka plan medyası (GIF / video / resim) ----------------------------------------------
// Etkin temalardan "@background" tanımlayan sonuncusu kullanılır. Medya Discord'un ARKASINA sabit
// bir katman olarak konur; temanın Discord yüzeylerini saydam yapması gerekir. Tema bu katmanı
// #krizcord-bg seçicisiyle biçimlendirebilir (bulanıklık, karartma vb.).
let bg = { ref: null, stamp: null, url: null };
let bgSeq = 0;

const BG_CSS = `
#krizcord-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;background:#000}
#krizcord-bg>video,#krizcord-bg>img{width:100%;height:100%;object-fit:cover;display:block}
html.krizcord-has-bg,html.krizcord-has-bg body{background:transparent!important}`;

function bgLayer() {
  let layer = document.getElementById("krizcord-bg");
  if (!layer) {
    layer = document.createElement("div");
    layer.id = "krizcord-bg";
    layer.setAttribute("aria-hidden", "true");
    document.body.prepend(layer);
  }
  bgLayerEl = layer;
  if (!document.getElementById("krizcord-bg-base")) {
    const st = document.createElement("style");
    st.id = "krizcord-bg-base";
    st.textContent = BG_CSS;
    document.head.appendChild(st);
  }
  return layer;
}

function clearBackground() {
  document.getElementById("krizcord-bg")?.remove();
  bgLayerEl = null;
  setRootClass("krizcord-has-bg", false);
  if (bg.url) URL.revokeObjectURL(bg.url);
  bg = { ref: null, stamp: null, url: null };
}

async function applyBackground(ref) {
  const seq = ++bgSeq;
  if (!ref) return clearBackground();
  const res = await native().themeMedia?.(ref, bg.ref === ref ? bg.stamp : null);
  if (seq !== bgSeq) return; // bu arada başka tema seçildi
  if (!res || res.error) {
    native().log?.("arka plan yüklenemedi:", ref, res?.error || "bilinmeyen hata");
    return clearBackground();
  }
  if (res.same && document.getElementById("krizcord-bg")) return;

  const url = URL.createObjectURL(new Blob([res.data], { type: res.mime }));
  const isVideo = res.mime.startsWith("video/");
  const el = document.createElement(isVideo ? "video" : "img");
  if (isVideo) {
    Object.assign(el, { muted: true, loop: true, autoplay: true, playsInline: true, disablePictureInPicture: true });
    el.setAttribute("muted", "");
  }
  el.addEventListener("error", () => native().log?.("arka plan oynatılamadı (biçim ya da CSP):", ref, res.mime));
  el.src = url;

  const layer = bgLayer();
  layer.replaceChildren(el);
  if (bg.url) URL.revokeObjectURL(bg.url);
  bg = { ref, stamp: res.stamp, url };
  setRootClass("krizcord-has-bg", true);
  if (isVideo) el.play?.().catch(() => {});
  native().log?.("arka plan uygulandı:", ref, res.mime, `${Math.round(res.data.byteLength / 1024)} KB`);
}

// Pencere görünmezken videoyu durdur (işlemci/GPU tasarrufu)
document.addEventListener("visibilitychange", () => {
  const v = document.querySelector("#krizcord-bg > video");
  if (!v) return;
  if (document.hidden) v.pause();
  else v.play().catch(() => {});
});

// --- Tema resimleri: @logo, @input -----------------------------------------------------
// Etkin temadaki "@logo dosya" / "@input dosya" resimleri sayfaya CSS değişkeni olarak konur:
//   --krizcord-logo, --krizcord-input  (url(blob:...))  ve <html>'e krizcord-has-logo / krizcord-has-input sınıfı.
// Tema CSS'i bu değişkenleri istediği yerde kullanır.
const IMAGE_SLOTS = ["logo", "input"];
const slots = Object.fromEntries(IMAGE_SLOTS.map((n) => [n, { ref: null, stamp: null, url: null, seq: 0 }]));

function clearSlot(name) {
  const st = slots[name];
  setRootVar(`--krizcord-${name}`, null);
  setRootClass(`krizcord-has-${name}`, false);
  if (st.url) URL.revokeObjectURL(st.url);
  Object.assign(st, { ref: null, stamp: null, url: null });
}

async function applySlot(name, ref) {
  const st = slots[name];
  const seq = ++st.seq;
  if (!ref) return clearSlot(name);
  const res = await native().themeMedia?.(ref, st.ref === ref ? st.stamp : null);
  if (seq !== st.seq) return;
  if (!res || res.error) {
    native().log?.(`tema resmi (${name}) yüklenemedi:`, ref, res?.error || "bilinmeyen hata");
    return clearSlot(name);
  }
  if (res.same) return;
  if (!res.mime.startsWith("image/")) {
    native().log?.(`tema resmi (${name}) bir resim değil:`, ref, res.mime);
    return clearSlot(name);
  }
  const url = URL.createObjectURL(new Blob([res.data], { type: res.mime }));
  setRootVar(`--krizcord-${name}`, `url("${url}")`);
  setRootClass(`krizcord-has-${name}`, true);
  if (st.url) URL.revokeObjectURL(st.url);
  Object.assign(st, { ref, stamp: res.stamp, url });
  native().log?.(`tema resmi (${name}) uygulandı:`, ref, res.mime);
}

function lastEnabled(field) {
  if (paused) return null;
  const list = all().filter((t) => isEnabled(t.id) && t[field]);
  return list.length ? list[list.length - 1][field] : null;
}

function syncBackground() {
  const report = (e) => native().log?.("tema medyası hatası:", String(e));
  applyBackground(lastEnabled("background")).catch(report);
  for (const name of IMAGE_SLOTS) applySlot(name, lastEnabled(name)).catch(report);
}

/** Teşhis: Discord'un ana yerleşim iskeleti (büyük kutuların sınıf adları) — temaları gerçek adlara göre ayarlamak için */
export function layoutSkeleton(maxDepth = 14) {
  const out = [];
  const short = (el) => {
    const cls = typeof el.className === "string" ? el.className.split(/\s+/).filter(Boolean).slice(0, 3).join(".") : "";
    const label = el.getAttribute("aria-label");
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${label ? `[${label.slice(0, 24)}]` : ""}`;
  };
  const walk = (el, depth) => {
    if (depth > maxDepth || out.length > 220) return;
    for (const c of el.children) {
      const r = c.getBoundingClientRect();
      if (r.width < 120 || r.height < 36) continue;
      out.push(`${"  ".repeat(depth)}${short(c)} ${Math.round(r.width)}x${Math.round(r.height)}@${Math.round(r.left)},${Math.round(r.top)}`);
      walk(c, depth + 1);
    }
  };
  const root = document.getElementById("app-mount");
  if (root) walk(root, 0);
  return out.join("\n");
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
  applyAll();
  emit();
}

export function setEnabled(id, on) {
  settings.get().themes[id] = on;
  settings.save();
  applyAll();
}

export function togglePause() {
  paused = !paused;
  applyAll();
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
  keepThemesLast();
}

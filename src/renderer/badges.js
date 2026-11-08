// Krizcord rozet sistemi.
// GitHub'daki badges.json içinde tanımlı Discord ID'lerine rozet gösterir. Rozetler yalnızca Krizcord
// kullananlara görünür (arayüze bu kod ekler). Yer: sohbette kullanıcı adının yanı, üye listesi, profiller.

import * as webpack from "./webpack";
import { BRAND } from "./brand";

const HEX = /^#[0-9a-f]{6}$/i;
const SNOWFLAKE = /^\d{15,25}$/;

let data = { badges: {}, users: {} };
let observer = null;
let scanTimer = null;
let refreshTimer = null;
let MessageStore = null;
let UserStore = null;
const seenSurfaces = new Set();

const native = () => window.KrizcordNative;
const log = (...a) => native()?.log?.("rozet:", ...a);

// --- Veri --------------------------------------------------------------

function sanitize(raw) {
  const out = { badges: {}, users: {} };
  if (!raw || typeof raw !== "object") return out;
  for (const [key, def] of Object.entries(raw.badges || {})) {
    if (!def || typeof def !== "object") continue;
    out.badges[key] = {
      name: String(def.name || key).slice(0, 60),
      color: HEX.test(def.color) ? def.color : BRAND.accent,
    };
  }
  for (const [id, keys] of Object.entries(raw.users || {})) {
    if (!SNOWFLAKE.test(id) || !Array.isArray(keys)) continue;
    const valid = keys.filter((k) => typeof k === "string" && out.badges[k]);
    if (valid.length) out.users[id] = valid;
  }
  return out;
}

export async function load() {
  try {
    data = sanitize(await native().getBadges());
  } catch (e) {
    console.error("[Krizcord] rozetler alınamadı:", e);
  }
}

export async function refresh() {
  try {
    data = sanitize(await native().refreshBadges());
  } catch (e) {
    console.error("[Krizcord] rozetler yenilenemedi:", e);
  }
  scheduleScan(0);
  return data;
}

export const definitions = () =>
  Object.entries(data.badges).map(([key, def]) => ({ key, ...def, iconUrl: iconUrl(def.color) }));

export const holderCount = () => Object.keys(data.users).length;

function badgesOf(id) {
  const keys = data.users[id];
  return keys ? keys.map((k) => ({ key: k, ...data.badges[k] })) : [];
}

export function myId() {
  try {
    UserStore ||= webpack.findByProps("getCurrentUser", "getUser");
    return UserStore?.getCurrentUser?.()?.id ?? null;
  } catch {
    return null;
  }
}

export function myBadges() {
  const id = myId();
  return id ? badgesOf(id) : [];
}

// --- Görsel ------------------------------------------------------------

// Dışarıdan resim yüklenmez: renk, doğrulanmış #rrggbb olarak SVG'ye gömülür.
export function iconUrl(color) {
  const c = HEX.test(color) ? color : BRAND.accent;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">` +
    `<path d="M12 1.5 21 5v6.2c0 5.4-3.6 9.6-9 11.3C6.6 20.8 3 16.6 3 11.2V5z" fill="${c}"/>` +
    `<text x="12" y="16.2" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="12" text-anchor="middle" fill="#fff">K</text>` +
    `</svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
}

function makeBadges(list) {
  const wrap = document.createElement("span");
  wrap.className = "kc-badges";
  for (const b of list) {
    const span = document.createElement("span");
    span.className = "kc-badge";
    span.title = b.name;
    const img = document.createElement("img");
    img.src = iconUrl(b.color);
    img.alt = "";
    img.draggable = false;
    span.appendChild(img);
    wrap.appendChild(span);
  }
  return wrap;
}

function noteSurface(name) {
  if (seenSurfaces.has(name)) return;
  seenSurfaces.add(name);
  log("rozet yerleştirildi:", name);
}

// --- Kullanıcı ID'sini bulma ---------------------------------------------

function fiberOf(el) {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  return key ? el[key] : null;
}

function idFromFiber(el) {
  let f = fiberOf(el);
  for (let i = 0; f && i < 40; i++, f = f.return) {
    const p = f.memoizedProps;
    if (!p || typeof p !== "object") continue;
    const id = p.user?.id ?? p.message?.author?.id ?? p.author?.id ?? p.userId;
    if (typeof id === "string" && SNOWFLAKE.test(id)) return id;
  }
  return null;
}

function authorOfMessage(li) {
  const m = /^chat-messages-(?:[^-]+-)?(\d+)-(\d+)$/.exec(li.id);
  if (m) {
    try {
      MessageStore ||= webpack.findByProps("getMessage", "getMessages");
      const id = MessageStore?.getMessage?.(m[1], m[2])?.author?.id;
      if (id) return id;
    } catch {
      /* fiber ile dene */
    }
  }
  return idFromFiber(li);
}

// --- Yüzeyler ------------------------------------------------------------

function needsWork(el, id) {
  const list = badgesOf(id);
  if (!list.length) return null;
  if (el.querySelector(":scope .kc-badges")) return null;
  return list;
}

function scanChat() {
  for (const li of document.querySelectorAll('li[id^="chat-messages-"]')) {
    const name = li.querySelector('h3 [class*="username"]');
    if (!name || li.querySelector(".kc-badges")) continue;
    const id = authorOfMessage(li);
    const list = id && needsWork(li, id);
    if (!list) continue;
    name.after(makeBadges(list));
    noteSurface("sohbet");
  }
}

function scanMembers() {
  for (const row of document.querySelectorAll('[data-list-item-id^="members-"]')) {
    if (row.querySelector(".kc-badges")) continue;
    const raw = row.getAttribute("data-list-item-id") || "";
    const id = /(\d{15,25})$/.exec(raw)?.[1] || idFromFiber(row);
    const list = id && needsWork(row, id);
    if (!list) continue;
    const name = row.querySelector('[class*="username"]') || row.querySelector('[class*="name_"]');
    if (!name) continue;
    name.after(makeBadges(list));
    noteSurface("üye listesi");
  }
}

function scanProfiles() {
  for (const box of document.querySelectorAll('[class*="profileBadges"], [class*="badgeContainer"]')) {
    if (box.querySelector(".kc-badges")) continue;
    const id = idFromFiber(box);
    const list = id && needsWork(box, id);
    if (!list) continue;
    box.appendChild(makeBadges(list));
    noteSurface("profil");
  }
}

function scan() {
  scanTimer = null;
  if (!Object.keys(data.users).length) return;
  try {
    scanChat();
    scanMembers();
    scanProfiles();
  } catch (e) {
    console.error("[Krizcord] rozet taraması hatası:", e);
  }
}

function scheduleScan(delay = 250) {
  if (scanTimer) return;
  scanTimer = setTimeout(scan, delay);
}

export const CSS = `
.kc-badges{display:inline-flex;align-items:center;gap:3px;margin-left:5px;vertical-align:middle}
.kc-badge{display:inline-flex;width:18px;height:18px;flex:none;cursor:default}
.kc-badge img{width:100%;height:100%;pointer-events:none}
`;

// --- Başlat / durdur ---------------------------------------------------

export async function start() {
  await load();
  observer = new MutationObserver(() => scheduleScan());
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleScan(500);
  refreshTimer = setInterval(() => load().then(() => scheduleScan(0)), 10 * 60 * 1000);
  log("başlatıldı. Tanımlı kullanıcı sayısı:", holderCount());
}

export function stop() {
  observer?.disconnect();
  clearInterval(refreshTimer);
  document.querySelectorAll(".kc-badges").forEach((n) => n.remove());
}

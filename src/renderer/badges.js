// Krizcord rozet sistemi.
// GitHub'daki badges.json içinde tanımlı Discord ID'lerine rozet gösterir. Rozetler yalnızca Krizcord
// kullananlara görünür (arayüze bu kod ekler). Yerler: sohbette adın yanı, üye listesi, profil kartı.

import * as discord from "./discord";
import { BRAND } from "./brand";

const HEX = /^#[0-9a-f]{6}$/i;
const SNOWFLAKE = /^\d{15,25}$/;

let data = { badges: {}, users: {} };
let stopDom = null;
let refreshTimer = null;
const seenSurfaces = new Set();
let profileLogged = false;

const native = () => window.KrizcordNative;
const log = (...a) => native()?.log?.("rozet:", ...a);

// --- Rozet ikonları (özgün SVG; yalnızca bu sabit metinler kullanılır, uzaktan SVG yüklenmez) -------------

const LIME = `<linearGradient id="l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9dff6a"/><stop offset="1" stop-color="#3fd11c"/></linearGradient>`;
const DARK = `<linearGradient id="d" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4a52"/><stop offset="1" stop-color="#1c1c21"/></linearGradient>`;
const GLOW = `<filter id="g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation=".9" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const SPARK = (x, y, s = 1) =>
  `<path transform="translate(${x} ${y}) scale(${s})" d="M0-4.5 1.2-1.2 4.5 0 1.2 1.2 0 4.5-1.2 1.2-4.5 0-1.2-1.2Z" fill="url(#l)" filter="url(#g)"/>`;

const ICONS = {
  // Founder: Krizcord'a özel mor elmas amblem
  founder: `<defs><linearGradient id="a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c4a6ff"/><stop offset=".5" stop-color="#7c3aed"/><stop offset="1" stop-color="#3b1585"/></linearGradient><linearGradient id="b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e8ff"/><stop offset="1" stop-color="#a78bfa"/></linearGradient></defs>
    <path d="M16 1.8 29.6 16 16 30.2 2.4 16Z" fill="url(#a)" stroke="#d8c8ff" stroke-opacity=".55" stroke-width=".8"/>
    <path d="M16 1.8 29.6 16H2.4Z" fill="#fff" fill-opacity=".1"/>
    <path d="M16 8.6 23.2 16 16 23.4 8.8 16Z" fill="#1e0b4b" fill-opacity=".55"/>
    <path d="M16 11.4 20.4 16 16 20.6 11.6 16Z" fill="url(#b)"/>`,
  // Early Supporter: filizlenen yaprak
  early: `<defs>${LIME}${DARK}${GLOW}</defs>
    <path d="M16 29.2V17.2" stroke="#5be536" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M15.6 21.2C15.6 15.6 12.2 12 6 11.8c-.2 5.7 3.4 9.4 9.6 9.4Z" fill="url(#d)" stroke="#5c5c66" stroke-width=".6"/>
    <path d="M16.2 18.4C16.2 11.4 20.4 6.6 27.4 6c.4 7.2-4.1 12-11.2 12.4Z" fill="url(#l)" filter="url(#g)"/>`,
  // Moderator: kalkan ve onay işareti
  moderator: `<defs>${LIME}${DARK}${GLOW}</defs>
    <path d="M16 2.4 27 6.4v8.4c0 6.6-4.6 12-11 14.8C9.6 26.8 5 21.4 5 14.8V6.4Z" fill="url(#d)" stroke="#62626c" stroke-width="1.1"/>
    <path d="M10.6 15.8l3.8 3.8 7.2-7.4" fill="none" stroke="url(#l)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" filter="url(#g)"/>`,
  // Developer: altıgen içinde kod işareti
  developer: `<defs>${LIME}${DARK}${GLOW}</defs>
    <path d="M15 2.6 25.8 8.8v12.4L15 27.4 4.2 21.2V8.8Z" fill="url(#d)" stroke="#62626c" stroke-width="1.1"/>
    <path d="M11.6 11.6 8.2 15l3.4 3.4M18.4 11.6l3.4 3.4-3.4 3.4" fill="none" stroke="url(#l)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#g)"/>
    ${SPARK(26.5, 25.5, 0.95)}`,
  // Contributor: topluluk ve katkı parıltısı
  contributor: `<defs>${LIME}${GLOW}<linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d4d4dc"/><stop offset="1" stop-color="#8a8a94"/></linearGradient></defs>
    <circle cx="10.5" cy="10.4" r="3.8" fill="#6b6b75"/>
    <path d="M3 24.6c0-4.5 3.4-7.8 7.5-7.8 2.3 0 4.3 1 5.6 2.6-1.7 1.6-2.7 3.6-2.8 5.2Z" fill="#6b6b75"/>
    <circle cx="18.6" cy="12.2" r="4.4" fill="url(#p)"/>
    <path d="M10.4 27.6c0-5 3.7-8.6 8.2-8.6s8.2 3.6 8.2 8.6Z" fill="url(#p)"/>
    ${SPARK(27, 6.5, 1)}`,
  // Pioneer: gümüş pusula yıldızı
  pioneer: `<defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c9ccd3"/><stop offset="1" stop-color="#7b7f8a"/></linearGradient></defs>
    <circle cx="16" cy="16" r="10.6" fill="none" stroke="#5c5f68" stroke-width="1.8" stroke-dasharray="11.5 5.2" transform="rotate(22 16 16)"/>
    <path d="M16 1.6 19 13 30.4 16 19 19 16 30.4 13 19 1.6 16 13 13Z" fill="url(#s)"/>
    <path d="M16 1.6 19 13 16 16ZM30.4 16 19 19 16 16ZM16 30.4 13 19 16 16ZM1.6 16 13 13 16 16Z" fill="#3a3d45" fill-opacity=".38"/>`,
  // Krizcord kullanıcısı (genel)
  member: `<defs>${DARK}<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9a2ff"/><stop offset="1" stop-color="#7c5cff"/></linearGradient></defs>
    <path d="M16 2.4 27 6.4v8.4c0 6.6-4.6 12-11 14.8C9.6 26.8 5 21.4 5 14.8V6.4Z" fill="url(#d)" stroke="#62626c" stroke-width="1.1"/>
    <path d="M12.2 9.6v12.2M12.4 16.2l6.4-6.6M14.6 13.9l5.2 7.9" fill="none" stroke="url(#m)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
};

const svgUrl = (inner) =>
  "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${inner}</svg>`);

const ICON_URLS = Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [k, svgUrl(v)]));

// Bilinmeyen ikon için: renkli kalkan (renk doğrulanmış #rrggbb).
function shieldUrl(color) {
  const c = HEX.test(color) ? color : BRAND.accent;
  return svgUrl(
    `<path d="M16 2.4 27 6.4v8.4c0 6.6-4.6 12-11 14.8C9.6 26.8 5 21.4 5 14.8V6.4Z" fill="${c}"/>` +
      `<path d="M12.2 9.6v12.2M12.4 16.2l6.4-6.6M14.6 13.9l5.2 7.9" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`
  );
}

export const iconFor = (b) => ICON_URLS[b?.icon] || shieldUrl(b?.color);
/** Geriye dönük: eski kod renk verirdi */
export const iconUrl = (colorOrBadge) => (typeof colorOrBadge === "object" ? iconFor(colorOrBadge) : shieldUrl(colorOrBadge));
export const builtinIcons = () => Object.keys(ICONS);

// --- Veri --------------------------------------------------------------

function sanitize(raw) {
  const out = { badges: {}, users: {} };
  if (!raw || typeof raw !== "object") return out;
  for (const [key, def] of Object.entries(raw.badges || {})) {
    if (!def || typeof def !== "object" || !/^[\w-]{1,32}$/.test(key)) continue;
    out.badges[key] = {
      name: String(def.name || key).slice(0, 60),
      description: typeof def.description === "string" ? def.description.slice(0, 140) : "",
      icon: typeof def.icon === "string" && ICONS[def.icon] ? def.icon : null,
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
  document.querySelectorAll(".kc-badges").forEach((n) => n.remove());
  scan();
  return data;
}

export const definitions = () => Object.entries(data.badges).map(([key, def]) => ({ key, ...def, iconUrl: iconFor(def) }));
export const holderCount = () => Object.keys(data.users).length;
export const badgesOf = (id) => (data.users[id] || []).map((k) => ({ key: k, ...data.badges[k] }));
export const myId = () => discord.myId();
export function myBadges() {
  const id = myId();
  return id ? badgesOf(id) : [];
}

// --- Görsel ------------------------------------------------------------

function makeBadges(list, where) {
  const wrap = document.createElement("span");
  wrap.className = "kc-badges" + (where === "profile" ? " kc-badges-profile" : "");
  for (const b of list) {
    const span = document.createElement("span");
    span.className = "kc-badge";
    span.setAttribute("data-tip", b.name);
    span.setAttribute("aria-label", b.name);
    span.setAttribute("role", "img");
    const img = document.createElement("img");
    img.src = iconFor(b);
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

// --- Yüzeyler ------------------------------------------------------------

function scanChat() {
  for (const li of discord.messageElements()) {
    const name = li.querySelector('h3 [class*="username"]');
    if (!name || li.querySelector(".kc-badges")) continue;
    const id = discord.authorOfMessage(li);
    const list = id ? badgesOf(id) : [];
    if (!list.length) continue;
    name.after(makeBadges(list));
    noteSurface("sohbet");
  }
}

function scanMembers() {
  for (const { row, id } of discord.memberRows()) {
    if (!id || row.querySelector(".kc-badges")) continue;
    const list = badgesOf(id);
    if (!list.length) continue;
    const name = row.querySelector('[class*="username"]') || row.querySelector('[class*="name_"]');
    if (!name) continue;
    name.after(makeBadges(list));
    noteSurface("üye listesi");
  }
}

// Profil kartı / tam profil. Discord'un yapısı sık değiştiği için birkaç yol denenir:
// 1) Discord'un kendi rozet satırı (rozet resimleri /badge-icons/ adresinden gelir) → yanına eklenir.
// 2) Rozet satırı yoksa (kişinin Discord rozeti yoksa) → ad başlığının hemen altına eklenir.
const PROFILE_ROOTS = [
  '[class*="userPopout"]',
  '[class*="userProfileOuter"]',
  '[class*="userProfileModal"]',
  '[class*="user-profile-popout"]',
  '[class*="profileCard"]',
  '[class*="biteSize"]',
  '[class*="fullSize"]',
  '[role="dialog"]',
].join(",");

function profileUserId(root) {
  const avatar = root.querySelector('img[src*="/avatars/"]');
  const fromAvatar = avatar && /\/avatars\/(\d{15,25})\//.exec(avatar.getAttribute("src") || "")?.[1];
  return fromAvatar || discord.idFromFiber(root.querySelector('[class*="avatar"]') || root);
}

function skeleton(el, depth = 0, max = 5) {
  if (!el || depth > max) return "";
  const cls = (typeof el.className === "string" ? el.className : "").split(/\s+/).filter(Boolean).map((c) => c.replace(/_[\w-]{4,}$/, "")).slice(0, 2).join(".");
  const self = `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${el.getAttribute?.("role") ? `[role=${el.getAttribute("role")}]` : ""}`;
  const kids = [...el.children].slice(0, 6).map((c) => skeleton(c, depth + 1, max)).filter(Boolean);
  return kids.length ? `${self}(${kids.join(",")})` : self;
}

function scanProfiles() {
  const roots = [...document.querySelectorAll(PROFILE_ROOTS)].filter(
    (r) => !r.closest(".kc-overlay,.kc-circle-root,li[id^='chat-messages-']") && r.querySelector('img[src*="/avatars/"],[class*="avatar"]')
  );
  // Yalnızca en dıştaki kökleri kullan (iç içe eşleşmeleri ele)
  const outer = roots.filter((r) => !roots.some((o) => o !== r && o.contains(r)));

  for (const root of outer) {
    if (!profileLogged) {
      profileLogged = true;
      log("profil kartı iskeleti:", skeleton(root).slice(0, 1800));
    }
    if (root.querySelector(".kc-badges-profile")) continue;
    const id = profileUserId(root);
    const list = id ? badgesOf(id) : [];
    if (!list.length) continue;

    const discordBadge = root.querySelector('img[src*="/badge-icons/"]');
    const row =
      root.querySelector('[class*="badgeList"],[class*="profileBadges"]') ||
      (discordBadge && (discordBadge.closest('[class*="badges"],[class*="badgeList"]') || discordBadge.parentElement?.parentElement));
    if (row) {
      row.append(makeBadges(list, "profile"));
      noteSurface("profil (rozet satırı)");
      continue;
    }
    const name = root.querySelector('h1,h2,[class*="nickname"],[class*="displayName"],[class*="userTagUsername"]');
    if (name) {
      const holder = document.createElement("div");
      holder.className = "kc-badges-row";
      holder.append(makeBadges(list, "profile"));
      name.after(holder);
      noteSurface("profil (ad altı)");
    }
  }
}

function scan() {
  if (!Object.keys(data.users).length) return;
  try {
    scanChat();
    scanMembers();
    scanProfiles();
  } catch (e) {
    console.error("[Krizcord] rozet taraması hatası:", e);
  }
}

export const CSS = `
.kc-badges{display:inline-flex;align-items:center;gap:3px;margin-left:5px;vertical-align:middle;line-height:0}
.kc-badge{position:relative;display:inline-flex;width:18px;height:18px;flex:none;cursor:default}
.kc-badge img{width:100%;height:100%;pointer-events:none;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))}
.kc-badges-profile{gap:6px;margin-left:4px}
.kc-badges-profile .kc-badge{width:22px;height:22px}
.kc-badges-row{display:flex;margin:6px 0 2px}
.kc-badges-row .kc-badges{margin-left:0}
.kc-badge[data-tip]:hover::after{content:attr(data-tip);position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);z-index:1000;
  white-space:nowrap;padding:6px 10px;border-radius:8px;font:600 12.5px/1.2 "gg sans","Segoe UI",system-ui,sans-serif;letter-spacing:0;
  color:#f2f3f5;background:#111214;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 8px 16px rgba(0,0,0,.35);pointer-events:none}
.kc-badge[data-tip]:hover::before{content:"";position:absolute;left:50%;bottom:calc(100% + 3px);transform:translateX(-50%);z-index:1000;
  border:5px solid transparent;border-top-color:#111214;border-bottom:0;pointer-events:none}
`;

// --- Başlat / durdur ---------------------------------------------------

export async function start() {
  await load();
  stopDom = discord.onDomChange(scan, 200);
  refreshTimer = setInterval(() => load().then(scan), 10 * 60 * 1000);
  log("başlatıldı. Tanımlı kullanıcı sayısı:", holderCount());
}

export function stop() {
  stopDom?.();
  clearInterval(refreshTimer);
  document.querySelectorAll(".kc-badges,.kc-badges-row").forEach((n) => n.remove());
}

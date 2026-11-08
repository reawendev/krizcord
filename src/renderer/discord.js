// Discord'un iç yapısına erişim için ortak yardımcılar (eklentiler kullanır).
// Discord sık güncellendiği için her şey "en iyi çaba" ile bulunur; bulunamazsa null döner, hata fırlatmaz.

import * as webpack from "./webpack";

const SNOWFLAKE = /^\d{15,25}$/;
const cache = new Map();

function cached(key, finder) {
  if (cache.get(key)) return cache.get(key);
  let v = null;
  try {
    v = finder();
  } catch {
    v = null;
  }
  if (v) cache.set(key, v);
  return v;
}

export const MessageStore = () => cached("message", () => webpack.findByProps("getMessage", "getMessages"));
export const UserStore = () => cached("user", () => webpack.findByProps("getCurrentUser", "getUser"));
export const PresenceStore = () =>
  cached("presence", () =>
    webpack.find((m) => typeof m.getStatus === "function" && typeof m.getActivities === "function" && (typeof m.getState === "function" || typeof m.getClientStatus === "function"))
  );
export const Dispatcher = () =>
  cached("dispatcher", () =>
    webpack.find(
      (m) =>
        typeof m.dispatch === "function" &&
        typeof m.subscribe === "function" &&
        typeof m.unsubscribe === "function" &&
        ("_actionHandlers" in m || typeof m.isDispatching === "function")
    )
  );
export const TypingActions = () => cached("typing", () => webpack.findByProps("startTyping", "stopTyping"));

export const ChannelStore = () => cached("channel", () => webpack.findByProps("getChannel", "getDMFromUserId"));
export const UserProfileStore = () => cached("profile", () => webpack.findByProps("getUserProfile", "getGuildMemberProfile"));
export const Navigation = () => cached("nav", () => webpack.findByProps("transitionTo", "replaceWith", "getHistory"));

/** Discord içinde bir sayfaya (ör. /channels/guild/kanal/mesaj) sayfayı yenilemeden gider. */
export function goTo(path) {
  const nav = Navigation();
  if (nav?.transitionTo) {
    try {
      nav.transitionTo(path);
      return;
    } catch {
      /* yedek yol */
    }
  }
  history.pushState({}, "", path);
  dispatchEvent(new PopStateEvent("popstate", { state: {} }));
}

export function getUser(id) {
  try {
    return UserStore()?.getUser?.(id) ?? null;
  } catch {
    return null;
  }
}

export function guildIdOf(channelId) {
  try {
    return ChannelStore()?.getChannel?.(channelId)?.guild_id ?? null;
  } catch {
    return null;
  }
}

const isAnimated = (hash) => typeof hash === "string" && hash.startsWith("a_");

export function avatarUrl(user, size = 1024) {
  if (!user?.id) return null;
  if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${isAnimated(user.avatar) ? "gif" : "png"}?size=${size}`;
  let index = 0;
  try {
    index = Number((BigInt(user.id) >> 22n) % 6n);
  } catch {
    /* geç */
  }
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export function bannerUrl(userId, size = 2048) {
  let hash = null;
  try {
    hash = UserProfileStore()?.getUserProfile?.(userId)?.banner ?? getUser(userId)?.banner ?? null;
  } catch {
    hash = null;
  }
  return hash ? `https://cdn.discordapp.com/banners/${userId}/${hash}.${isAnimated(hash) ? "gif" : "png"}?size=${size}` : null;
}

/** CDN resim adresini en yüksek kaliteye çevirir (boyut 4096, webp yerine png; animasyonluysa gif). */
export function fullSize(url) {
  try {
    const u = new URL(url, location.href);
    if (!/(^|\.)discordapp\.(com|net)$/.test(u.hostname)) return url;
    const hash = u.pathname.split("/").pop() || "";
    const animated = hash.startsWith("a_");
    u.pathname = u.pathname.replace(/\.(webp|png|jpg|jpeg|gif)$/i, animated ? ".gif" : ".png");
    u.search = "";
    if (!u.pathname.startsWith("/embed/")) u.searchParams.set("size", "4096");
    return u.toString();
  } catch {
    return url;
  }
}

export function myId() {
  try {
    return UserStore()?.getCurrentUser?.()?.id ?? null;
  } catch {
    return null;
  }
}

/** Cihaz bazında durum: { desktop: "online", mobile: "idle", web: "dnd" } */
export function clientStatus(userId) {
  const ps = PresenceStore();
  if (!ps) return null;
  try {
    return ps.getClientStatus?.(userId) ?? ps.getState?.()?.clientStatuses?.[userId] ?? null;
  } catch {
    return null;
  }
}

// --- DOM ---------------------------------------------------------------

export function fiberOf(el) {
  const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
  return key ? el[key] : null;
}

export function idFromFiber(el) {
  let f = fiberOf(el);
  for (let i = 0; f && i < 40; i++, f = f.return) {
    const p = f.memoizedProps;
    if (!p || typeof p !== "object") continue;
    const id = p.user?.id ?? p.message?.author?.id ?? p.author?.id ?? p.userId;
    if (typeof id === "string" && SNOWFLAKE.test(id)) return id;
  }
  return null;
}

/** li#chat-messages-<kanal>-<mesaj> → { channelId, messageId } */
export function parseMessageEl(li) {
  const m = /^chat-messages-(?:[^-]+-)?(\d+)-(\d+)$/.exec(li?.id || "");
  return m ? { channelId: m[1], messageId: m[2] } : null;
}

export function messageOf(li) {
  const ids = parseMessageEl(li);
  if (!ids) return null;
  try {
    return MessageStore()?.getMessage?.(ids.channelId, ids.messageId) ?? null;
  } catch {
    return null;
  }
}

export function authorOfMessage(li) {
  return messageOf(li)?.author?.id ?? idFromFiber(li);
}

/** Ekrandaki bir noktanın altındaki mesaj (Krizcord'un kendi katmanları yok sayılır). */
export function messageAt(x, y) {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el.closest(".kc-circle-root,.kc-overlay,.kc-toast")) continue;
    const li = el.closest('li[id^="chat-messages-"]');
    if (li) return li;
  }
  return null;
}

export const messageElements = () => document.querySelectorAll('li[id^="chat-messages-"]');

export function contentElement(li) {
  return li.querySelector('[id^="message-content-"]') || li.querySelector('[class*="messageContent"]');
}

export function memberRows() {
  return [...document.querySelectorAll('[data-list-item-id^="members-"]')].map((row) => ({
    row,
    id: /(\d{15,25})$/.exec(row.getAttribute("data-list-item-id") || "")?.[1] || idFromFiber(row),
  }));
}

/** DOM değiştikçe (gecikmeli, toplu) çağırır. Durdurmak için dönen fonksiyonu çağır. */
export function onDomChange(cb, delay = 200) {
  let timer = null;
  const run = () => {
    timer = null;
    try {
      cb();
    } catch (e) {
      console.error("[Krizcord] DOM izleyici hatası:", e);
    }
  };
  const obs = new MutationObserver(() => {
    if (!timer) timer = setTimeout(run, delay);
  });
  obs.observe(document.body, { childList: true, subtree: true });
  timer = setTimeout(run, 0);
  return () => {
    obs.disconnect();
    clearTimeout(timer);
  };
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

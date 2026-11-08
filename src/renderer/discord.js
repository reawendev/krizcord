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

export const MessageStore = () =>
  cached("message", () =>
    webpack.find((m) => typeof m.getMessage === "function") ||
    webpack.find((m) => typeof m.getMessages === "function")
  );
export const UserStore = () => cached("user", () => webpack.findByProps("getCurrentUser", "getUser"));
export const PresenceStore = () =>
  cached("presence", () =>
    webpack.find(
      (m) =>
        typeof m.getClientStatus === "function" ||
        (typeof m.getState === "function" &&
          m.getState()?.clientStatuses &&
          typeof m.getState().clientStatuses === "object")
    )
  );
export const Dispatcher = () =>
  cached("dispatcher", () =>
    webpack.find(
      (m) =>
        typeof m.dispatch === "function" &&
        (typeof m.subscribe === "function" ||
          typeof m.unsubscribe === "function" ||
          "_actionHandlers" in m ||
          typeof m.isDispatching === "function")
    )
  );
export const TypingActions = () => cached("typing", () => webpack.findByProps("startTyping", "stopTyping"));

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
  const ids = (li?.id || "").match(/\d{15,25}/g);
  return ids?.length >= 2 ? { channelId: ids.at(-2), messageId: ids.at(-1) } : null;
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

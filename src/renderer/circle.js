// Çember menü: kısayola basınca farenin olduğu yerde açılan radyal hızlı menü.
// Öğeler yay (spring) animasyonuyla merkezden dışarı açılır; kapanırken çember döner ve öğeler merkeze döner.
// Animasyonlar Web Animations API ile; her zaman ekrandaki güncel değerden başlar (kesintiye dayanıklı).

import * as settings from "./settings";
import * as plugins from "./plugins";
import { svg, has } from "./icons";
import { t } from "./i18n";

export const MAX_ITEMS = 8;
const SIZE = 250; // çember çapı
const ITEM = 48; // öğe çapı
const OPEN_STAGGER = 20; // ms
const CLOSE_STAGGER = 45; // ms

export const DEFAULT_SHORTCUT = { ctrl: true, shift: true, alt: false, code: "Space" };
const DEFAULT_ITEMS = ["panel", "reload", "copy-id", "themes-toggle", "badges-refresh", "devtools", "plugins-folder", "updates"];

const actions = new Map();
let recording = false;

// --- Ayarlar -------------------------------------------------------------

function cfg() {
  const s = settings.get();
  s.circle ||= {};
  if (!s.circle.shortcut || typeof s.circle.shortcut.code !== "string") s.circle.shortcut = { ...DEFAULT_SHORTCUT };
  if (!Array.isArray(s.circle.items)) s.circle.items = [...DEFAULT_ITEMS];
  return s.circle;
}

export const getShortcut = () => cfg().shortcut;

export function setShortcut(sc) {
  cfg().shortcut = { ctrl: !!sc.ctrl, shift: !!sc.shift, alt: !!sc.alt, code: sc.code };
  settings.save();
}

export const setRecording = (on) => {
  recording = on;
};

export const selectedIds = () => [...cfg().items];

export function setSelected(id, on) {
  const c = cfg();
  const rest = c.items.filter((x) => x !== id);
  if (on) {
    if (rest.length >= MAX_ITEMS) return false;
    rest.push(id);
  }
  c.items = rest;
  settings.save();
  return true;
}

// --- Eylemler ------------------------------------------------------------

/** Eklentiler de kendi eylemini ekleyebilir: Krizcord.circle.register({ id, label, icon, run }) */
export function register(action) {
  if (!action || !action.id || typeof action.run !== "function") throw new Error("Çember eylemi için id ve run zorunlu");
  actions.set(action.id, { kind: "action", ...action });
}

export const unregister = (id) => actions.delete(id);

export function allActions() {
  const list = [...actions.values()];
  for (const p of plugins.list()) {
    if (p.broken) continue;
    list.push({
      id: "plugin:" + p.name,
      label: p.name,
      kind: "plugin",
      icon: p.icon || null,
      letter: (Array.from(p.name.trim())[0] || "?").toLocaleUpperCase("tr"),
      active: () => !!plugins.list().find((x) => x.name === p.name)?.enabled,
      run: async () => {
        const cur = plugins.list().find((x) => x.name === p.name);
        await plugins.setEnabled(p.name, !cur?.enabled);
        return { toast: `${p.name} ${!cur?.enabled ? t("toast.pluginOn") : t("toast.pluginOff")}` };
      },
    });
  }
  return list;
}

function currentItems() {
  const all = new Map(allActions().map((a) => [a.id, a]));
  return cfg().items.map((id) => all.get(id)).filter(Boolean).slice(0, MAX_ITEMS);
}

// --- Kısayol -------------------------------------------------------------

const MODIFIER_CODES = /^(Control|Shift|Alt|Meta)(Left|Right)$/;

export function codeLabel(code) {
  if (code === "Space") return t("key.space");
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return "Num " + code.slice(6);
  return code;
}

export function formatShortcut(sc) {
  const parts = [];
  if (sc.ctrl) parts.push("Ctrl");
  if (sc.alt) parts.push("Alt");
  if (sc.shift) parts.push("Shift");
  parts.push(codeLabel(sc.code));
  return parts;
}

export const matches = (e, sc) =>
  e.code === sc.code && !!e.ctrlKey === !!sc.ctrl && !!e.shiftKey === !!sc.shift && !!e.altKey === !!sc.alt;

export function shortcutFromEvent(e) {
  if (MODIFIER_CODES.test(e.code)) return null;
  return { ctrl: e.ctrlKey, shift: e.shiftKey, alt: e.altKey, code: e.code };
}

// --- Yay (spring) eğrisi ---------------------------------------------------
// Framer Motion'daki { type: "spring", stiffness: 300, damping: 30 } ile aynı fizik; CSS linear() eğrisine örneklenir.

function springEasing({ stiffness = 300, damping = 30, mass = 1 } = {}) {
  const dt = 1 / 120;
  let x = 0;
  let v = 0;
  const pts = [0];
  for (let i = 0; i < 600; i++) {
    const a = (-stiffness * (x - 1) - damping * v) / mass;
    v += a * dt;
    x += v * dt;
    if (i % 2 === 1) pts.push(x);
    if (Math.abs(x - 1) < 0.0008 && Math.abs(v) < 0.01) break;
  }
  pts[pts.length - 1] = 1;
  const duration = Math.round((pts.length - 1) * 2 * dt * 1000);
  const supported = typeof CSS !== "undefined" && CSS.supports?.("animation-timing-function", "linear(0, 1)");
  return {
    easing: supported ? `linear(${pts.map((p) => +p.toFixed(4)).join(",")})` : "cubic-bezier(.2,.9,.25,1.08)",
    duration,
  };
}

const SPRING = springEasing({ stiffness: 300, damping: 30 });
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// --- Görünüm ---------------------------------------------------------------

export const CSS_TEXT = `
.kc-circle-root{position:fixed;inset:0;z-index:2147483100;font-family:"gg sans","Inter","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;
  --kc-c-fg:#fafafa;--kc-c-bg:#09090b;--kc-c-muted:#27272a;--kc-c-muted-hover:#3f3f46;--kc-c-border:rgba(255,255,255,.1);--kc-c-label:#fafafa;--kc-c-label-bg:rgba(24,24,27,.92)}
:root.theme-light .kc-circle-root{--kc-c-fg:#18181b;--kc-c-bg:#fafafa;--kc-c-muted:#f4f4f5;--kc-c-muted-hover:#e4e4e7;--kc-c-border:rgba(0,0,0,.1);--kc-c-label:#18181b;--kc-c-label-bg:rgba(255,255,255,.95)}
.kc-ring{position:absolute;width:${SIZE}px;height:${SIZE}px;transform:translate(-50%,-50%);pointer-events:none}
.kc-ring-item,.kc-ring-trigger{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto}
.kc-ring-item{width:${ITEM - 2}px;height:${ITEM - 2}px}
.kc-ring-btn{all:unset;box-sizing:border-box;width:100%;height:100%;border-radius:50%;display:grid;place-items:center;cursor:pointer;
  background:var(--kc-c-muted);color:var(--kc-c-fg);box-shadow:0 0 0 1px var(--kc-c-border),0 6px 18px rgba(0,0,0,.28);
  font-size:15px;font-weight:600;line-height:1;transition:transform .1s ease,background .15s ease}
.kc-ring-btn:hover,.kc-ring-btn:focus-visible{transform:scale(1.1);background:var(--kc-c-muted-hover)}
.kc-ring-btn:active{transform:scale(1.02)}
.kc-ring-btn .kc-ic{width:19px;height:19px}
.kc-ring-dot{position:absolute;top:2px;right:2px;width:9px;height:9px;border-radius:50%;background:#71717a;box-shadow:0 0 0 2px var(--kc-c-muted)}
.kc-ring-dot.on{background:#22c55e}
.kc-ring-num{position:absolute;bottom:-1px;right:-1px;min-width:15px;height:15px;padding:0 3px;border-radius:8px;display:grid;place-items:center;
  font:600 9.5px/1 ui-monospace,Consolas,monospace;color:var(--kc-c-fg);background:var(--kc-c-bg);box-shadow:0 0 0 1px var(--kc-c-border);opacity:0;transition:opacity .15s}
.kc-ring:hover .kc-ring-num{opacity:.85}
.kc-ring-label{position:absolute;top:100%;left:50%;transform:translate(-50%,4px);white-space:nowrap;pointer-events:none;
  padding:3px 8px;border-radius:6px;font-size:12px;font-weight:500;color:var(--kc-c-label);background:var(--kc-c-label-bg);
  box-shadow:0 0 0 1px var(--kc-c-border),0 4px 12px rgba(0,0,0,.2);opacity:0;transition:opacity .12s ease,transform .12s ease}
.kc-ring-btn:hover+.kc-ring-label,.kc-ring-btn:focus-visible+.kc-ring-label{opacity:1;transform:translate(-50%,6px)}
.kc-ring-trigger{all:unset;box-sizing:border-box;position:absolute;left:50%;top:50%;width:${ITEM}px;height:${ITEM}px;border-radius:50%;display:grid;place-items:center;cursor:pointer;
  background:var(--kc-c-fg);color:var(--kc-c-bg);box-shadow:0 8px 24px rgba(0,0,0,.35);z-index:2;transition:filter .1s}
.kc-ring-trigger:hover{filter:brightness(1.25)}
:root.theme-light .kc-ring-trigger:hover{filter:brightness(1.6)}
.kc-ring-trigger .kc-ic{width:18px;height:18px}
.kc-ring-hint{position:absolute;left:50%;top:calc(50% + ${ITEM / 2 + 12}px);transform:translateX(-50%);white-space:nowrap;font-size:12px;
  color:var(--kc-c-label);background:var(--kc-c-label-bg);padding:4px 10px;border-radius:6px;box-shadow:0 0 0 1px var(--kc-c-border)}
`;

let root = null;
let ring = null;
let trigger = null;
let nodes = [];
let state = "closed"; // closed | open | closing
let closeTimer = null;
let onToast = null;
const mouse = { x: innerWidth / 2, y: innerHeight / 2 };

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function pointOnCircle(i, n, r) {
  const theta = (2 * Math.PI * i) / n - Math.PI / 2;
  return { x: r * Math.cos(theta), y: r * Math.sin(theta) };
}

function el(tag, cls, ...children) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  for (const c of children) if (c != null) n.append(c);
  return n;
}

function teardown() {
  clearTimeout(closeTimer);
  root?.remove();
  root = ring = trigger = null;
  nodes = [];
  state = "closed";
}

async function runItem(a) {
  close();
  try {
    const res = await a.run();
    if (res?.toast) onToast?.(res.toast);
  } catch (e) {
    console.error("[Krizcord] çember eylemi hata verdi:", e);
  }
}

export function open(x = mouse.x, y = mouse.y) {
  if (state === "open") return;
  teardown();
  const list = currentItems();
  const reduce = reducedMotion();
  const pad = SIZE / 2 + ITEM / 2 + 8;
  const cx = clamp(x, pad, Math.max(pad, innerWidth - pad));
  const cy = clamp(y, pad, Math.max(pad, innerHeight - pad));

  root = el("div", "kc-circle-root");
  root.setAttribute("role", "menu");
  root.setAttribute("aria-label", t("nav.circle"));
  root.addEventListener("mousedown", (e) => {
    if (e.target === root) close();
  });
  root.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    close();
  });

  ring = el("div", "kc-ring");
  ring.style.left = cx + "px";
  ring.style.top = cy + "px";

  nodes = list.map((a, i) => {
    const { x: px, y: py } = pointOnCircle(i, list.length, SIZE / 2);
    const btn = el("button", "kc-ring-btn");
    btn.type = "button";
    btn.setAttribute("role", "menuitem");
    btn.setAttribute("aria-label", a.label);
    if (a.icon && has(a.icon)) btn.append(svg(a.icon, { size: 19, stroke: 1.75 }));
    else btn.append(document.createTextNode(a.letter || (Array.from(a.label)[0] || "?").toLocaleUpperCase("tr")));
    if (a.active) btn.append(el("span", "kc-ring-dot" + (a.active() ? " on" : "")));
    if (i < 9) btn.append(el("span", "kc-ring-num", String(i + 1)));
    btn.addEventListener("click", () => runItem(a));
    const wrap = el("div", "kc-ring-item", btn, el("span", "kc-ring-label", a.label));
    ring.append(wrap);
    const to = `translate(-50%,-50%) translate(${px}px,${py}px) scale(1)`;
    wrap.animate(
      reduce
        ? [{ transform: to, opacity: 0 }, { transform: to, opacity: 1 }]
        : [{ transform: "translate(-50%,-50%) translate(0px,0px) scale(.5)", opacity: 0 }, { transform: to, opacity: 1 }],
      { duration: reduce ? 120 : SPRING.duration, easing: reduce ? "ease" : SPRING.easing, delay: reduce ? 0 : i * OPEN_STAGGER, fill: "both" }
    );
    return { wrap, action: a };
  });

  trigger = el("button", "kc-ring-trigger");
  trigger.type = "button";
  trigger.setAttribute("aria-label", "Kapat");
  trigger.append(svg("x", { size: 18, stroke: 2 }));
  trigger.addEventListener("click", close);
  ring.append(trigger);
  trigger.animate(
    [{ transform: "translate(-50%,-50%) scale(.6)", opacity: 0, filter: "blur(10px)" }, { transform: "translate(-50%,-50%) scale(1)", opacity: 1, filter: "blur(0px)" }],
    { duration: 200, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }
  );

  if (!list.length) ring.append(el("div", "kc-ring-hint", t("circle.empty")));

  root.append(ring);
  document.body.append(root);
  state = "open";
}

export function close() {
  if (state !== "open") return;
  state = "closing";
  const reduce = reducedMotion();
  const n = nodes.length;
  const total = reduce ? 120 : (n + 2) * CLOSE_STAGGER + 120;

  if (!reduce) {
    // Çember döner ve hafif bulanıklaşır (orijinaldeki gibi)
    ring.animate(
      [{ transform: "translate(-50%,-50%) rotate(0deg)", filter: "blur(0px)" }, { transform: "translate(-50%,-50%) rotate(-360deg)", filter: "blur(1px)" }],
      { duration: total, easing: "linear", fill: "forwards" }
    );
    // Tetikleyici titrer ve büyür
    trigger.animate(
      [
        { transform: "translate(-50%,-50%) translateX(0) scale(1)" },
        { transform: "translate(-50%,-50%) translateX(2px) scale(1.12)" },
        { transform: "translate(-50%,-50%) translateX(-2px) scale(1.24)" },
        { transform: "translate(-50%,-50%) translateX(2px) scale(1.3)" },
        { transform: "translate(-50%,-50%) translateX(0) scale(.6)", opacity: 0 },
      ],
      { duration: total, easing: "linear", fill: "forwards" }
    );
  } else {
    trigger.animate([{ opacity: 1 }, { opacity: 0 }], { duration: total, fill: "forwards" });
  }

  nodes.forEach(({ wrap }, i) => {
    // Kesintiye dayanıklı: ekrandaki güncel değerden başla
    const from = getComputedStyle(wrap).transform;
    wrap.getAnimations().forEach((an) => an.cancel());
    wrap.animate(
      reduce
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ transform: from, opacity: 1 }, { transform: "translate(-50%,-50%) translate(0px,0px) scale(.5)", opacity: 0 }],
      { duration: reduce ? 120 : SPRING.duration * 0.7, easing: reduce ? "ease" : SPRING.easing, delay: reduce ? 0 : i * CLOSE_STAGGER, fill: "forwards" }
    );
  });

  closeTimer = setTimeout(teardown, reduce ? total : Math.max(total, (n - 1) * CLOSE_STAGGER + SPRING.duration * 0.7) + 20);
}

export const isOpen = () => state === "open";

export function toggle() {
  if (state === "open") close();
  else open();
}

// --- Kurulum ---------------------------------------------------------------

export function install({ toast }) {
  onToast = toast;
  if (!document.getElementById("krizcord-circle-style")) {
    const style = document.createElement("style");
    style.id = "krizcord-circle-style";
    style.textContent = CSS_TEXT;
    document.head.appendChild(style);
  }
  window.addEventListener(
    "mousemove",
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    },
    { passive: true, capture: true }
  );
  window.addEventListener(
    "keydown",
    (e) => {
      if (recording) return;
      if (matches(e, getShortcut())) {
        e.preventDefault();
        e.stopPropagation();
        toggle();
        return;
      }
      if (state !== "open") return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (/^Digit[1-9]$/.test(e.code) && !e.ctrlKey && !e.altKey) {
        const n = nodes[Number(e.code.slice(5)) - 1];
        if (n) {
          e.preventDefault();
          e.stopPropagation();
          runItem(n.action);
        }
      }
    },
    true
  );
}

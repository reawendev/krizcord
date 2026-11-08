import { t } from "./i18n";
import * as plugins from "./plugins";
import * as themes from "./themes";
import * as badges from "./badges";
import { VERSION, BRAND } from "./brand";

const CSS = `
.kc-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;
  background:rgba(0,0,0,.62);font:14px/1.4 "gg sans","Segoe UI",system-ui,sans-serif}
.kc-hidden{display:none!important}
.kc-modal{width:min(580px,calc(100vw - 40px));height:min(640px,calc(100vh - 60px));display:flex;flex-direction:column;
  border-radius:14px;overflow:hidden;background:#1e1f22;color:#dbdee1;border:1px solid #3a3c42;box-shadow:0 12px 48px rgba(0,0,0,.6)}
.kc-head{display:flex;align-items:center;gap:10px;padding:14px 16px;background:#2b2d31;border-bottom:1px solid #3a3c42}
.kc-logo{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;font-weight:800;color:#fff;
  background:linear-gradient(135deg,#9a82ff,var(--krizcord-accent,#7c5cff) 60%,#5a3fe0)}
.kc-title{font-weight:700;font-size:16px;flex:1;color:#f2f3f5}
.kc-title small{font-weight:500;color:#949ba4;margin-left:6px}
.kc-x{background:none;border:none;color:#949ba4;cursor:pointer;font-size:22px;line-height:1;padding:0 4px}
.kc-x:hover{color:#fff}
.kc-tabs{display:flex;gap:4px;padding:8px 10px;background:#232428}
.kc-tab{flex:1;padding:7px 8px;border:none;border-radius:6px;cursor:pointer;background:transparent;color:#949ba4;font:inherit}
.kc-tab:hover{background:#2e3035;color:#dbdee1}
.kc-tab.on{background:var(--krizcord-accent,#7c5cff);color:#fff}
.kc-body{flex:1;overflow:auto;padding:12px 14px}
.kc-row{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:8px;background:#2b2d31;margin-bottom:8px}
.kc-row b{display:block;color:#f2f3f5}
.kc-row small{color:#949ba4}
.kc-grow{flex:1;min-width:0}
.kc-err{color:#f23f43;font-size:12px;margin-top:4px;word-break:break-word}
.kc-tag{font-size:11px;padding:1px 6px;border-radius:99px;background:#3a3c42;color:#b5bac1;margin-left:6px;font-weight:500}
.kc-btn{padding:7px 12px;border:none;border-radius:6px;cursor:pointer;background:#4e5058;color:#fff;font:inherit;margin:0 6px 8px 0}
.kc-btn:hover{background:#6d6f78}
.kc-btn.primary{background:var(--krizcord-accent,#7c5cff)}
.kc-switch{appearance:none;width:38px;height:22px;border-radius:99px;background:#4e5058;position:relative;cursor:pointer;
  flex:none;transition:background .15s;margin-top:2px}
.kc-switch::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}
.kc-switch:checked{background:var(--krizcord-accent,#7c5cff)}
.kc-switch:checked::after{left:19px}
.kc-note{color:#949ba4;font-size:12px;margin:6px 0 10px}
.kc-mono{font-family:Consolas,monospace;user-select:text;color:#f2f3f5}
.kc-foot{display:flex;gap:14px;justify-content:center;padding:10px;background:#232428;border-top:1px solid #3a3c42;font-size:12px}
.kc-foot a,.kc-body a{color:#9d86ff;text-decoration:none}
.kc-foot a:hover,.kc-body a:hover{text-decoration:underline}
.kc-bicon{width:22px;height:22px;flex:none}
.kc-sidebar-item{cursor:pointer}
${badges.CSS}
`;

let overlay = null;
let tab = "plugins";
let open = false;
let copiedUntil = 0;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
    else if (v === true) node.setAttribute(k, "");
    else if (v !== false && v != null) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function show() {
  if (!overlay) return;
  open = true;
  overlay.classList.remove("kc-hidden");
  render();
}

export function hide() {
  if (!overlay) return;
  open = false;
  overlay.classList.add("kc-hidden");
}

export const toggle = () => (open ? hide() : show());

function switchEl(checked, onChange) {
  const input = el("input", { type: "checkbox", class: "kc-switch" });
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  return input;
}

const link = (href, text) => el("a", { href, target: "_blank", rel: "noopener noreferrer" }, text);

// --- Sekmeler ----------------------------------------------------------

function pluginsTab() {
  const items = plugins.list();
  return el(
    "div",
    {},
    el("div", { class: "kc-note" }, t("plugins.restartHint")),
    el("button", { class: "kc-btn", onclick: () => window.KrizcordNative.openFolder("plugins") }, t("plugins.openFolder")),
    items.length === 0 && el("div", { class: "kc-note" }, t("plugins.empty")),
    items.map((p) =>
      el(
        "div",
        { class: "kc-row" },
        !p.broken && switchEl(p.enabled, async (on) => { await plugins.setEnabled(p.name, on); render(); }),
        el(
          "div",
          { class: "kc-grow" },
          el("b", {}, p.name, el("span", { class: "kc-tag" }, p.source === "builtin" ? t("plugins.builtin") : t("plugins.user"))),
          p.description && el("small", {}, p.description),
          p.authors.length > 0 && el("div", {}, el("small", {}, p.authors.join(", "))),
          p.error && el("div", { class: "kc-err" }, `${t("plugins.error")}: ${p.error}`)
        )
      )
    )
  );
}

function themesTab() {
  const items = themes.list();
  return el(
    "div",
    {},
    el("button", { class: "kc-btn", onclick: () => window.KrizcordNative.openFolder("themes") }, t("themes.openFolder")),
    el("button", { class: "kc-btn", onclick: async () => { await themes.reload(); render(); } }, t("themes.reload")),
    items.length === 0 && el("div", { class: "kc-note" }, t("themes.empty")),
    items.map((th) =>
      el(
        "div",
        { class: "kc-row" },
        switchEl(th.enabled, (on) => { themes.setEnabled(th.file, on); render(); }),
        el("div", { class: "kc-grow" }, el("b", {}, th.file))
      )
    )
  );
}

function badgesTab() {
  const id = badges.myId();
  const mine = badges.myBadges();
  const copied = Date.now() < copiedUntil;
  return el(
    "div",
    {},
    el("div", { class: "kc-note" }, t("badges.about")),
    el(
      "div",
      { class: "kc-row" },
      el("div", { class: "kc-grow" },
        el("small", {}, t("badges.yourId")),
        el("div", { class: "kc-mono" }, id || t("badges.unknownId"))),
      id && el("button", {
        class: "kc-btn primary",
        onclick: async () => {
          try { await navigator.clipboard.writeText(id); } catch { /* geç */ }
          copiedUntil = Date.now() + 1800;
          render();
          setTimeout(render, 1900);
        },
      }, copied ? t("badges.copied") : t("badges.copy"))
    ),
    el(
      "div",
      { class: "kc-row" },
      mine.length > 0 && el("img", { class: "kc-bicon", src: badges.iconUrl(mine[0].color), alt: "" }),
      el("div", { class: "kc-grow" },
        mine.length > 0
          ? el("b", {}, `${t("badges.has")}: ${mine.map((b) => b.name).join(", ")}`)
          : el("small", {}, t("badges.none")))
    ),
    el(
      "div",
      { class: "kc-note" },
      `${t("badges.list")}: ${badges.holderCount()} ${t("badges.users")}`
    ),
    el("button", { class: "kc-btn", onclick: async () => { await badges.refresh(); render(); } }, t("badges.refresh")),
    el("div", { class: "kc-note" }, t("badges.types")),
    badges.definitions().map((d) =>
      el("div", { class: "kc-row" },
        el("img", { class: "kc-bicon", src: d.iconUrl, alt: "" }),
        el("div", { class: "kc-grow" }, el("b", {}, d.name)))
    )
  );
}

function aboutTab() {
  return el(
    "div",
    {},
    el("div", { class: "kc-row" },
      el("div", { class: "kc-grow" },
        el("b", {}, t("about.title")),
        el("small", {}, t("about.desc")))),
    el("div", { class: "kc-note" }, `${t("about.version")}: ${VERSION}`),
    el("div", { class: "kc-note" }, t("about.shortcut")),
    el("div", { class: "kc-note" }, "GitHub: ", link(BRAND.links.github, "github.com/" + BRAND.repo)),
    el("div", { class: "kc-note" }, "Kick: ", link(BRAND.links.kick, "kick.com/MaliKriz")),
    el("button", { class: "kc-btn", onclick: () => window.KrizcordNative.openFolder("data") }, t("about.dataFolder")),
    el("div", { class: "kc-note" }, t("about.warning"))
  );
}

function render() {
  if (!overlay) return;
  const tabs = [
    ["plugins", t("tab.plugins")],
    ["themes", t("tab.themes")],
    ["badges", t("tab.badges")],
    ["about", t("tab.about")],
  ];
  const body = tab === "plugins" ? pluginsTab() : tab === "themes" ? themesTab() : tab === "badges" ? badgesTab() : aboutTab();
  const modal = el(
    "div",
    { class: "kc-modal", role: "dialog", "aria-label": BRAND.name },
    el("div", { class: "kc-head" },
      el("span", { class: "kc-logo" }, "K"),
      el("span", { class: "kc-title" }, BRAND.name, el("small", {}, "v" + VERSION)),
      el("button", { class: "kc-x", title: t("panel.close"), onclick: hide }, "×")),
    el("div", { class: "kc-tabs" },
      tabs.map(([id, label]) =>
        el("button", { class: "kc-tab" + (tab === id ? " on" : ""), onclick: () => { tab = id; render(); } }, label))),
    el("div", { class: "kc-body" }, body),
    el("div", { class: "kc-foot" },
      link(BRAND.links.github, "GitHub · " + BRAND.owner),
      link(BRAND.links.kick, "Kick · MaliKriz"))
  );
  overlay.replaceChildren(modal);
}

// --- Kullanıcı Ayarları kenar çubuğuna "Krizcord" girişi ---------------------

let sidebarLogged = false;
let sidebarTimer = null;

function injectSidebarEntry() {
  sidebarTimer = null;
  for (const list of document.querySelectorAll('[role="tablist"]')) {
    if (list.querySelector(".kc-sidebar-item")) return;
    const tabsEls = [...list.querySelectorAll('[role="tab"]')];
    if (tabsEls.length < 6) continue; // kullanıcı ayarları değil
    const template = tabsEls.find((n) => n.getAttribute("aria-selected") !== "true") || tabsEls[0];
    const item = template.cloneNode(true);
    for (const attr of ["id", "data-list-item-id", "aria-controls", "aria-label", "href"]) item.removeAttribute(attr);
    item.setAttribute("aria-selected", "false");
    item.classList.add("kc-sidebar-item");
    item.textContent = t("sidebar.entry");
    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      show();
    });
    tabsEls[tabsEls.length - 1].before(item);
    if (!sidebarLogged) {
      sidebarLogged = true;
      window.KrizcordNative.log?.("ayar menüsüne giriş eklendi, sekme sayısı:", tabsEls.length);
    }
    return;
  }
}

function scheduleSidebar() {
  if (sidebarTimer) return;
  sidebarTimer = setTimeout(injectSidebarEntry, 300);
}

// --- Başlat ------------------------------------------------------------

export function mount() {
  if (document.getElementById("krizcord-ui-style")) return;
  document.head.appendChild(el("style", { id: "krizcord-ui-style" }, CSS));

  overlay = el("div", { class: "kc-overlay kc-hidden" });
  overlay.addEventListener("mousedown", (e) => {
    if (e.target === overlay) hide();
  });
  document.body.appendChild(overlay);

  window.addEventListener(
    "keydown",
    (e) => {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyK") {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopPropagation();
        hide();
      }
    },
    true
  );

  new MutationObserver(scheduleSidebar).observe(document.body, { childList: true, subtree: true });
}

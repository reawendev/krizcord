// Profil Görüntüleyici: birinin avatarını ve bannerini tam boyutta görüntüler; tarayıcıda açar,
// bağlantısını kopyalar veya İndirilenler\Krizcord klasörüne indirir.
// Açmanın yolları: Shift + avatara/bannere tık, ya da profil kartının köşesindeki düğmeler.

import { BRAND } from "../renderer/brand";
import { svg } from "../renderer/icons";

const CSS = `
.kc-pv{position:fixed;inset:0;z-index:2147483050;display:flex;align-items:center;justify-content:center;padding:32px;
  font-family:"gg sans","Inter","Segoe UI Variable Text","Segoe UI",system-ui,sans-serif;color:#fafafa;
  background:rgba(0,0,0,.78);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:kc-pv-in .18s ease-out}
.kc-pv *{box-sizing:border-box}
@keyframes kc-pv-in{from{opacity:0}to{opacity:1}}
.kc-pv-box{display:flex;flex-direction:column;gap:14px;max-width:min(920px,100%);max-height:100%;animation:kc-pv-pop .22s cubic-bezier(.2,.8,.2,1)}
@keyframes kc-pv-pop{from{transform:scale(.96);opacity:0}to{transform:none;opacity:1}}
.kc-pv-head{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:12px;background:#111113;border:1px solid rgba(255,255,255,.08)}
.kc-pv-head img{width:36px;height:36px;border-radius:50%;flex:none}
.kc-pv-name{flex:1;min-width:0}
.kc-pv-name b{display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kc-pv-name small{display:block;font-size:12px;color:#a1a1aa;font-family:ui-monospace,Consolas,monospace;user-select:text}
.kc-pv-seg{display:inline-flex;padding:3px;gap:2px;border-radius:8px;background:rgba(255,255,255,.06)}
.kc-pv-seg button{all:unset;padding:5px 11px;border-radius:6px;font-size:12.5px;font-weight:500;color:#a1a1aa;cursor:pointer}
.kc-pv-seg button.on{background:#27272a;color:#fafafa}
.kc-pv-seg button:disabled{opacity:.35;cursor:not-allowed}
.kc-pv-x{all:unset;display:grid;place-items:center;width:32px;height:32px;border-radius:8px;color:#a1a1aa;cursor:pointer}
.kc-pv-x:hover{background:rgba(255,255,255,.08);color:#fff}
.kc-pv-stage{display:flex;align-items:center;justify-content:center;min-height:200px;max-height:calc(100vh - 220px)}
.kc-pv-stage img{display:block;max-width:100%;max-height:calc(100vh - 220px);object-fit:contain;border-radius:14px;
  box-shadow:0 20px 60px rgba(0,0,0,.6);background:repeating-conic-gradient(#1f1f23 0 25%,#18181b 0 50%) 0 0/16px 16px}
.kc-pv-stage.avatar img{width:min(512px,70vh);height:min(512px,70vh);object-fit:cover;border-radius:50%}
.kc-pv-empty{color:#a1a1aa;font-size:13px;padding:60px 0}
.kc-pv-actions{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}
.kc-pv-btn{all:unset;display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 14px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;
  background:#18181b;border:1px solid rgba(255,255,255,.1);color:#fafafa;transition:background .15s}
.kc-pv-btn:hover{background:#27272a}
.kc-pv-btn.primary{background:var(--krizcord-accent,#7c5cff);border-color:transparent}
.kc-pv-btn.primary:hover{filter:brightness(1.1)}
.kc-pv-hint{text-align:center;font-size:11.5px;color:#71717a}
.kc-pv-card{position:absolute;top:10px;left:10px;z-index:20;display:flex;gap:6px;opacity:0;transition:opacity .15s}
.kc-pv-host:hover>.kc-pv-card,.kc-pv-card:focus-within{opacity:1}
.kc-pv-card button{all:unset;display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border-radius:7px;cursor:pointer;font:500 12px "gg sans","Segoe UI",sans-serif;
  color:#fff;background:rgba(0,0,0,.55);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);box-shadow:0 0 0 1px rgba(255,255,255,.12)}
.kc-pv-card button:hover{background:rgba(0,0,0,.75)}
`;

const ID = String.raw`(\d{15,25})`;
const AVATAR_RE = new RegExp(`/(?:avatars|users)/${ID}/`);
const BANNER_RE = new RegExp(`/banners/${ID}/`);

function idFromAvatarSrc(src) {
  return AVATAR_RE.exec(src || "")?.[1] || null;
}

function bannerSrcOf(el) {
  for (let n = el, i = 0; n && i < 5; n = n.parentElement, i++) {
    if (n.tagName === "IMG" && BANNER_RE.test(n.src)) return n.src;
    const bg = n instanceof Element ? getComputedStyle(n).backgroundImage : "";
    const m = /url\("?([^")]+\/banners\/[^")]+)"?\)/.exec(bg || "");
    if (m) return m[1];
  }
  return null;
}

export default {
  name: "Profil Görüntüleyici",
  description: "Shift + avatara/bannere tıklayınca tam boyutta açar: tarayıcıda aç, bağlantıyı kopyala, indir.",
  icon: "image",
  authors: [BRAND.owner],
  enabledByDefault: false,
  options: {
    cardButtons: { type: "boolean", label: "Profil kartında düğmeleri göster", default: true },
  },

  start(ctx) {
    const d = ctx.discord;
    ctx.css(CSS);
    let viewer = null;

    const close = () => {
      viewer?.remove();
      viewer = null;
    };

    const open = ({ userId, avatarSrc, bannerSrc, tab = "avatar" }) => {
      close();
      const user = d.getUser(userId);
      const name = user?.globalName || user?.global_name || user?.username || "Kullanıcı";
      const baseAvatar = d.avatarUrl(user, 4096);
      const sources = {
        avatar: avatarSrc && !avatarSrc.includes("/guilds/") ? d.fullSize(avatarSrc) : baseAvatar && d.fullSize(baseAvatar),
        server: avatarSrc && avatarSrc.includes("/guilds/") ? d.fullSize(avatarSrc) : null,
        banner: bannerSrc ? d.fullSize(bannerSrc) : d.bannerUrl(userId, 4096),
      };
      if (!sources.avatar && !sources.server && !sources.banner) return ctx.toast("Bu kullanıcı için resim bulunamadı");
      if (!sources[tab]) tab = sources.avatar ? "avatar" : sources.server ? "server" : "banner";

      viewer = document.createElement("div");
      viewer.className = "kc-pv";
      viewer.setAttribute("role", "dialog");
      viewer.setAttribute("aria-label", `${name} profil resimleri`);
      viewer.addEventListener("mousedown", (e) => {
        if (e.target === viewer) close();
      });
      for (const type of ["keydown", "keyup", "keypress"]) viewer.addEventListener(type, (e) => e.stopPropagation());

      const box = document.createElement("div");
      box.className = "kc-pv-box";
      const head = document.createElement("div");
      head.className = "kc-pv-head";
      const mini = document.createElement("img");
      mini.src = d.avatarUrl(user, 64) || sources.avatar || "";
      mini.alt = "";
      const nameBox = document.createElement("div");
      nameBox.className = "kc-pv-name";
      const b = document.createElement("b");
      b.textContent = name;
      const small = document.createElement("small");
      small.textContent = `${user?.username ? "@" + user.username + " · " : ""}${userId}`;
      nameBox.append(b, small);

      const seg = document.createElement("div");
      seg.className = "kc-pv-seg";
      const stage = document.createElement("div");
      const actions = document.createElement("div");
      actions.className = "kc-pv-actions";

      const tabs = [
        ["avatar", "Avatar"],
        ["server", "Sunucu avatarı"],
        ["banner", "Banner"],
      ].filter(([k]) => k !== "server" || sources.server);
      const buttons = tabs.map(([k, label]) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.disabled = !sources[k];
        btn.addEventListener("click", () => show(k));
        seg.append(btn);
        return [k, btn];
      });

      const xBtn = document.createElement("button");
      xBtn.className = "kc-pv-x";
      xBtn.type = "button";
      xBtn.setAttribute("aria-label", "Kapat");
      xBtn.append(svg("x", { size: 18 }));
      xBtn.addEventListener("click", close);
      head.append(mini, nameBox, seg, xBtn);

      const action = (icon, label, fn, primary) => {
        const btn = document.createElement(fn.href ? "a" : "button");
        btn.className = "kc-pv-btn" + (primary ? " primary" : "");
        if (fn.href) Object.assign(btn, { href: fn.href, target: "_blank", rel: "noopener noreferrer" });
        else {
          btn.type = "button";
          btn.addEventListener("click", fn);
        }
        btn.append(svg(icon, { size: 15 }), document.createTextNode(label));
        return btn;
      };

      function show(k) {
        tab = k;
        for (const [key, btn] of buttons) btn.classList.toggle("on", key === k);
        const url = sources[k];
        stage.className = "kc-pv-stage" + (k === "banner" ? "" : " avatar");
        stage.replaceChildren();
        actions.replaceChildren();
        if (!url) {
          const empty = document.createElement("div");
          empty.className = "kc-pv-empty";
          empty.textContent = "Bu kullanıcının banneri yok";
          stage.append(empty);
          return;
        }
        const img = document.createElement("img");
        img.src = url;
        img.alt = `${name} ${k === "banner" ? "banneri" : "avatarı"}`;
        stage.append(img);
        const ext = /\.gif(\?|$)/.test(url) ? "gif" : "png";
        const fileName = `${user?.username || userId}-${k === "banner" ? "banner" : k === "server" ? "sunucu-avatari" : "avatar"}.${ext}`;
        actions.append(
          action("externalLink", "Tarayıcıda aç", { href: url }),
          action("copy", "Bağlantıyı kopyala", async () => {
            if (await d.copyText(url)) ctx.toast("Bağlantı kopyalandı");
          }),
          action(
            "download",
            "İndir",
            async () => {
              try {
                await window.KrizcordNative.download(url, fileName);
                ctx.toast("İndirildi: İndirilenler\\Krizcord");
              } catch (e) {
                ctx.toast("İndirilemedi: " + (e?.message || e));
              }
            },
            true
          )
        );
      }

      const hint = document.createElement("div");
      hint.className = "kc-pv-hint";
      hint.textContent = "Esc ile kapat";
      box.append(head, stage, actions, hint);
      viewer.append(box);
      document.body.append(viewer);
      show(tab);
    };

    // Shift + tık: avatar veya banner
    ctx.on(
      document,
      "click",
      (e) => {
        if (!e.shiftKey || e.ctrlKey || e.altKey) return;
        const t = e.target instanceof Element ? e.target : null;
        if (!t || t.closest(".kc-pv,.kc-overlay,.kc-circle-root")) return;
        const img = t.closest("img");
        const avatarId = img && idFromAvatarSrc(img.getAttribute("src"));
        const banner = !avatarId && bannerSrcOf(t);
        if (!avatarId && !banner) return;
        e.preventDefault();
        e.stopPropagation();
        if (avatarId) open({ userId: avatarId, avatarSrc: img.src, tab: "avatar" });
        else open({ userId: BANNER_RE.exec(banner)[1], bannerSrc: banner, tab: "banner" });
      },
      true
    );

    ctx.on(
      window,
      "keydown",
      (e) => {
        if (viewer && e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          close();
        }
      },
      true
    );

    // Profil kartına küçük düğmeler (kartın üstüne gelince görünür)
    const ROOTS = '[class*="userPopout"],[class*="userProfileOuter"],[class*="userProfileModal"],[class*="user-profile-popout"],[class*="biteSize"],[class*="fullSize"]';
    ctx.onDom(() => {
      if (!ctx.option("cardButtons")) {
        document.querySelectorAll(".kc-pv-card").forEach((n) => n.remove());
        return;
      }
      const roots = [...document.querySelectorAll(ROOTS)].filter((r) => !r.closest(".kc-overlay") && r.querySelector('img[src*="/avatars/"]'));
      for (const root of roots.filter((r) => !roots.some((o) => o !== r && o.contains(r)))) {
        if (root.querySelector(":scope > .kc-pv-card")) continue;
        const avatarImg = root.querySelector('img[src*="/avatars/"]');
        const userId = idFromAvatarSrc(avatarImg?.getAttribute("src"));
        if (!userId) continue;
        if (getComputedStyle(root).position === "static") root.style.position = "relative";
        root.classList.add("kc-pv-host");
        const bar = document.createElement("div");
        bar.className = "kc-pv-card";
        const mk = (icon, label, tab) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.append(svg(icon, { size: 13, stroke: 2 }), document.createTextNode(label));
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const bannerEl = root.querySelector('img[src*="/banners/"],[style*="/banners/"]');
            open({ userId, avatarSrc: avatarImg.src, bannerSrc: bannerEl ? bannerSrcOf(bannerEl) : null, tab });
          });
          return btn;
        };
        bar.append(mk("userRound", "Avatar", "avatar"), mk("image", "Banner", "banner"));
        root.append(bar);
      }
    }, 250);

    ctx.onCleanup(() => {
      close();
      document.querySelectorAll(".kc-pv-card").forEach((n) => n.remove());
      document.querySelectorAll(".kc-pv-host").forEach((n) => n.classList.remove("kc-pv-host"));
    });
  },
};

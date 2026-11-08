// Mesaj Arşivi: önemli mesajları kişisel arşive kaydet (WhatsApp'taki yıldızlama gibi), etiketle, not ekle, ara.
// Kaydetme: mesajın üstüne gelip Ctrl+Shift+S, ya da çember menüdeki "Mesajı arşivle".
// Arşiv %APPDATA%\krizcord\archive.json dosyasında kalıcı olarak tutulur; panelde "Arşiv" sayfası açılır.

import { BRAND } from "../renderer/brand";
import { svg } from "../renderer/icons";

const CSS = `
.kc-star{display:inline-flex;margin-left:6px;vertical-align:-2px;color:#facc15;cursor:default}
.kc-star .kc-ic{width:14px;height:14px;fill:currentColor}
.kc-ar-tools{display:flex;flex-direction:column;gap:12px;padding:16px 20px}
.kc-ar-toprow{display:flex;gap:8px;align-items:center}
.kc-ar-toprow .kc-input{flex:1;width:auto;height:34px}
.kc-ar-tags{display:flex;flex-wrap:wrap;gap:6px}
.kc-chip{all:unset;display:inline-flex;align-items:center;gap:5px;height:24px;padding:0 9px;border-radius:999px;font-size:12px;font-weight:500;cursor:pointer;
  color:var(--kc-muted-fg);border:1px solid var(--kc-border);background:transparent;transition:background .15s,color .15s}
.kc-chip:hover{background:var(--kc-hover);color:var(--kc-fg)}
.kc-chip.on{background:color-mix(in srgb,var(--kc-primary) 16%,transparent);border-color:color-mix(in srgb,var(--kc-primary) 45%,transparent);color:var(--kc-fg)}
.kc-chip .kc-ic{width:12px;height:12px}
.kc-chip small{opacity:.6}
.kc-ar-item{padding:16px 20px;border-bottom:1px solid var(--kc-border)}
.kc-ar-item:last-child{border-bottom:none}
.kc-ar-head{display:flex;align-items:center;gap:10px}
.kc-ar-head img{width:28px;height:28px;border-radius:50%;flex:none}
.kc-ar-who{flex:1;min-width:0;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}
.kc-ar-who b{font-size:13.5px;font-weight:600;color:var(--kc-fg)}
.kc-ar-who span{font-size:12px;color:var(--kc-muted-fg)}
.kc-ar-acts{display:flex;gap:2px;flex:none}
.kc-ar-content{margin:8px 0 0 38px;font-size:13.5px;line-height:1.5;color:var(--kc-fg);white-space:pre-wrap;word-break:break-word;user-select:text}
.kc-ar-content.kc-clamp{display:-webkit-box;-webkit-line-clamp:6;-webkit-box-orient:vertical;overflow:hidden}
.kc-ar-more{all:unset;margin:4px 0 0 38px;font-size:12px;color:var(--kc-primary);cursor:pointer}
.kc-ar-files{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0 38px}
.kc-ar-files img{max-width:180px;max-height:120px;border-radius:8px;border:1px solid var(--kc-border);object-fit:cover;cursor:zoom-in}
.kc-ar-files a{font-size:12px;color:var(--kc-primary);text-decoration:none}
.kc-ar-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:10px 0 0 38px}
.kc-ar-meta input{all:unset;height:24px;padding:0 9px;border-radius:999px;font-size:12px;color:var(--kc-fg);border:1px dashed var(--kc-border);min-width:90px}
.kc-ar-meta input:focus{border-style:solid;border-color:color-mix(in srgb,var(--kc-primary) 60%,transparent)}
.kc-ar-note{all:unset;display:block;box-sizing:border-box;width:calc(100% - 38px);margin:8px 0 0 38px;padding:7px 10px;border-radius:8px;font-size:12.5px;
  color:var(--kc-fg);background:var(--kc-soft2);border:1px solid transparent}
.kc-ar-note:focus{border-color:color-mix(in srgb,var(--kc-primary) 50%,transparent)}
.kc-ar-note::placeholder{color:var(--kc-muted-fg)}
`;

const IMG_EXT = /\.(png|jpe?g|gif|webp|avif)(\?|$)/i;
const MAX_TAGS = 10;

export default {
  name: "Mesaj Arşivi",
  description: "Önemli mesajları kişisel arşivine kaydet, etiketle ve ara. Mesajın üstünde Ctrl+Shift+S.",
  icon: "star",
  authors: [BRAND.owner],
  enabledByDefault: true,
  options: {
    stars: { type: "boolean", label: "Arşivdeki mesajlarda yıldız göster", default: true },
  },

  async start(ctx) {
    const d = ctx.discord;
    const K = window.Krizcord;
    ctx.css(CSS);

    let items = [];
    try {
      items = (await window.KrizcordNative.archiveGet()).filter((x) => x && x.key);
    } catch (e) {
      ctx.log("arşiv okunamadı:", e);
    }
    const keys = () => new Set(items.map((x) => x.key));
    let saveTimer = null;
    const save = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => window.KrizcordNative.archiveSet(items).catch((e) => ctx.toast("Arşiv kaydedilemedi: " + e.message)), 300);
    };

    // --- Kaydet / çıkar ---------------------------------------------------

    const entryFrom = (li) => {
      const ids = d.parseMessageEl(li);
      if (!ids) return null;
      const msg = d.messageOf(li);
      const author = msg?.author || {};
      const channel = (() => {
        try {
          return d.ChannelStore()?.getChannel?.(ids.channelId) || null;
        } catch {
          return null;
        }
      })();
      const files = (msg?.attachments || []).slice(0, 10).map((a) => ({
        url: a.url || a.proxy_url,
        name: a.filename || "dosya",
        image: /^image\//.test(a.content_type || "") || IMG_EXT.test(a.filename || a.url || ""),
      }));
      return {
        key: `${ids.channelId}:${ids.messageId}`,
        messageId: ids.messageId,
        channelId: ids.channelId,
        guildId: channel?.guild_id || d.guildIdOf(ids.channelId),
        channelName: channel?.name || null,
        authorId: author.id || d.authorOfMessage(li),
        authorName: author.globalName || author.global_name || author.username || li.querySelector('h3 [class*="username"]')?.textContent || "Bilinmeyen",
        avatar: author.id ? d.avatarUrl(author, 64) : null,
        content: (msg?.content ?? d.contentElement(li)?.innerText ?? "").slice(0, 4000),
        files,
        createdAt: msg?.timestamp ? new Date(msg.timestamp).toISOString() : null,
        savedAt: new Date().toISOString(),
        tags: [],
        note: "",
      };
    };

    const toggle = (li) => {
      if (!li) return ctx.toast("Arşivlemek için bir mesajın üstüne gel");
      const ids = d.parseMessageEl(li);
      if (!ids) return;
      const key = `${ids.channelId}:${ids.messageId}`;
      const i = items.findIndex((x) => x.key === key);
      if (i >= 0) {
        items.splice(i, 1);
        ctx.toast("Arşivden çıkarıldı");
      } else {
        const entry = entryFrom(li);
        if (!entry) return;
        items.unshift(entry);
        ctx.toast("Arşive eklendi ⭐");
      }
      save();
      markers();
      K.ui.refresh?.();
    };

    // Üzerindeki mesajı takip et + Ctrl+Shift+S
    let hovered = null;
    ctx.on(document, "mouseover", (e) => {
      const li = e.target instanceof Element ? e.target.closest('li[id^="chat-messages-"]') : null;
      if (li) hovered = li;
    }, true);
    ctx.on(window, "keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && !e.altKey && e.code === "KeyS") {
        e.preventDefault();
        e.stopPropagation();
        toggle(hovered && document.contains(hovered) ? hovered : null);
      }
    }, true);

    // Çember menü eylemi
    K.circle.register({
      id: "archive-message",
      label: "Mesajı arşivle",
      icon: "star",
      run: () => {
        const p = K.circle.openPoint();
        toggle(p ? d.messageAt(p.x, p.y) : null);
      },
    });
    ctx.onCleanup(() => K.circle.unregister("archive-message"));

    // Arşivdeki mesajlarda yıldız
    const markers = () => {
      const set = ctx.option("stars") ? keys() : new Set();
      for (const li of d.messageElements()) {
        const ids = d.parseMessageEl(li);
        const on = ids && set.has(`${ids.channelId}:${ids.messageId}`);
        const content = d.contentElement(li);
        const star = li.querySelector(".kc-star");
        if (on && content && !star) {
          const s = document.createElement("span");
          s.className = "kc-star";
          s.title = "Arşivde";
          s.append(svg("star", { size: 14 }));
          content.append(s);
        } else if (!on && star) star.remove();
      }
    };
    ctx.onDom(markers, 200);
    ctx.onCleanup(() => document.querySelectorAll(".kc-star").forEach((n) => n.remove()));

    // --- Panel sayfası ----------------------------------------------------

    let query = "";
    let activeTag = null;
    const lower = (s) => String(s || "").toLocaleLowerCase("tr");
    const fmt = (iso) => (iso ? new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

    const page = (c) => {
      const { el } = c;
      const listCard = el("section", { class: "kc-card" });
      const tagsBox = el("div", { class: "kc-ar-tags" });

      const iconBtn = (icon, label, fn) =>
        el("button", { type: "button", class: "kc-iconbtn", title: label, "aria-label": label, onclick: fn }, svg(icon, { size: 16 }));

      const itemEl = (it) => {
        const where = it.guildId ? (it.channelName ? `#${it.channelName}` : "Sunucu") : "Özel mesaj";
        const content = el("div", { class: "kc-ar-content" + (it.content.length > 400 ? " kc-clamp" : "") }, it.content || "(metin yok)");
        const more =
          it.content.length > 400 &&
          el("button", { type: "button", class: "kc-ar-more", onclick: (e) => { content.classList.remove("kc-clamp"); e.currentTarget.remove(); } }, "Devamını göster");
        const files =
          it.files?.length > 0 &&
          el("div", { class: "kc-ar-files" },
            it.files.map((f) =>
              f.image
                ? el("a", { href: f.url, target: "_blank", rel: "noopener noreferrer" }, el("img", { src: f.url, alt: f.name, loading: "lazy" }))
                : el("a", { href: f.url, target: "_blank", rel: "noopener noreferrer" }, "📎 " + f.name)));

        const tagInput = el("input", { type: "text", placeholder: "+ etiket", maxlength: "24", "aria-label": "Etiket ekle" });
        tagInput.addEventListener("keydown", (e) => {
          if (e.key !== "Enter") return;
          const tag = lower(tagInput.value.trim()).replace(/\s+/g, "-");
          if (!tag || it.tags.includes(tag) || it.tags.length >= MAX_TAGS) return;
          it.tags.push(tag);
          save();
          renderAll();
        });
        const note = el("input", { type: "text", class: "kc-ar-note", placeholder: "Not ekle...", maxlength: "300", "aria-label": "Not" });
        note.value = it.note || "";
        note.addEventListener("change", () => {
          it.note = note.value.trim();
          save();
        });

        return el("article", { class: "kc-ar-item" },
          el("div", { class: "kc-ar-head" },
            el("img", { src: it.avatar || d.avatarUrl({ id: it.authorId }, 64) || "", alt: "" }),
            el("div", { class: "kc-ar-who" }, el("b", {}, it.authorName), el("span", {}, `${where} · ${fmt(it.createdAt || it.savedAt)}`)),
            el("div", { class: "kc-ar-acts" },
              iconBtn("arrowUpRight", "Mesaja git", () => {
                K.ui.hide();
                d.goTo(`/channels/${it.guildId || "@me"}/${it.channelId}/${it.messageId}`);
              }),
              iconBtn("copy", "Metni kopyala", async () => {
                if (await d.copyText(it.content)) ctx.toast("Kopyalandı");
              }),
              iconBtn("trash", "Arşivden çıkar", () => {
                items = items.filter((x) => x.key !== it.key);
                save();
                markers();
                renderAll();
              }))),
          content,
          more,
          files,
          el("div", { class: "kc-ar-meta" },
            it.tags.map((tag) =>
              el("button", { type: "button", class: "kc-chip", title: "Etiketi kaldır", onclick: () => { it.tags = it.tags.filter((x) => x !== tag); save(); renderAll(); } },
                svg("tag", { size: 12 }), tag, svg("x", { size: 12 }))),
            it.tags.length < MAX_TAGS && tagInput),
          note);
      };

      const renderTags = () => {
        const counts = new Map();
        for (const it of items) for (const tag of it.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
        if (activeTag && !counts.has(activeTag)) activeTag = null;
        tagsBox.replaceChildren(
          el("button", { type: "button", class: "kc-chip" + (activeTag ? "" : " on"), onclick: () => { activeTag = null; renderAll(); } }, "Tümü", el("small", {}, String(items.length))),
          ...[...counts].sort((a, b) => b[1] - a[1]).map(([tag, n]) =>
            el("button", { type: "button", class: "kc-chip" + (activeTag === tag ? " on" : ""), onclick: () => { activeTag = activeTag === tag ? null : tag; renderAll(); } },
              svg("tag", { size: 12 }), tag, el("small", {}, String(n))))
        );
      };

      const renderList = () => {
        const q = lower(query.trim());
        const shown = items.filter(
          (it) =>
            (!activeTag || it.tags.includes(activeTag)) &&
            (!q || lower([it.content, it.authorName, it.channelName, it.note, ...it.tags].join(" ")).includes(q))
        );
        listCard.replaceChildren(
          ...(shown.length
            ? shown.map(itemEl)
            : [c.emptyState(items.length ? "Aramayla eşleşen mesaj yok" : "Arşiv boş. Bir mesajın üstüne gelip Ctrl+Shift+S'ye bas.", "star")])
        );
      };

      const renderAll = () => {
        renderTags();
        renderList();
      };

      const search = el("input", { type: "text", placeholder: "Mesaj, kişi, kanal, etiket veya not ara...", "aria-label": "Arşivde ara", spellcheck: "false" });
      search.value = query;
      search.addEventListener("input", () => {
        query = search.value;
        renderList();
      });

      renderAll();
      return [
        c.pageHead("Arşiv", "Yıldızladığın mesajlar. Mesajın üstüne gelip Ctrl+Shift+S'ye bas ya da çember menüden \"Mesajı arşivle\"yi seç."),
        el("section", { class: "kc-card" },
          el("div", { class: "kc-ar-tools" },
            el("div", { class: "kc-ar-toprow" },
              el("label", { class: "kc-input" }, svg("search", { size: 14 }), search),
              el("button", {
                type: "button",
                class: "kc-btn",
                onclick: async () => {
                  try {
                    const stamp = new Date().toISOString().slice(0, 10);
                    await window.KrizcordNative.saveText(`krizcord-arsiv-${stamp}.json`, JSON.stringify(items, null, 2));
                    ctx.toast("Arşiv İndirilenler\\Krizcord klasörüne kaydedildi");
                  } catch (e) {
                    ctx.toast("Dışa aktarılamadı: " + e.message);
                  }
                },
              }, svg("download", { size: 15 }), "Dışa aktar")),
            tagsBox)),
        listCard,
      ];
    };

    ctx.onCleanup(K.ui.registerPage({ id: "archive", title: "Arşiv", icon: "star", badge: () => items.length || null, render: page }));
    markers();
  },
};

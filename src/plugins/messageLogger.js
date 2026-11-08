// Mesaj Kaydedici: silinen mesajlar ekranda kalır ve kırmızı "Silindi" etiketiyle işaretlenir;
// düzenlenen mesajların eski hâli altında gösterilir. Kayıtlar yalnızca bu oturum içindir (Ctrl+R ile sıfırlanır).
// Discord'un olay dağıtıcısındaki (Flux Dispatcher) MESSAGE_DELETE / MESSAGE_UPDATE olaylarını yakalar.

import { BRAND } from "../renderer/brand";

const CSS = `
li.kc-ml-deleted{background:rgba(242,63,67,.07)!important;box-shadow:inset 2px 0 0 #f23f43}
li.kc-ml-deleted [id^="message-content-"],li.kc-ml-deleted [class*="messageContent"]{color:#f8a5a7!important}
:root.theme-light li.kc-ml-deleted [id^="message-content-"],:root.theme-light li.kc-ml-deleted [class*="messageContent"]{color:#c4262a!important}
.kc-ml-tag{display:inline-block;margin-left:6px;padding:0 5px;border-radius:4px;font-size:10px;font-weight:600;line-height:16px;
  letter-spacing:.02em;text-transform:uppercase;background:#f23f43;color:#fff;vertical-align:1px;user-select:none}
.kc-ml-edits{margin-top:2px}
.kc-ml-edit{font-size:.92em;line-height:1.35;color:var(--text-muted,#949ba4);white-space:pre-wrap;word-break:break-word}
.kc-ml-edit b{font-weight:600;font-size:.85em;margin-right:6px;opacity:.85}
`;

export default {
  name: "Mesaj Kaydedici",
  description: "Silinen mesajları kırmızı \"Silindi\" etiketiyle ekranda tutar, düzenlenen mesajların eski hâlini gösterir.",
  icon: "history",
  authors: [BRAND.owner],
  enabledByDefault: false,
  options: {
    ignoreSelf: { type: "boolean", label: "Kendi mesajlarımı kaydetme", default: true },
    ignoreBots: { type: "boolean", label: "Botları yok say", default: false },
    logEdits: { type: "boolean", label: "Düzenlemeleri göster", default: true },
  },

  start(ctx) {
    const D = ctx.discord.Dispatcher();
    if (!D) throw new Error("Discord olay dağıtıcısı bulunamadı (Discord güncellenmiş olabilir)");
    ctx.css(CSS);

    const deleted = new Map(); // "kanal:mesaj" -> orijinal MESSAGE_DELETE olayı
    const edits = new Map(); // "kanal:mesaj" -> [eski içerikler]
    let flushing = false;
    const key = (ch, id) => `${ch}:${id}`;
    const getMsg = (ch, id) => {
      try {
        return ctx.discord.MessageStore()?.getMessage?.(ch, id) ?? null;
      } catch {
        return null;
      }
    };
    const ignored = (msg) => {
      if (!msg?.author) return true; // ekranda yüklü değilse gösterecek bir şey yok
      if (ctx.option("ignoreSelf") && msg.author.id === ctx.discord.myId()) return true;
      if (ctx.option("ignoreBots") && msg.author.bot) return true;
      return false;
    };

    const render = () => {
      for (const li of ctx.discord.messageElements()) {
        const ids = ctx.discord.parseMessageEl(li);
        if (!ids) continue;
        const k = key(ids.channelId, ids.messageId);
        const content = ctx.discord.contentElement(li);

        if (deleted.has(k)) {
          li.classList.add("kc-ml-deleted");
          if (content && !content.querySelector(".kc-ml-tag")) {
            const tag = document.createElement("span");
            tag.className = "kc-ml-tag";
            tag.textContent = "Silindi";
            content.append(tag);
          }
        }

        const old = ctx.option("logEdits") ? edits.get(k) : null;
        const box = li.querySelector(".kc-ml-edits");
        if (!old) {
          box?.remove();
        } else if (content && (!box || box.dataset.n !== String(old.length))) {
          box?.remove();
          const wrap = document.createElement("div");
          wrap.className = "kc-ml-edits";
          wrap.dataset.n = String(old.length);
          for (const text of old) {
            const line = document.createElement("div");
            line.className = "kc-ml-edit";
            const label = document.createElement("b");
            label.textContent = "önceki:";
            line.append(label, document.createTextNode(text)); // metin olarak; HTML değil
            wrap.append(line);
          }
          content.after(wrap);
        }
      }
    };
    const renderSoon = () => setTimeout(render, 0);

    ctx.patcher.instead(D, "dispatch", function (args, original) {
      const action = args[0];
      if (flushing || !action || typeof action !== "object") return original(...args);

      if (action.type === "MESSAGE_DELETE") {
        const msg = getMsg(action.channelId, action.id);
        if (ignored(msg)) return original(...args);
        deleted.set(key(action.channelId, action.id), action);
        renderSoon();
        return Promise.resolve();
      }

      if (action.type === "MESSAGE_DELETE_BULK" && Array.isArray(action.ids)) {
        const keep = action.ids.filter((id) => !ignored(getMsg(action.channelId, id)));
        for (const id of keep) deleted.set(key(action.channelId, id), { type: "MESSAGE_DELETE", channelId: action.channelId, guildId: action.guildId, id });
        renderSoon();
        const rest = action.ids.filter((id) => !keep.includes(id));
        return rest.length ? original({ ...action, ids: rest }) : Promise.resolve();
      }

      if (action.type === "MESSAGE_UPDATE" && action.message && typeof action.message.content === "string") {
        const m = action.message;
        const prev = getMsg(m.channel_id, m.id);
        if (prev && !ignored(prev) && typeof prev.content === "string" && prev.content && prev.content !== m.content) {
          const k = key(m.channel_id, m.id);
          edits.set(k, [...(edits.get(k) || []), prev.content].slice(-5));
          renderSoon();
        }
      }
      return original(...args);
    });

    ctx.onDom(render, 150);

    // Kapatılınca: bekletilen silmeleri Discord'a ilet, ekrandaki işaretleri kaldır.
    ctx.onCleanup(() => {
      document.querySelectorAll(".kc-ml-tag,.kc-ml-edits").forEach((n) => n.remove());
      document.querySelectorAll("li.kc-ml-deleted").forEach((n) => n.classList.remove("kc-ml-deleted"));
    });
    this._flush = () => {
      flushing = true;
      try {
        for (const action of deleted.values()) D.dispatch(action);
      } catch {
        /* geç */
      }
      deleted.clear();
      edits.clear();
    };
  },

  stop() {
    this._flush?.();
    this._flush = null;
  },

  onOptionChange() {
    // Görünüm ayarları bir sonraki taramada uygulanır.
  },
};

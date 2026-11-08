// Ctrl+Tık Kopyala: Ctrl basılıyken kullanıcı adına veya profil resmine tıklayınca kullanıcının ID'sini,
// mesaja tıklayınca mesaj metnini (veya ayara göre mesaj ID'sini) kopyalar.
// Not: Alt+tık Discord'da "okunmadı olarak işaretle" olduğu için Ctrl kullanılır.

import { BRAND } from "../renderer/brand";

export default {
  name: "Ctrl+Tık Kopyala",
  description: "Ctrl basılıyken kullanıcı adına tıklayınca ID'sini, mesaja tıklayınca metnini kopyalar.",
  icon: "copy",
  authors: [BRAND.owner],
  enabledByDefault: false,
  options: {
    messageId: { type: "boolean", label: "Mesajda metin yerine mesaj ID'sini kopyala", default: false },
  },

  start(ctx) {
    const d = ctx.discord;
    const done = async (text, label) => {
      if (!text) return;
      if (await d.copyText(text)) ctx.toast(`${label} kopyalandı`);
    };

    ctx.on(
      document,
      "click",
      (e) => {
        if (!e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return;
        const target = e.target instanceof Element ? e.target : null;
        if (!target || target.closest(".kc-overlay,.kc-circle-root")) return;
        if (target.closest("a[href]")) return; // Ctrl+tık ile bağlantı açma bozulmasın

        const li = target.closest('li[id^="chat-messages-"]');
        const person = target.closest('[class*="username"]') || target.closest('img[class*="avatar"]');

        if (person) {
          const id = li ? d.authorOfMessage(li) : d.idFromFiber(person);
          if (!id) return;
          e.preventDefault();
          e.stopPropagation();
          done(id, "Kullanıcı ID'si");
          return;
        }

        if (li) {
          const ids = d.parseMessageEl(li);
          if (!ids) return;
          e.preventDefault();
          e.stopPropagation();
          if (ctx.option("messageId")) return done(ids.messageId, "Mesaj ID'si");
          const text = d.messageOf(li)?.content || d.contentElement(li)?.innerText || "";
          done(text.trim(), "Mesaj");
        }
      },
      true
    );
  },
};

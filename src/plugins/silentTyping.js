// Sessiz Yazma: yazarken karşı tarafa "yazıyor..." bilgisi gönderilmez.
// 1. yol: Discord'un yazma modülündeki startTyping'i boşa çıkarır.
// 2. yol (modül bulunamazsa / yamalanamazsa): /channels/<id>/typing isteklerini ağ katmanında durdurur.

import { BRAND } from "../renderer/brand";

const TYPING_URL = /\/channels\/\d+\/typing(\?|$)/;

export default {
  name: "Sessiz Yazma",
  description: "Yazarken karşı tarafa \"yazıyor...\" bilgisi gitmez.",
  icon: "eyeOff",
  authors: [BRAND.owner],
  enabledByDefault: false,

  async start(ctx) {
    const Typing = ctx.discord.TypingActions() || (await ctx.discord.waitFor(ctx.discord.TypingActions, 4000));
    if (Typing) {
      try {
        ctx.patcher.instead(Typing, "startTyping", () => undefined);
        ctx.log("yazma modülü yamalandı");
        return;
      } catch (e) {
        ctx.log("yazma modülü yamalanamadı, ağ katmanına geçiliyor:", e.message);
      }
    }

    // Ağ katmanı yedeği: XHR isteği "gönderildi" sayılır ama sunucuya hiç gitmez.
    const XHR = XMLHttpRequest.prototype;
    ctx.patcher.before(XHR, "open", function (args) {
      this.__kcTyping = String(args[0]).toUpperCase() === "POST" && TYPING_URL.test(String(args[1]));
    });
    ctx.patcher.instead(XHR, "send", function (args, original) {
      if (!this.__kcTyping) return original(...args);
      // 204 başarı gibi davran; Discord hata görüp tekrar denemesin.
      Object.defineProperty(this, "readyState", { value: 4, configurable: true });
      Object.defineProperty(this, "status", { value: 204, configurable: true });
      Object.defineProperty(this, "responseText", { value: "", configurable: true });
      setTimeout(() => {
        this.onreadystatechange?.(new Event("readystatechange"));
        this.onload?.(new ProgressEvent("load"));
        this.dispatchEvent(new ProgressEvent("load"));
        this.dispatchEvent(new ProgressEvent("loadend"));
      }, 0);
    });
    ctx.log("ağ katmanı yedeği etkin");
  },
};

// Platform Göstergesi: kullanıcının hangi cihazlardan bağlı olduğunu (bilgisayar / telefon / web) adının yanında gösterir.
// Simgelerin rengi o cihazdaki durumu gösterir: yeşil çevrimiçi, sarı boşta, kırmızı rahatsız etmeyin.

import { BRAND } from "../renderer/brand";
import { svg } from "../renderer/icons";

const PLATFORMS = [
  ["desktop", "monitor", "Bilgisayar"],
  ["mobile", "smartphone", "Telefon"],
  ["web", "globe", "Web"],
];
const STATUS = {
  online: ["#23a55a", "çevrimiçi"],
  idle: ["#f0b232", "boşta"],
  dnd: ["#f23f43", "rahatsız etmeyin"],
};

const CSS = `
.kc-pi{display:inline-flex;align-items:center;gap:2px;margin-left:5px;vertical-align:middle;line-height:0}
.kc-pi span{display:inline-flex;cursor:default}
.kc-pi .kc-ic{width:15px;height:15px}
[data-list-item-id^="members-"] .kc-pi .kc-ic{width:14px;height:14px}
`;

export default {
  name: "Platform Göstergesi",
  description: "Kullanıcının bilgisayardan mı, telefondan mı, webden mi bağlı olduğunu adının yanında gösterir.",
  icon: "monitor",
  authors: [BRAND.owner],
  enabledByDefault: false,
  options: {
    chat: { type: "boolean", label: "Sohbette göster", default: true },
    members: { type: "boolean", label: "Üye listesinde göster", default: true },
    colored: { type: "boolean", label: "Duruma göre renklendir", default: true },
  },

  async start(ctx) {
    if (!ctx.discord.PresenceStore() && !(await ctx.discord.waitFor(ctx.discord.PresenceStore))) throw new Error("Durum bilgisi modülü bulunamadı (Discord güncellenmiş olabilir)");
    ctx.css(CSS);

    const signature = (status) =>
      status
        ? PLATFORMS.filter(([k]) => status[k] && status[k] !== "offline").map(([k]) => `${k}:${status[k]}`).join(",")
        : "";

    const place = (nameEl, userId) => {
      const parent = nameEl.parentElement;
      if (!parent) return;
      let node = parent.querySelector(":scope > .kc-pi");
      const status = ctx.discord.clientStatus(userId);
      const sig = signature(status) + (ctx.option("colored") ? "|c" : "");
      if (!signature(status)) {
        node?.remove();
        return;
      }
      if (node && node.dataset.sig === sig) return;
      node?.remove();
      node = document.createElement("span");
      node.className = "kc-pi";
      node.dataset.sig = sig;
      for (const [k, icon, label] of PLATFORMS) {
        const s = status[k];
        if (!s || s === "offline") continue;
        const [color, text] = STATUS[s] || ["#80848e", s];
        const holder = document.createElement("span");
        holder.title = `${label}: ${text}`;
        holder.style.color = ctx.option("colored") ? color : "var(--text-muted,#949ba4)";
        holder.append(svg(icon, { size: 15, stroke: 2 }));
        node.append(holder);
      }
      nameEl.after(node);
    };

    const clear = (scope) => scope.querySelectorAll(".kc-pi").forEach((n) => n.remove());

    const render = () => {
      if (ctx.option("chat")) {
        for (const li of ctx.discord.messageElements()) {
          const name = li.querySelector('h3 [class*="username"]');
          if (!name) continue;
          const id = ctx.discord.authorOfMessage(li);
          if (id) place(name, id);
        }
      } else {
        document.querySelectorAll('li[id^="chat-messages-"] .kc-pi').forEach((n) => n.remove());
      }
      for (const { row, id } of ctx.discord.memberRows()) {
        if (!ctx.option("members")) {
          clear(row);
          continue;
        }
        const name = row.querySelector('[class*="username"]') || row.querySelector('[class*="name_"]');
        if (name && id) place(name, id);
      }
    };

    ctx.onDom(render, 200);
    ctx.interval(render, 10 * 1000); // durum değişiklikleri DOM'u değiştirmeyebilir
    ctx.onCleanup(() => clear(document));
  },
};

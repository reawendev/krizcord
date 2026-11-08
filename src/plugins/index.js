// Yerleşik eklentiler.
import { BRAND } from "../renderer/brand";

const SUFFIX = " • " + BRAND.name;

const marka = {
  name: "Marka",
  description: "Krizcord vurgu rengini uygular ve pencere başlığına marka ekler.",
  authors: [BRAND.owner],
  enabledByDefault: true,
  _style: null,
  _observer: null,
  start() {
    this._style = document.createElement("style");
    this._style.id = "krizcord-brand";
    this._style.textContent = `:root{--krizcord-accent:${BRAND.accent}}`;
    document.head.appendChild(this._style);

    const fix = () => {
      if (!document.title.endsWith(SUFFIX)) document.title += SUFFIX;
    };
    const titleEl = document.querySelector("title");
    if (titleEl) {
      fix();
      this._observer = new MutationObserver(fix);
      this._observer.observe(titleEl, { childList: true });
    }
  },
  stop() {
    this._style?.remove();
    this._observer?.disconnect();
    if (document.title.endsWith(SUFFIX)) {
      document.title = document.title.slice(0, -SUFFIX.length);
    }
  },
};

const webpackTesti = {
  name: "Webpack Testi",
  description: "Discord modüllerine erişimi doğrular ve konsola yazar (geliştirici örneği).",
  authors: [BRAND.owner],
  enabledByDefault: false,
  start(ctx) {
    const UserStore = ctx.webpack.findByProps("getCurrentUser", "getUser");
    if (!UserStore) {
      ctx.log("UserStore bulunamadı - Discord güncellenmiş olabilir.");
      return;
    }
    const me = UserStore.getCurrentUser?.();
    ctx.log("Webpack erişimi çalışıyor. Giriş yapan kullanıcı:", me?.username ?? "(bilinmiyor)");
  },
};

export default [marka, webpackTesti];

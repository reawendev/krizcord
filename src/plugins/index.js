// Yerleşik eklentiler.
import { BRAND } from "../renderer/brand";
import silentTyping from "./silentTyping";
import messageLogger from "./messageLogger";
import platformIndicators from "./platformIndicators";
import ctrlCopy from "./ctrlCopy";
import profileViewer from "./profileViewer";
import messageArchive from "./messageArchive";

const SUFFIX = " • " + BRAND.name;

const marka = {
  name: "Marka",
  description: "Krizcord vurgu rengini uygular ve pencere başlığına marka ekler.",
  icon: "sparkles",
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

export default [marka, messageArchive, profileViewer, messageLogger, silentTyping, platformIndicators, ctrlCopy];

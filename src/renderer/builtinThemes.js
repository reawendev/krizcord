// Krizcord ile gelen hazır temalar. Dosya değil, koda gömülü: güncellemelerle birlikte otomatik yenilenir.
// Discord'un hem eski hem yeni (2025 görsel yenilemesi) renk değişkenlerini hedefler; Discord değişken
// adlarını değiştirirse bazı alanlar varsayılan renkte kalabilir.

const vars = (p) => `
:root, .theme-dark, .theme-darker, .theme-midnight, .visual-refresh.theme-dark {
  --background-primary: ${p.bg2} !important;
  --background-secondary: ${p.bg1} !important;
  --background-secondary-alt: ${p.bg1} !important;
  --background-tertiary: ${p.bg0} !important;
  --background-floating: ${p.bg0} !important;
  --background-nested-floating: ${p.bg1} !important;
  --background-modifier-hover: ${p.hover} !important;
  --background-modifier-selected: ${p.selected} !important;
  --background-modifier-active: ${p.selected} !important;
  --background-modifier-accent: ${p.line} !important;
  --channeltextarea-background: ${p.input} !important;
  --modal-background: ${p.bg1} !important;
  --modal-footer-background: ${p.bg0} !important;
  --deprecated-card-bg: ${p.bg1} !important;
  --bg-overlay-chat: ${p.bg2} !important;
  --bg-overlay-1: ${p.bg0} !important;
  --background-base-lowest: ${p.bg0} !important;
  --background-base-lower: ${p.bg1} !important;
  --background-base-low: ${p.bg1} !important;
  --background-surface-high: ${p.bg1} !important;
  --background-surface-higher: ${p.input} !important;
  --background-surface-highest: ${p.input} !important;
  --chat-background-default: ${p.bg2} !important;
  --background-mod-subtle: ${p.hover} !important;
  --background-mod-normal: ${p.selected} !important;
  --border-subtle: ${p.line} !important;
  --border-faint: ${p.line} !important;
  --text-normal: ${p.text} !important;
  --text-default: ${p.text} !important;
  --text-muted: ${p.muted} !important;
  --header-primary: ${p.textStrong} !important;
  --header-secondary: ${p.muted} !important;
  --interactive-normal: ${p.muted} !important;
  --interactive-hover: ${p.text} !important;
  --interactive-active: ${p.textStrong} !important;
  --channels-default: ${p.muted} !important;
  --text-link: ${p.link} !important;
  --brand-experiment: ${p.accent} !important;
  --brand-500: ${p.accent} !important;
  --brand-560: ${p.accentDark} !important;
  --krizcord-accent: ${p.accent} !important;
}
::selection { background: ${p.accent}; color: #fff; }
`;

export const BUILTIN_THEMES = [
  {
    id: "builtin:krizcord-koyu",
    name: "Krizcord Koyu",
    description: "Neredeyse siyah zemin, neon yeşil bağlantılar ve mor vurgu.",
    author: "reawendev",
    swatch: ["#0b0b0d", "#16161a", "#7c5cff", "#7dff4a"],
    css: vars({
      bg0: "#08080a",
      bg1: "#0f0f12",
      bg2: "#131317",
      input: "#1b1b20",
      hover: "rgba(125,255,74,.06)",
      selected: "rgba(124,92,255,.18)",
      line: "rgba(255,255,255,.06)",
      text: "#e4e4e7",
      textStrong: "#fafafa",
      muted: "#9a9aa4",
      link: "#7dff4a",
      accent: "#7c5cff",
      accentDark: "#6a46f2",
    }),
  },
  {
    id: "builtin:amoled",
    name: "AMOLED Siyah",
    description: "Tam siyah zemin; OLED ekranlarda pil dostu ve yüksek kontrastlı.",
    author: "reawendev",
    swatch: ["#000000", "#0a0a0a", "#ffffff", "#7c5cff"],
    css: vars({
      bg0: "#000000",
      bg1: "#000000",
      bg2: "#000000",
      input: "#0e0e0e",
      hover: "rgba(255,255,255,.05)",
      selected: "rgba(255,255,255,.09)",
      line: "rgba(255,255,255,.08)",
      text: "#e5e5e5",
      textStrong: "#ffffff",
      muted: "#8c8c8c",
      link: "#9d86ff",
      accent: "#7c5cff",
      accentDark: "#6a46f2",
    }),
  },
  {
    id: "builtin:gece-mavisi",
    name: "Gece Mavisi",
    description: "Lacivert tonları ve yumuşak mavi vurgu.",
    author: "reawendev",
    swatch: ["#0b1220", "#111a2e", "#3b82f6", "#93c5fd"],
    css: vars({
      bg0: "#080e1a",
      bg1: "#0d1526",
      bg2: "#111a2e",
      input: "#18233b",
      hover: "rgba(147,197,253,.06)",
      selected: "rgba(59,130,246,.18)",
      line: "rgba(148,163,184,.12)",
      text: "#dbe4f3",
      textStrong: "#f1f5fb",
      muted: "#8a9ab5",
      link: "#93c5fd",
      accent: "#3b82f6",
      accentDark: "#2563eb",
    }),
  },
];

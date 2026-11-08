/* global __KRIZCORD_VERSION__ */
// Derleme sırasında package.json'daki sürümle değiştirilir (build.js > define).
export const VERSION = typeof __KRIZCORD_VERSION__ === "string" ? __KRIZCORD_VERSION__ : "0.0.0-dev";
export const BRAND = {
  name: "Krizcord",
  accent: "#7c5cff",
  owner: "reawendev",
  repo: "reawendev/krizcord",
  links: {
    github: "https://github.com/reawendev/krizcord",
    kick: "https://kick.com/malikriz",
  },
};

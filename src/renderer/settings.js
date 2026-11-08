let data = { plugins: {}, themes: {} };
let timer = null;

export async function load() {
  const saved = await window.KrizcordNative.getSettings();
  data = { plugins: {}, themes: {}, ...saved };
  data.plugins ||= {};
  data.themes ||= {};
}

export const get = () => data;

export function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    window.KrizcordNative.setSettings(data).catch((e) =>
      console.error("[Krizcord] ayarlar kaydedilemedi:", e)
    );
  }, 200);
}

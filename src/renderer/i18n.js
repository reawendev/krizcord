// Türkçe arayüz metinleri.
const tr = {
  "tab.plugins": "Eklentiler",
  "tab.themes": "Temalar",
  "tab.badges": "Rozetler",
  "tab.about": "Hakkında",
  "panel.close": "Kapat",
  "sidebar.entry": "Krizcord",

  "plugins.empty": "Henüz eklenti yok.",
  "plugins.openFolder": "Eklenti klasörünü aç",
  "plugins.builtin": "Yerleşik",
  "plugins.user": "Kullanıcı",
  "plugins.error": "Hata",
  "plugins.restartHint": "Bazı eklentiler tam etki için Discord'u yeniden başlatmayı (Ctrl+R) gerektirebilir.",

  "themes.empty": "Tema bulunamadı. CSS dosyalarını tema klasörüne at.",
  "themes.openFolder": "Tema klasörünü aç",
  "themes.reload": "Yenile",

  "badges.yourId": "Discord ID'n",
  "badges.copy": "Kopyala",
  "badges.copied": "Kopyalandı!",
  "badges.unknownId": "Henüz alınamadı",
  "badges.has": "Rozetin var",
  "badges.none": "Henüz rozetin yok. ID'ni kopyalayıp Krizcord ekibine gönder, listeye eklenelim.",
  "badges.list": "Rozet listesi",
  "badges.users": "kullanıcı",
  "badges.refresh": "Listeyi yenile",
  "badges.about": "Rozetler yalnızca Krizcord kullananlara görünür: sohbette kullanıcı adının yanında, üye listesinde ve profillerde.",
  "badges.types": "Rozet türleri",

  "about.title": "Krizcord hakkında",
  "about.desc": "Sıfırdan yazılmış, eklenti ve tema destekli bir Discord istemci modu.",
  "about.shortcut": "Paneli aç/kapat: Ctrl + Shift + K  (ya da Kullanıcı Ayarları > Krizcord)",
  "about.version": "Sürüm",
  "about.dataFolder": "Veri klasörünü aç",
  "about.warning": "Not: İstemci modları Discord Hizmet Şartları'na aykırıdır. Kendi sorumluluğunda kullan.",
};

export const t = (key) => tr[key] ?? key;

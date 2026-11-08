# Krizcord

https://github.com/reawendev/krizcord

Sıfırdan yazılmış, eklenti ve tema destekli, Türkçe arayüzlü Discord istemci modu.

> **Not:** İstemci modları Discord Hizmet Şartları'na aykırıdır. Kendi sorumluluğunda kullan.
> Windows + Discord masaüstü (stable/PTB/canary) hedeflenir.

## Kurulum

```bash
npm install
npm run build
npm run kur -- --kapat      # Discord açıksa otomatik kapatır
```

Diğer komutlar: `npm run durum`, `npm run kaldir`. PTB/Canary için `-- --kanal ptb` ekle.
**Discord güncellenince** (yeni `app-x.y.z` klasörü) `npm run kur` komutunu tekrar çalıştır.

## Pencereli installer (Vencord gibi)

```bash
npm run build               # önce Krizcord'u derle
npm run installer           # installer'ı geliştirme modunda aç
npm run installer:build     # tek dosya Krizcord-Kurulum.exe üretir (installer-app/release/)
```

`Krizcord-Kurulum.exe` içinde derlenmiş Krizcord gömülüdür. Çift tıkla, Discord sürümünü seç, **Kur / Onar / Kaldır**.
Discord'u otomatik kapatıp açabilir. Discord güncellendikten sonra **Onar**'a bas.
.exe yalnızca Windows'ta üretilir.

## Kullanım

- Discord'u aç → **Ctrl + Shift + K** ile ya da **Kullanıcı Ayarları > Krizcord** sekmesinden paneli aç.
- Pencere başlığında **"Discord • Krizcord"** yazıyorsa Krizcord yüklüdür.
- Hata ayıklama günlüğü: `%APPDATA%\krizcord\krizcord.log`. Geliştirici araçları: **Ctrl + Shift + I**.
- Panelde eklentileri/temaları aç-kapat. Ayarlar `%APPDATA%\krizcord\settings.json` içinde.

## Rozetler

Krizcord kullananlara, `badges.json` içinde ID'si tanımlı kullanıcıların yanında rozet görünür
(sohbette kullanıcı adının yanı, üye listesi, profiller). Rozetleri **yalnızca Krizcord kullananlar** görür.

Rozet vermek için `badges.json` içindeki `users` bölümüne kullanıcının Discord ID'sini ekle:

```json
"users": {
  "123456789012345678": ["krizcord"],
  "987654321098765432": ["kurucu", "krizcord"]
}
```

Commit'le ve push'la. Kullanıcılar listeyi 30 dakika içinde otomatik alır (panelde **Rozetler > Listeyi yenile** ile anında).
ID'ni panelin **Rozetler** sekmesinden kopyalayabilirsin. Yeni rozet türü için `badges` bölümüne `{ "name": "...", "color": "#rrggbb" }` ekle.

## Kendi eklentini yaz

`%APPDATA%\krizcord\plugins\` içine bir `.js` dosyası at (örnek: `ornek-eklenti.js`), Discord'da `Ctrl+R`.
Dosya `Krizcord.definePlugin({...})` çağırır; derleme gerekmez.

## Tema

`%APPDATA%\krizcord\themes\` içine `.css` dosyası at, panelden aç.

## Mimari

```
discord_desktop_core/index.js  →  dist/main.js      (BrowserWindow yamalanır, preload değiştirilir)
                                  dist/preload.js   (orijinal preload + KrizcordNative köprüsü + renderer enjeksiyonu)
                                  dist/renderer.js  (webpack bulucu, patcher, eklenti/tema yöneticisi, panel)
```

| Dosya | Görev |
| --- | --- |
| `src/main/index.js` | Ana süreç yamacı, IPC, ayar/eklenti/tema dosyaları |
| `src/preload/index.js` | Köprü ve enjeksiyon |
| `src/renderer/webpack.js` | `findByProps`, `findByCode`, `find` |
| `src/renderer/patcher.js` | `before` / `after` / `instead` kancaları |
| `src/renderer/plugins.js` | Eklenti kayıt, başlat/durdur, kullanıcı eklentileri |
| `src/renderer/ui.js` | Türkçe ayar paneli |
| `src/plugins/index.js` | Yerleşik eklentiler |
| `installer/core.js` | Kurulum çekirdeği (Discord'u bulma, enjeksiyon, geri alma) |
| `installer/cli.js` | Komut satırı: kur / kaldır / durum |
| `installer-app/` | Electron ile pencereli installer |

## Bilinen sınırlar

- Ayar paneli Discord'un kendi ayarlarına gömülü değil, ayrı bir yüzen panel.
- Discord'un webpack modül yapısı sık değişir; `findByProps` ile bulunan modüller kırılabilir.
- Installer şimdilik yalnızca Windows ve Discord'un `%LOCALAPPDATA%` kurulumunu destekler.

// Örnek kullanıcı eklentisi. Bu dosya Krizcord veri klasöründeki "plugins" içine kopyalanır.
// Kendi eklentini yazmak için bu dosyayı kopyalayıp düzenle, sonra Discord'u yenile (Ctrl+R).
//
// ctx.webpack  -> findByProps(...), findByCode(...), find(fn)
// ctx.patcher  -> before / after / instead (eklenti kapanınca otomatik geri alınır)
// ctx.settings -> get(anahtar, varsayılan) / set(anahtar, değer)
// ctx.log      -> konsola yazar

Krizcord.definePlugin({
  name: "Örnek Eklenti",
  description: "Eklenti nasıl yazılır gösteren örnek. Açınca konsola mesaj yazar.",
  authors: ["Sen"],
  enabledByDefault: false,

  start(ctx) {
    ctx.log("Örnek eklenti başladı!");

    // Örnek: bir modülü bulup fonksiyonuna kanca ekleme
    // const MessageActions = ctx.webpack.findByProps("sendMessage", "editMessage");
    // ctx.patcher.before(MessageActions, "sendMessage", (args) => {
    //   ctx.log("Mesaj gönderiliyor:", args);
    // });
  },

  stop(ctx) {
    ctx.log("Örnek eklenti durdu.");
  },
});

# Harita altyapısı

Google Maps kullanılmıyor. API anahtarı, faturalandırma hesabı ve kullanım
kotası gerektirmiyor.

| Katman | Ne kullanılıyor |
|---|---|
| Harita motoru | MapLibre GL Native (açık kaynak) |
| Tile sağlayıcı | OpenFreeMap (ücretsiz, kayıt yok, limit yok) |
| Veri kaynağı | OpenStreetMap |

## Stil değiştirme

`src/mapConfig.js` içindeki `STYLE_URL` değerini değiştir, başka hiçbir
yere dokunma. Anahtar istemeyen alternatifler dosyada yorum olarak duruyor:

- OpenFreeMap bright / liberty
- Versatiles colorful
- Carto voyager

## Bilmen gerekenler

**Expo Go'da çalışmaz.** MapLibre native kod içeriyor. Geliştirme için
development build alman lazım:

```bash
eas build --profile development --platform android
```

Bir kez kurduktan sonra `npx expo start --dev-client` ile normal
geliştirme yapabilirsin.

**Atıf zorunlu.** OpenStreetMap lisansı (ODbL) kaynak gösterilmesini
şart koşuyor. `attributionPosition` ayarı bunu haritanın köşesinde
gösteriyor — kaldırma, lisans ihlali olur.

**OpenFreeMap tek kişi tarafından işletiliyor.** Ücretsiz ve limitsiz
ama kurumsal bir SLA'sı yok. Kesinti yaşarsan `STYLE_URL`'i Versatiles
veya Carto'ya çevirmen yeterli, tek satır değişiklik.

Uygulama büyürse kendi tile sunucunu kurabilirsin — OpenFreeMap'in
kurulum dokümanı açık kaynak.

## Neden Google değil

`react-native-maps` Android'de her zaman Google Maps SDK'sını kullanır.
Üstüne OpenStreetMap katmanı koysan bile anahtar ister ve faturalandırma
hesabı bağlamanı zorunlu tutar. MapLibre bu zincirin tamamını kesiyor.

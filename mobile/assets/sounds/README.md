# Ses dosyaları

Bu klasöre üç dosya koyman gerekiyor. Kapı zili teması.

| Dosya | Nerede çalar | Süre |
|---|---|---|
| `zil.wav` | Yeni istek bildirimi (ding-dong) | 1–2 sn |
| `zil_acil.wav` | Acil istek bildirimi (sabırsız zil) | 1–2 sn |
| `zil_tek.wav` | Teklif geldi, uygulama içi (tek ding) | 1 sn |

## Android kuralları

Dosya adları **sadece küçük harf, rakam ve alt çizgi** içerebilir.
Tire, boşluk, Türkçe karakter ve büyük harf kullanma — build sırasında
sessizce düşer, bildirim varsayılan sesle çalar.

Format **wav** olmalı. Android bildirim kanallarında mp3 desteklenmiyor.
Süre 30 saniyeyi geçmemeli, pratikte 2 saniyenin altında tut.

## Değiştirirsen

Bildirim kanalı sesi sadece kanal **ilk oluşturulduğunda** yazılır.
Sesi değiştirirsen mevcut kullanıcılarda eski ses çalmaya devam eder.
Çözüm: `App.js` içindeki kanal adını değiştir (`istekler` → `istekler_v2`).

## Lisans

Telifsiz veya ticari kullanıma uygun lisanslı ses kullan. Freesound.org'da
CC0 filtresi uygula. Play Store lisans şikayeti gelirse uygulama kaldırılır.

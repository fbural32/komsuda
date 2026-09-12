# Play Store öncesi kontrol listesi

## Denetimde bulunup düzeltilenler

| Sorun | Sonuç |
|---|---|
| Profil ekranına hiçbir yerden gidilemiyordu | Haritaya "Profilim" butonu eklendi |
| Hesap silme yoktu (Play zorunlu şartı) | Profile eklendi, çift onaylı |
| Ses dosyaları hiç çalınmıyordu | Bildirim geldiğinde ve teklif düştüğünde bağlandı |
| Çıkışta arka plan konum görevi duruyordu | Çıkış ve hesap silmede durduruluyor |

## Reddedilme riskleri ve hazır cevaplar

### 1. Arka plan konum izni — EN YÜKSEK RİSK

Google bu izni ayrı forma tabi tutuyor ve sıkça reddediyor.

**İstenecekler:**
- İznin neden gerektiğini anlatan yazılı açıklama
- Uygulamada iznin kullanımını gösteren **ekran kaydı videosu** (YouTube'a
  unlisted yükleyip link vereceksin)
- İzin isteme akışının videoda görünmesi

**Hazır açıklama metni:**

> Komşuda, kullanıcıların yakınlarındaki komşulardan acil ihtiyaçlarını
> karşılamasını sağlayan hiperlokal bir eşleştirme uygulamasıdır.
>
> Arka plan konumu, kullanıcıya yalnızca 3 km yarıçapındaki acil istekleri
> bildirim olarak ulaştırmak için kullanılır. Uygulamanın temel işlevi
> budur: bir kullanıcı "tüpüm bitti" dediğinde, yakınındaki komşulara
> anında haber gitmesi gerekir. Kullanıcıların uygulamayı sürekli açık
> tutması beklenemez.
>
> Konum en fazla 15 dakikada bir güncellenir. Konum geçmişi tutulmaz;
> sistemde yalnızca en son konum saklanır ve üzerine yazılır. Rota,
> ziyaret edilen yerler veya kalış süresi kaydedilmez.
>
> İzin isteğe bağlıdır. Vermeyen kullanıcılar uygulamayı tam olarak
> kullanabilir, yalnızca bildirimleri uygulama açıkken alır.

**Videoda gösterilecekler:** izin ekranındaki açıklama, "Her zaman izin ver"
seçimi, uygulama kapalıyken gelen bildirim, bildirime tıklayınca açılan istek.

**Reddedilirse:** arka plan iznini kaldırıp yayınla, sonra ayrı güncellemeyle
tekrar başvur. Uygulama izin olmadan da çalışıyor.

### 2. Data safety formu

`docs/acik-riza-ve-beyanlar.md` içindeki tabloya göre doldur. Arka plan
konumu eklendiği için "Location — Approximate and Precise" işaretlenecek,
paylaşım "with other users" olarak belirtilecek.

Yanlış beyan en sık kaldırılma sebebi.

### 3. Kullanıcılar arası içerik ve moderasyon

Google, kullanıcı üretimi içerik barındıran uygulamalarda moderasyon
mekanizması istiyor.

**Bizde var:** şikayet ekranı, engelleme (iptal edilen anlaşmada karşı taraf
engelleniyor), puanlama, uyarı ve hesap kapatma. Serbest metin mesajlaşma
olmadığı için taciz riski zaten düşük.

**Cevap:** "Uygulamada serbest metin mesajlaşma yoktur; kullanıcılar yalnızca
önceden tanımlı hazır cevapları seçebilir. Şikayet mekanizması, puanlama
sistemi ve otomatik hesap kapatma kuralları mevcuttur."

### 4. Gizlilik politikası ve hesap silme linkleri

İkisi de zorunlu, ikisi de hazır:
- `https://fbural32.github.io/komsuda/gizlilik.html`
- `https://fbural32.github.io/komsuda/hesap-silme.html`

**GitHub Pages'i açmayı unutma** — Settings → Pages → main / docs.

### 5. Uygulama içi ödeme yok beyanı

Uygulama ödeme işlemiyor, bu yüzden Google Play Billing zorunluluğu
doğmuyor. Açıklamada "ödeme kullanıcılar arasında uygulama dışında yapılır"
ifadesi geçmeli.

### 6. Yasaklı ürün denetimi

Gıda, alkol, sigara, ilaç kategorileri sistemde yok — kullanıcı seçemiyor.
Kullanım şartlarında da açıkça yasak. Bu iyi bir savunma.

## Yayın öncesi kalan işler

- [ ] Yasal metinlerdeki `[TARİH]`, `[AD SOYAD]`, `[E-POSTA]`, `[AÇIK ADRES]`
- [ ] GitHub Pages'i aç
- [ ] Telefondan en az 2 ekran görüntüsü
- [ ] Arka plan konum izni videosu
- [ ] `migration-006.sql` çalıştır

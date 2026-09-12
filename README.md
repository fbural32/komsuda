# Komşuda

Yakındaki komşulardan acil ihtiyaç karşılama uygulaması. 3 km yarıçapında istekler,
hazır cevaplı mesajlaşma, süreli teslimat anlaşması, karşılıklı puanlama.

Yayına çıkmak için adım adım rehber: **`YAYIN_ADIMLARI.md`**

## Ürün kuralları

| Kural | Değer |
|---|---|
| Arama yarıçapı | Eşya 3 km · Hizmet 10 km |
| Fiyat aralığı | 50₺ – 2000₺ |
| Teklif limiti | İstek başına en fazla 3 |
| Kategori sayısı | 93 (70 eşya, 23 hizmet) |
| Fiyat tipi | Eşyada toplam, hizmette saatlik |
| Süre (eşya) | 10 / 15 / 20 dk, tavan 20 dk |
| Hizmet | Randevu (gün + saat aralığı), 14 güne kadar |
| Fotoğraf onayı | Süre/randevu öncesi zorunlu |
| Fotoğraf depolama | Veritabanında, anlaşma bitince silinir |
| Seçim | İstek sahibi teklifler arasından seçer |
| Ek süre | Tek seferlik |
| Bildirim sıklığı | İstek başına 15 dk'da bir |
| Mesajlaşma | Serbest metin yok, sadece hazır cevap + konum |
| Sohbet ömrü | Anlaşma kapanınca silinir |
| Yasaklı | Gıda ve içecek, alkol, sigara, ilaç, yasa dışı ürünler |
| Acil mod | Sadece izinli kategorilerde, günde 2 hak |

### Acil mod ("hızlı getir")

Ölçüt: yokluğu bir işi tamamen durduruyor ve sabaha bekleyemez.

Açılabilen kategoriler: tüp, bebek bezi, kadın hijyen ürünü, şarj kablosu,
powerbank, ampul/sigorta, tuvalet kağıdı.

Açılamayan: şemsiye, üçlü priz, uzatma kablosu, çakmak.

Acil istekler `acil-istekler` bildirim kanalından, kendi sesi ve yüksek
önceliğiyle gider. Kullanıcı bu kanalı Android ayarlarından tek başına kısabilir.
Günlük 2 hak sınırı, herkesin her isteği acil işaretlemesini engelliyor.

Ödeme uygulama dışında, taraflar arasında yapılır. Uygulama aracı değildir.

### Eşleşme akışı

1. İstek yayınlanır, 3 km içindeki izinli komşulara bildirim gider
2. En fazla 3 kişi teklif verebilir; kontenjan dolunca istek listeden düşer
3. İstek sahibi puanlara bakıp birini seçer
4. Seçim anında diğer teklifler kapanır, sadece seçilenle mesaj kutusu açılır
5. Fiyat ve süre anlaşma ekranında karşılıklı onaylanır
6. Anlaşma iptal olursa istek tekrar yayınlanabilir — vazgeçen kişi
   engellenir ve yeni istekte teklif veremez

---

## 1. Backend

### Kurulum

```bash
cd backend
npm install
cp .env.example .env      # DATABASE_URL ve JWT_SECRET doldur
npm run migrate           # schema.sql'i çalıştırır
npm run dev
```

### Veritabanı

Neon (ücretsiz PostgreSQL) öneriyorum — PostGIS destekliyor.

1. https://neon.tech üzerinden proje aç
2. SQL Editor'de: `CREATE EXTENSION postgis;`
3. Bağlantı stringini `.env` içine `DATABASE_URL` olarak yaz
4. `npm run migrate`

### Mail servisi (Brevo)

1. https://brevo.com üzerinden ücretsiz hesap aç — günde 300 mail
2. Panel → SMTP & API → API Keys → Create a new API key
3. `.env` içine `BREVO_API_KEY` olarak yaz
4. Senders bölümünden gönderici adresini doğrula (kendi Gmail adresin olur)

Alan adı zorunlu değil — Brevo kendi doğruladığın bir e-posta adresinden
gönderim yapmana izin veriyor. Alan adın olursa daha az spam'e düşer ama
başlangıç için gerekmiyor.

`BREVO_API_KEY` boşsa uygulama çalışmaya devam eder, doğrulama linki
sunucu konsoluna yazılır — yerel geliştirme için yeterli.

### Render'a deploy

1. Repoyu GitHub'a push et
2. https://render.com → New → Web Service → repoyu seç
3. Root Directory: `backend`, Build: `npm install`, Start: `npm start`
4. Environment: `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_URL`
5. Deploy sonrası URL'i not al

---

## 2. Mobil uygulama

### Kurulum

```bash
cd mobile
npm install
npx expo start
```

Emülatörde test için `app.json` içindeki `extra.apiUrl` değerini
`http://10.0.2.2:3000` yap (Android emülatörü localhost'a böyle erişir).

### Harita

API anahtarı gerekmiyor. MapLibre + OpenFreeMap kullanılıyor, ikisi de
ücretsiz ve kayıt istemiyor. Detaylar: `mobile/HARITA.md`

Not: MapLibre native kod içerdiği için Expo Go'da çalışmaz, development
build gerekiyor.

### Görseller

`assets/` içindeki ikon, splash ve mağaza görselleri üretildi (kapı zili
teması, yeşil/beyaz). Geçici sürümler — tasarımcı işi değil, build almanı
engellemesin diye konuldu. İstediğin zaman değiştirebilirsin:

| Dosya | Boyut | Nerede |
|---|---|---|
| `icon.png` | 1024×1024 | Uygulama ikonu |
| `adaptive-icon.png` | 1024×1024 | Android adaptive ikon (şeffaf) |
| `splash.png` | 1284×2778 | Açılış ekranı |
| `notification-icon.png` | 192×192 | Bildirim siluet ikonu |
| `feature-graphic.png` | 1024×500 | Play Store kapak görseli |

---

## 3. Play Store'a yükleme

### EAS hesabı

```bash
npm install -g eas-cli
eas login
eas build:configure     # projectId'yi app.json'a yazar
```

### Test build (APK — telefona kurup denemek için)

```bash
npm run build:preview
```

Build bitince Expo bir indirme linki verir. APK'yı telefona kurup test et.

### Yayın build (AAB — Play Store için)

```bash
npm run build:production
```

Bu bir `.aab` dosyası üretir. Play Console yalnızca AAB kabul ediyor.

### Play Console adımları

1. https://play.google.com/console → Uygulama oluştur
2. Uygulama adı: Komşuda · Dil: Türkçe · Ücretsiz
3. **Store listing**: açıklama, en az 2 ekran görüntüsü, 512×512 ikon, 1024×500 kapak
4. **Content rating** anketini doldur
5. **Data safety** formu — burası kritik, aşağıya bak
6. **Gizlilik politikası URL'i** zorunlu (konum topladığın için)
7. Production → Create release → AAB'yi yükle → İncelemeye gönder

İlk yayında Google 3–7 gün inceleme yapıyor. Yeni geliştirici hesaplarında
20 kişilik kapalı test zorunluluğu var (14 gün) — önce internal/closed track'ten başla.

### Data safety formunda beyan etmen gerekenler

- Konum (yaklaşık ve kesin) — uygulama işlevi için, paylaşılmıyor
- E-posta adresi — hesap yönetimi için
- Fotoğraf — profil için
- Mesajlar — uygulama içi, kalıcı saklanmıyor

Yanlış beyan uygulamanın kaldırılmasına yol açıyor, dikkatli doldur.

---

## 4. Yapılacaklar

Dokuz ekran da bağlı ve çalışır durumda. Kalan eksikler:

- [ ] Profil fotoğrafı yükleme + AI/sahte fotoğraf tespiti
- [ ] Play Console: arka plan konum izni beyanı ve tanıtım videosu
- [ ] Moderasyon paneli (şikayetleri inceleme)

## Yasal metinler

`legal/` klasöründe üç dosya var:

- `gizlilik-politikasi.md` — KVKK aydınlatma metni
- `kullanim-sartlari.md` — yasaklı ürünler, sorumluluk reddi, ban politikası
- `acik-riza-ve-beyanlar.md` — kayıt ekranı onay metinleri ve Play Console
  Data safety formu cevapları

`docs/` klasörü bu metinlerin GitHub Pages'te yayınlanacak sürümüdür.
Kurulum adımları `docs/YAYINLAMA.md` içinde.

Köşeli parantezli alanları doldurman gerekiyor (ad, adres, e-posta, şehir).

Bu metinler avukat incelemesinden geçmedi. Yayına almadan önce inceletmen
önerilir.

## Fotoğraflar

Ürün ve iş fotoğrafları üçüncü parti servise yüklenmiyor. `deal_photos`
tablosunda saklanıyor ve anlaşma kapandığında mesajlarla birlikte
siliniyor. Kalıcı olmadıkları için depolama maliyeti oluşmuyor.

Fotoğraf 0.4 kalitede çekiliyor, sunucu 900 KB üstünü reddediyor.
Erişim korumalı — sadece anlaşmanın iki tarafı görebiliyor.

Uygulama büyür ve fotoğraflar kalıcı hale gelmesi gerekirse (örneğin
şikayet kanıtı olarak saklanması), o zaman bir nesne deposuna taşınmalı.
Şu haliyle Neon'un ücretsiz katmanı fazlasıyla yeterli.

## Notlar

**Konum gizliliği:** `requests` tablosunda iki konum kolonu var. `approx_location`
haritada herkese görünen ~200m kaydırılmış konum, `exact_location` sadece eşleşme
sonrası açılıyor. Bu ayrımı bozma — tek kolona indirirsen kullanıcıların ev adresleri
haritada açığa çıkar.

**Ban mantığı:** Düşük puan tek başına ban sebebi değil; şikayet de gerekiyor ve
en az 5 tamamlanmış işlem şartı var. Bu, kötü niyetli kullanıcıların rakiplerini
iki düşük puanla banlatmasını engelliyor.

**Puan görünürlüğü:** Puanlar iki taraf da verene kadar (ya da 24 saat geçene kadar)
gizli. Misilleme puanlamasını önlüyor.

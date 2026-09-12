# AAB'ye hazır hale getirme — adım adım

Her adımı sırayla yap. Bir öncekini bitirmeden diğerine geçme.

---

## ADIM 1 — Veritabanı (15 dk)

1. https://neon.tech → GitHub ile giriş yap
2. Create project → adı `komsuda`, bölge `Europe (Frankfurt)`
3. Açılan SQL Editor'e yaz ve çalıştır:
   ```sql
   CREATE EXTENSION postgis;
   ```
4. Dashboard → Connection string → kopyala (`postgresql://...` ile başlar)
5. Terminalde:
   ```bash
   cd backend
   npm install
   ```
6. `.env` dosyası oluştur:
   ```bash
   cp .env.example .env
   ```
7. `.env` içine `DATABASE_URL` olarak Neon stringini yapıştır
8. `JWT_SECRET` için rastgele bir değer üret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
9. Şemayı yükle:
   ```bash
   npm run migrate
   ```
10. Kontrol: Neon SQL Editor'de `SELECT COUNT(*) FROM categories;` → 44 dönmeli

**Bu adım bitti mi:** Neon'da tablolar görünüyor ve kategoriler dolu.

---

## ADIM 2 — Mail (10 dk)

1. https://brevo.com → ücretsiz hesap aç
2. Sağ üst → SMTP & API → API Keys → Create a new API key
3. Anahtarı kopyala, `.env` içine `BREVO_API_KEY=` olarak yaz
4. Senders, Domains & Dedicated IPs → Senders → Add a sender
5. Kendi e-posta adresini gir, gelen doğrulama mailindeki linke bas
6. `.env` içinde `MAIL_FROM_EMAIL` değerini o adrese çevir

**Bu adım bitti mi:** Brevo panelinde gönderici adresin "Verified" görünüyor.

---

## ADIM 3 — Backend'i yayına al (20 dk)

1. Repoyu GitHub'a push et (henüz yapmadıysan):
   ```bash
   cd ..
   git init && git add . && git commit -m "İlk sürüm"
   git branch -M main
   git remote add origin https://github.com/KULLANICI_ADIN/komsuda.git
   git push -u origin main
   ```
2. https://render.com → GitHub ile giriş → New → Web Service
3. Repoyu seç, ayarlar:

   | Alan | Değer |
   |---|---|
   | Root Directory | `backend` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |
   | Instance Type | Free |

4. Environment bölümüne `.env` içindeki tüm değerleri tek tek ekle:
   `DATABASE_URL`, `JWT_SECRET`, `BREVO_API_KEY`, `MAIL_FROM_EMAIL`,
   `MAIL_FROM_NAME`
5. Deploy bitince URL'i kopyala (`https://komsuda-backend.onrender.com` gibi)
6. Render Environment'a bir tane daha ekle: `PUBLIC_URL` = o URL
7. Test et:
   ```bash
   curl https://SENIN-URL.onrender.com/health
   ```
   `{"ok":true}` dönmeli

**Bu adım bitti mi:** `/health` cevap veriyor.

> Not: Render ücretsiz katmanda 15 dakika trafik olmazsa uyur, ilk istek
> 30-50 saniye sürer. Test ederken şaşırma.

---

## ADIM 4 — Ses dosyaları (15 dk)

`mobile/assets/sounds/` içine üç dosya koy:

| Dosya | İçerik |
|---|---|
| `zil.wav` | Ding-dong, normal istek |
| `zil_acil.wav` | Hızlı ding-ding-dong, acil |
| `zil_tek.wav` | Tek ding, teklif geldi |

**Kural:** wav formatı, sadece küçük harf/rakam/alt çizgi, 2 saniyeden kısa.

Kaynak: freesound.org → arama "doorbell" → License filtresi "Creative
Commons 0". İndirdiğin mp3 ise online bir dönüştürücüyle wav yap.

**Bu adım bitti mi:** Üç dosya da klasörde ve adları tam olarak yukarıdaki gibi.

---

## ADIM 5 — Yasal metinler (20 dk)

`docs/` içindeki üç dosyada köşeli parantezleri doldur:

- `[TARİH]` → bugünün tarihi
- `[AD SOYAD / ŞİRKET ÜNVANI]` → adın soyadın
- `[E-POSTA ADRESİ]` → uygulama için açtığın adres
- `[AÇIK ADRES]` → tebligat adresi

Sonra push et ve GitHub Pages'i aç:

1. Repo → Settings → Pages
2. Source: Deploy from a branch → Branch `main`, klasör `/docs` → Save
3. Birkaç dakika sonra kontrol et:
   `https://KULLANICI_ADIN.github.io/komsuda/gizlilik.html`

**Bu adım bitti mi:** Link tarayıcıda açılıyor.

---

## ADIM 6 — Uygulamayı derle (30 dk)

1. EAS kur ve giriş yap:
   ```bash
   npm install -g eas-cli
   eas login
   ```
2. Mobil klasörde:
   ```bash
   cd mobile
   npm install
   eas build:configure
   ```
   Bu komut `EAS_PROJECT_ID` üretir, `.env` içine yaz.
3. Backend adresini gizli değer olarak tanımla:
   ```bash
   eas secret:create --scope project --name API_URL \
     --value https://SENIN-URL.onrender.com
   ```
4. Önce test sürümü al (APK, telefona doğrudan kurulur):
   ```bash
   npm run build:preview
   ```
5. Link gelince APK'yı telefonuna indir, kur, dene.

**Şunları test et:**
- Kayıt ol, doğrulama maili geliyor mu
- Linke bas, uygulama otomatik geçiyor mu
- Harita açılıyor mu, pinler görünüyor mu
- İstek oluştur, bildirim geliyor mu
- İkinci bir telefondan teklif ver, seç, anlaşmayı tamamla

**Bu adım bitti mi:** Tüm akış çalışıyor.

---

## ADIM 7 — AAB üret (15 dk)

Test tamamsa yayın sürümünü al:

```bash
npm run build:production
```

Bu bir `.aab` dosyası üretir ve indirme linki verir. İndir.

**Bu adım bitti mi:** Elinde `.aab` dosyası var.

---

## ADIM 8 — Play Console (45 dk)

1. https://play.google.com/console → Create app
   - App name: `Komşuda`
   - Default language: Türkçe
   - App or game: App
   - Free or paid: Free

2. **Store listing** doldur:
   - Kısa açıklama (80 karakter): "Yakınındaki komşulardan acil ihtiyacını karşıla."
   - Uzun açıklama: ne yaptığını anlat, yasaklı ürünlerden bahset
   - App icon: `mobile/assets/icon.png`
   - Feature graphic: `mobile/assets/feature-graphic.png`
   - Ekran görüntüleri: en az 2 tane (telefondan çek)

3. **Content rating** anketini doldur (kullanıcılar arası iletişim var → belirt)

4. **Data safety** — `docs/acik-riza-ve-beyanlar.md` içindeki tabloya göre doldur.
   Yanlış beyan uygulamanın kaldırılma sebebi.

5. **App access** — hesap gerekiyor, test için bir kullanıcı adı/şifre ver

6. **Privacy policy** URL'ini gir:
   `https://KULLANICI_ADIN.github.io/komsuda/gizlilik.html`

7. **Data deletion** URL'ini gir:
   `https://KULLANICI_ADIN.github.io/komsuda/hesap-silme.html`

8. Production → Create new release → AAB'yi yükle → Review → Rollout

**Bu adım bitti mi:** İnceleme sürecinde görünüyor.

---

## Sonrası

İnceleme genelde 3-7 gün sürüyor. Reddedilirse sebep mail ile gelir,
düzeltip tekrar gönderirsin — sık sebepler: eksik gizlilik politikası,
Data safety uyuşmazlığı, izin açıklamalarının yetersizliği.

Wayy zaten yayında olduğu için yeni geliştirici hesaplarına uygulanan
20 test kullanıcısı ve 14 gün bekleme şartı sana uygulanmaz.

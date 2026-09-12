# Açık Rıza Metni ve Play Store Beyanları

---

## Bölüm 1 — Uygulama içinde gösterilecek açık rıza metni

Kayıt ekranında, ayrı ayrı işaretlenebilir kutucuklar olarak sunulmalıdır.
Tek bir "hepsini kabul ediyorum" kutusu KVKK açısından geçerli değildir.

### Kutu 1 — Zorunlu (sözleşmenin ifası)

> Kullanım Şartları'nı ve Gizlilik Politikası'nı okudum, kabul ediyorum.
> 18 yaşından büyük olduğumu beyan ederim.

### Kutu 2 — Açık rıza: konum

> Yakınımdaki istekleri görebilmem ve isteklerimin yakınımdakilere
> ulaşabilmesi için konum verimin işlenmesine izin veriyorum.
>
> Haritada diğer kullanıcılara yaklaşık 200 metre kaydırılmış konumum
> gösterilir. Kesin konumum yalnızca anlaştığım kişiyle paylaşılır.

### Kutu 3 — Açık rıza: yurt dışına aktarım

> Uygulamanın sunucu, veritabanı, harita ve bildirim altyapısının yurt
> dışında bulunması sebebiyle kişisel verilerimin yurt dışına
> aktarılmasına izin veriyorum.

### Kutu 4 — İsteğe bağlı: bildirim

> Yakınımda yeni bir istek oluştuğunda bildirim almak istiyorum.
> Bu izni daha sonra ayarlardan kapatabilirim.

---

## Bölüm 2 — Play Console "Data safety" formu cevapları

Yanlış beyan uygulamanın kaldırılmasına yol açar. Aşağıdaki tablo,
uygulamanın gerçekte topladığı verilere göre hazırlanmıştır.

### Toplanan veri türleri

| Kategori | Toplanıyor mu | Paylaşılıyor mu | Zorunlu mu | Amaç |
|---|---|---|---|---|
| Yaklaşık konum | Evet | Evet (diğer kullanıcılara) | Evet | Uygulama işlevi |
| Kesin konum | Evet | Evet (yalnızca eşleşilen kullanıcıya) | Evet | Uygulama işlevi |
| E-posta adresi | Evet | Hayır | Evet | Hesap yönetimi |
| Kullanıcı adı | Evet | Evet | Evet | Uygulama işlevi |
| Fotoğraf | Evet | Evet | Hayır | Uygulama işlevi |
| Uygulama içi mesajlar | Evet | Hayır | Hayır | Uygulama işlevi |
| Cihaz kimliği (push token) | Evet | Hayır | Hayır | Uygulama işlevi |

### Güvenlik uygulamaları — işaretlenecekler

- [x] Veriler aktarım sırasında şifreleniyor
- [x] Kullanıcı verilerinin silinmesini talep edebiliyor
- [ ] Veriler üçüncü taraflara satılıyor — **hayır**

### Silme talebi bağlantısı

Play Console, hesap silme için erişilebilir bir yol ister. İki şartı da
karşıla:

1. Uygulama içi: Profil → Ayarlar → Hesabımı sil
2. Web üzerinden: [SİLME TALEP SAYFASI URL'İ]

---

## Bölüm 3 — Barındırma

Play Console, gizlilik politikası için **herkese açık ve doğrudan erişilebilir
bir URL** ister. Uygulama içi ekran yeterli değildir.

Ücretsiz seçenekler:

- GitHub Pages — repoya `docs/` klasörü açıp markdown dosyalarını koy,
  Settings → Pages'ten yayınla
- Notion — sayfayı herkese açık yap, linki kullan
- Render static site — mevcut backend hesabında ek ücret yok

Örnek URL yapısı:

```
https://[alan-adin]/gizlilik
https://[alan-adin]/kullanim-sartlari
https://[alan-adin]/hesap-silme
```

---

## Bölüm 4 — Doldurulması gereken alanlar

Metinlerde köşeli parantez içinde bırakılan yerler:

- `[TARİH]` — yayın tarihi
- `[AD SOYAD / ŞİRKET ÜNVANI]` — veri sorumlusu kimliği
- `[E-POSTA ADRESİ]` — KVKK başvuru ve iletişim adresi
- `[AÇIK ADRES]` — veri sorumlusunun adresi (KVKK zorunlu)
- `Manisa` — yetkili mahkeme
- `[Sunucu sağlayıcı]`, `[Veritabanı sağlayıcı]` — kullandığın servisler
- `[SİLME TALEP SAYFASI URL'İ]` — hesap silme sayfası

**Şahıs olarak mı şirket olarak mı yayınlayacağın önemli.** Şahıs olarak
yayınlarsan kendi ad, adres ve e-postanı yazman gerekir ve bunlar herkese
açık olur. Bu rahatsız ediciyse şahıs şirketi kurmak veya en azından ayrı
bir e-posta ve tebligat adresi kullanmak mantıklı olur.

---

> Bu metinler genel bilgilendirme amaçlıdır ve hukuki danışmanlık yerine
> geçmez. Yayına almadan önce bir avukata inceletmeniz önerilir.

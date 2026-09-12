# GitHub'a yükleme ve yasal metinleri yayınlama

## 1. Repoyu oluştur

GitHub'da yeni bir repo aç: `komsuda`

Private yapabilirsin — GitHub Pages ücretsiz hesaplarda sadece public
repolarda çalışır, ama Pro hesabın varsa private repoda da çalışır. Emin
değilsen public başla, kod zaten hassas bilgi içermiyor (`.env` gitignore'da).

## 2. Yükle

```bash
cd komsuda
git init
git add .
git commit -m "İlk sürüm"
git branch -M main
git remote add origin https://github.com/fbural32/komsuda.git
git push -u origin main
```

`.gitignore` hazır — `node_modules`, `.env`, build çıktıları ve
`play-service-account.json` dışarıda kalır.

## 3. GitHub Pages'i aç

1. Repo → Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `main`, klasör: **`/docs`**
4. Save

Birkaç dakika sonra adreslerin hazır olur:

```
https://fbural32.github.io/komsuda/
https://fbural32.github.io/komsuda/gizlilik.html
https://fbural32.github.io/komsuda/kullanim-sartlari.html
https://fbural32.github.io/komsuda/hesap-silme.html
```

`docs/` içindeki markdown dosyaları otomatik HTML'e çevrilir. Metni
değiştirmek istediğinde markdown'ı düzenleyip push etmen yeterli.

## 4. Play Console'a gir

| Alan | Değer |
|---|---|
| Privacy policy URL | `https://fbural32.github.io/komsuda/gizlilik.html` |
| Account deletion URL | `https://fbural32.github.io/komsuda/hesap-silme.html` |

Hesap silme bağlantısı Play Console'da **Data safety → Data deletion**
bölümünde isteniyor. Uygulama içi silme seçeneği de var, ikisini birden
beyan edebilirsin.

## 5. Doldurulacak alanlar

Yayınlamadan önce `docs/` içindeki dosyalarda köşeli parantezleri değiştir:

- `[TARİH]`
- `[AD SOYAD / ŞİRKET ÜNVANI]` → kendi adın
- `[E-POSTA ADRESİ]` → uygulama için açtığın ayrı adres
- `[AÇIK ADRES]` → posta kutusu veya tebligat adresi
- `Manisa` → Manisa
- `[Sunucu sağlayıcı]` → Render
- `[Veritabanı sağlayıcı]` → Neon

Tek seferde değiştirmek için:

```bash
cd docs
sed -i 's/\[ŞEHİR\]/Manisa/g; s/\[Sunucu sağlayıcı, ör. Render\]/Render/g' *.md
```

Kalanları elle doldur — ad ve adres gibi alanları yanlış yazmak istemezsin.

## 6. Metinleri güncel tut

`legal/` klasörü kaynak, `docs/` yayınlanan sürüm. İkisini ayrı tutmak
karışıklık yaratıyorsa `legal/` klasörünü silip sadece `docs/` ile devam
edebilirsin — içerik aynı, tek fark Jekyll front matter satırları.

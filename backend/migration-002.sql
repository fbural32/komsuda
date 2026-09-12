-- Komşuda migration 002
-- Hizmet kategorileri, saatlik fiyat, ürün fotoğrafı onayı
-- Neon SQL Editor'e yapıştır ve çalıştır.

-- ---------------------------------------------------------------
-- 1. Kategoriler: eşya / hizmet ayrımı
-- ---------------------------------------------------------------
ALTER TABLE categories ADD COLUMN IF NOT EXISTS tur text NOT NULL DEFAULT 'esya'
  CHECK (tur IN ('esya','hizmet'));

-- ---------------------------------------------------------------
-- 2. İstekler: fiyat tipi ve hizmet bayrağı
-- ---------------------------------------------------------------
ALTER TABLE requests ADD COLUMN IF NOT EXISTS fiyat_tipi text NOT NULL DEFAULT 'toplam'
  CHECK (fiyat_tipi IN ('toplam','saatlik'));

-- ---------------------------------------------------------------
-- 3. Anlaşma: fotoğraf onayı ve esnek süre
-- Süre artık 10-120 dk arası olabilir (hizmetlerde varış süresi uzun)
-- ---------------------------------------------------------------
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_duration_minutes_check;
ALTER TABLE deals ADD CONSTRAINT deals_duration_minutes_check
  CHECK (duration_minutes IN (10,15,20,30,60,120));

ALTER TABLE deals ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS photo_confirmed boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------
-- 4. Mesajlar: görsel paylaşımı
-- ---------------------------------------------------------------
ALTER TABLE messages ADD COLUMN IF NOT EXISTS photo_url text;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_check;
ALTER TABLE messages ADD CONSTRAINT messages_check
  CHECK (canned_reply_id IS NOT NULL OR shared_location IS NOT NULL OR photo_url IS NOT NULL);

-- ---------------------------------------------------------------
-- 5. Yeni eşya kategorileri
-- ---------------------------------------------------------------
INSERT INTO categories (name, grup, icon, sort_order, is_urgent_allowed, tur) VALUES
  ('Kamp sandalyesi',    'Dış mekan',  'chair',     80,  false, 'esya'),
  ('Katlanır masa',      'Dış mekan',  'table',     81,  false, 'esya'),
  ('Termos',             'Dış mekan',  'cup',       82,  false, 'esya'),
  ('Soğutucu çanta',     'Dış mekan',  'box',       83,  false, 'esya'),
  ('Mangal',             'Dış mekan',  'flame',     84,  false, 'esya'),
  ('Şişme yatak',        'Dış mekan',  'bed',       85,  false, 'esya'),
  ('Uyku tulumu',        'Dış mekan',  'bed',       86,  false, 'esya'),
  ('Bisiklet pompası',   'Dış mekan',  'bike',      87,  false, 'esya'),

  ('Valiz',              'Yolculuk',   'suitcase',  90,  false, 'esya'),
  ('Araç takviye kablosu','Yolculuk',  'car',       91,  true,  'esya'),
  ('Kriko',              'Yolculuk',   'car',       92,  true,  'esya'),
  ('Bidon',              'Yolculuk',   'droplet',   93,  false, 'esya'),
  ('Buz kazıyıcı',       'Yolculuk',   'snowflake', 94,  false, 'esya'),

  ('Süpürge',            'Ev',         'broom',     100, false, 'esya'),
  ('Ütü',                'Ev',         'shirt',     101, false, 'esya'),
  ('Askı',               'Ev',         'hanger',    102, false, 'esya'),
  ('Yastık / nevresim',  'Ev',         'bed',       103, false, 'esya'),
  ('Vantilatör',         'Ev',         'wind',      104, false, 'esya'),
  ('Elektrikli ısıtıcı', 'Ev',         'flame',     105, true,  'esya'),
  ('Terlik',             'Ev',         'shoe',      106, false, 'esya'),

  ('Tabure',             'Alet',       'chair',     110, false, 'esya'),
  ('Testere',            'Alet',       'tool',      111, false, 'esya'),
  ('Su terazisi',        'Alet',       'ruler',     112, false, 'esya'),
  ('Metre',              'Alet',       'ruler',     113, false, 'esya'),
  ('Boya fırçası',       'Alet',       'brush',     114, false, 'esya'),
  ('Silikon tabancası',  'Alet',       'tool',      115, false, 'esya');

-- ---------------------------------------------------------------
-- 6. Hizmet kategorileri
-- Fiyat saatlik girilir. Süre = ustanın varış süresi.
-- ---------------------------------------------------------------
INSERT INTO categories (name, grup, icon, sort_order, is_urgent_allowed, tur) VALUES
  ('Boyacı',             'Tadilat',    'brush',     200, false, 'hizmet'),
  ('Parkeci',            'Tadilat',    'square',    201, false, 'hizmet'),
  ('Fayansçı',           'Tadilat',    'square',    202, false, 'hizmet'),
  ('Alçıpancı',          'Tadilat',    'square',    203, false, 'hizmet'),
  ('Marangoz',           'Tadilat',    'hammer',    204, false, 'hizmet'),

  ('Tesisatçı',          'Tamirat',    'droplet',   210, true,  'hizmet'),
  ('Elektrikçi',         'Tamirat',    'bolt',      211, true,  'hizmet'),
  ('Kombi bakımı',       'Tamirat',    'flame',     212, true,  'hizmet'),
  ('Klima bakımı',       'Tamirat',    'wind',      213, false, 'hizmet'),
  ('Beyaz eşya tamiri',  'Tamirat',    'tool',      214, false, 'hizmet'),
  ('Çilingir',           'Tamirat',    'key',       215, true,  'hizmet'),
  ('Cam / ayna',         'Tamirat',    'square',    216, false, 'hizmet'),

  ('Ev temizliği',       'Temizlik',   'spray',     220, false, 'hizmet'),
  ('Koltuk yıkama',      'Temizlik',   'spray',     221, false, 'hizmet'),
  ('Halı yıkama',        'Temizlik',   'spray',     222, false, 'hizmet'),
  ('Cam silme',          'Temizlik',   'spray',     223, false, 'hizmet'),

  ('Nakliye / hamal',    'Taşıma',     'truck',     230, false, 'hizmet'),
  ('Montaj (mobilya)',   'Taşıma',     'hammer',    231, false, 'hizmet'),
  ('Askı / raf montajı', 'Taşıma',     'hammer',    232, false, 'hizmet'),

  ('Bahçe / budama',     'Diğer iş',   'leaf',      240, false, 'hizmet'),
  ('Evcil hayvan gezdirme','Diğer iş', 'paw',       241, false, 'hizmet'),
  ('Bilgisayar tamiri',  'Diğer iş',   'device',    242, false, 'hizmet'),
  ('Özel ders',          'Diğer iş',   'book',      243, false, 'hizmet');

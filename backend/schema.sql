-- Komşuda — veritabanı şeması (PostgreSQL + PostGIS)
-- Kurulum: psql $DATABASE_URL -f schema.sql

CREATE EXTENSION IF NOT EXISTS postgis;


-- ---------------------------------------------------------------
-- Kullanıcılar
-- ---------------------------------------------------------------
CREATE TABLE users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text UNIQUE NOT NULL,
  password_hash     text NOT NULL,
  display_name      text NOT NULL,
  photo_url         text,
  email_verified_at timestamptz,
  photo_verified_at timestamptz,
  rating_avg        numeric(3,2) DEFAULT 0,
  rating_count      int DEFAULT 0,
  deal_count        int DEFAULT 0,
  warning_count     int DEFAULT 0,
  status            text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','warned','banned')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Mail doğrulama linkleri
CREATE TABLE email_tokens (
  token      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz
);

-- Cihazlar: bildirim tokenı + son bilinen konum
CREATE TABLE devices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token             text UNIQUE NOT NULL,
  notifications_enabled boolean NOT NULL DEFAULT true,
  last_location         geography(Point,4326),
  location_updated_at   timestamptz,
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX devices_location_idx ON devices USING GIST (last_location);

-- ---------------------------------------------------------------
-- İstek menüsü (uygulama güncellemesi olmadan kategori eklenebilsin)
-- ---------------------------------------------------------------
CREATE TABLE categories (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  grup       text NOT NULL DEFAULT 'Diğer',
  icon       text,
  sort_order int NOT NULL DEFAULT 0,
  -- Acil mod yalnızca bu kategorilerde açılabilir.
  -- Ölçüt: yokluğu bir işi tamamen durduruyor ve sabaha bekleyemez.
  is_urgent_allowed boolean NOT NULL DEFAULT false,
  is_active  boolean NOT NULL DEFAULT true
);

-- Gıda, içecek, alkol, sigara ve ilaç kategorileri bilerek yok (kullanım şartları).
-- is_urgent_allowed: yokluğu bir işi tamamen durduran, sabaha bekleyemeyen şeyler.
INSERT INTO categories (name, grup, icon, sort_order, is_urgent_allowed) VALUES
  -- Elektrik
  ('Ampul',              'Elektrik',  'bulb',      1,  true),
  ('Sigorta',            'Elektrik',  'bolt',      2,  true),
  ('Üçlü priz',          'Elektrik',  'plug',      3,  false),
  ('Uzatma kablosu',     'Elektrik',  'cable',     4,  false),
  ('Pil (AA / AAA)',     'Elektrik',  'battery',   5,  true),
  ('El feneri',          'Elektrik',  'flashlight',6,  true),

  -- Telefon
  ('Şarj kablosu',       'Telefon',   'cable',     10, true),
  ('Şarj adaptörü',      'Telefon',   'plug',      11, true),
  ('Powerbank',          'Telefon',   'battery',   12, true),

  -- Ev
  ('Tüp',                'Ev',        'flame',     20, true),
  ('Tuvalet kağıdı',     'Ev',        'tissue',    21, true),
  ('Kağıt havlu',        'Ev',        'tissue',    22, false),
  ('Peçete',             'Ev',        'tissue',    23, false),
  ('Çöp poşeti',         'Ev',        'trash',     24, false),
  ('Bulaşık deterjanı',  'Ev',        'droplet',   25, false),
  ('Çamaşır deterjanı',  'Ev',        'droplet',   26, false),
  ('Sünger / bez',       'Ev',        'square',    27, false),
  ('Mum',                'Ev',        'flame',     28, true),
  ('Kibrit / çakmak',    'Ev',        'lighter',   29, false),
  ('Battaniye',          'Ev',        'bed',       30, false),

  -- Kişisel bakım
  ('Bebek bezi',         'Kişisel',   'baby',      40, true),
  ('Islak mendil',       'Kişisel',   'tissue',    41, true),
  ('Kadın hijyen ürünü', 'Kişisel',   'heart',     42, true),
  ('Sabun / şampuan',    'Kişisel',   'droplet',   43, false),
  ('Diş fırçası',        'Kişisel',   'brush',     44, false),
  ('Diş macunu',         'Kişisel',   'brush',     45, false),
  ('Tıraş bıçağı',       'Kişisel',   'razor',     46, false),

  -- Alet
  ('Tornavida',          'Alet',      'tool',      50, false),
  ('Pense',              'Alet',      'tool',      51, false),
  ('Çekiç',              'Alet',      'hammer',    52, false),
  ('Koli bandı',         'Alet',      'tape',      53, false),
  ('İzole bant',         'Alet',      'tape',      54, false),
  ('İp / sicim',         'Alet',      'rope',      55, false),
  ('Merdiven',           'Alet',      'ladder',    56, false),
  ('Matkap',             'Alet',      'drill',     57, false),

  -- Kırtasiye
  ('Kalem',              'Kırtasiye', 'pencil',    60, false),
  ('Zarf',               'Kırtasiye', 'mail',      61, false),
  ('Yapıştırıcı',        'Kırtasiye', 'glue',      62, false),
  ('A4 kağıt',           'Kırtasiye', 'file',      63, false),

  -- Diğer
  ('Şemsiye',            'Diğer',     'umbrella',  70, false),
  ('Yağmurluk',          'Diğer',     'umbrella',  71, false),
  ('Bebek arabası',      'Diğer',     'baby',      72, false),
  ('Kedi kumu',          'Diğer',     'paw',       73, false),
  ('Tasma',              'Diğer',     'paw',       74, false);

-- ---------------------------------------------------------------
-- İstekler
-- approx_location = haritada herkese görünen kaydırılmış konum (~200m)
-- exact_location  = sadece eşleşme sonrası açılan gerçek konum
-- ---------------------------------------------------------------
CREATE TABLE requests (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id      int  NOT NULL REFERENCES categories(id),
  price            int  NOT NULL CHECK (price BETWEEN 50 AND 2000),
  is_urgent        boolean NOT NULL DEFAULT false,
  approx_location  geography(Point,4326) NOT NULL,
  exact_location   geography(Point,4326) NOT NULL,
  status           text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','matched','completed','cancelled','expired')),
  last_notified_at timestamptz,
  -- Vazgeçen/gelmeyen kullanıcılar. Tekrar yayında bu listeyi devralır.
  blocked_user_ids uuid[] NOT NULL DEFAULT '{}',
  -- Tekrar yayınlandıysa hangi istekten türediği
  parent_request_id uuid REFERENCES requests(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX requests_approx_idx ON requests USING GIST (approx_location);
CREATE INDEX requests_status_idx ON requests (status, created_at DESC);
CREATE INDEX requests_urgent_idx ON requests (requester_id, is_urgent, created_at DESC);

-- ---------------------------------------------------------------
-- Teklifler — aynı anda en fazla 3 kişi. İstek sahibi aralarından seçer.
-- ---------------------------------------------------------------
CREATE TABLE responses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id      uuid NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  responder_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stock_confirmed boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','selected','rejected','withdrawn')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, responder_id)
);
CREATE INDEX responses_request_idx ON responses (request_id, status);

-- ---------------------------------------------------------------
-- Anlaşma (el sıkışma + sayaç)
-- Süre kuralı: 10/15/20 dk. Ek süre tek seferlik, toplam tavan 20 dk.
-- ---------------------------------------------------------------
CREATE TABLE deals (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id           uuid NOT NULL UNIQUE REFERENCES requests(id) ON DELETE CASCADE,
  responder_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  price_ok_requester   boolean NOT NULL DEFAULT false,
  price_ok_responder   boolean NOT NULL DEFAULT false,
  duration_minutes     int CHECK (duration_minutes IN (10,15,20)),
  duration_proposed_by uuid REFERENCES users(id),
  duration_confirmed   boolean NOT NULL DEFAULT false,
  extension_used       boolean NOT NULL DEFAULT false,
  timer_started_at     timestamptz,
  timer_ends_at        timestamptz,
  status               text NOT NULL DEFAULT 'negotiating'
                       CHECK (status IN ('negotiating','running','completed','cancelled')),
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- Mesajlar — serbest metin YOK.
-- Her satırda ya canned_reply_id ya shared_location dolu olur.
-- Anlaşma kapanınca silinir.
-- ---------------------------------------------------------------
CREATE TABLE canned_replies (
  id         serial PRIMARY KEY,
  text       text NOT NULL,
  side       text NOT NULL CHECK (side IN ('requester','responder','both')),
  "group"    text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active  boolean NOT NULL DEFAULT true
);

INSERT INTO canned_replies (text, side, "group", sort_order) VALUES
  ('Ürün bende, dolu',  'responder', 'stok',   1),
  ('Fiyat uygun',       'both',      'fiyat',  2),
  ('Fiyat onaylandı',   'both',      'fiyat',  3),
  ('Yoldayım',          'responder', 'yol',    4),
  ('Kapıdayım',         'responder', 'yol',    5),
  ('Biraz gecikeceğim', 'responder', 'yol',    6),
  ('Ulaşamadım',        'both',      'sorun',  7),
  ('Aşağı iniyorum',    'requester', 'yol',    8),
  ('Teslim aldım',      'requester', 'bitis',  9),
  ('Teslim ettim',      'responder', 'bitis', 10),
  ('Vazgeçtim',         'both',      'iptal', 11);

CREATE TABLE messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id         uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  canned_reply_id int REFERENCES canned_replies(id),
  shared_location geography(Point,4326),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CHECK (canned_reply_id IS NOT NULL OR shared_location IS NOT NULL)
);
CREATE INDEX messages_deal_idx ON messages (deal_id, created_at);

-- ---------------------------------------------------------------
-- Puanlama — visible_at ile misilleme koruması
-- ---------------------------------------------------------------
CREATE TABLE ratings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id    uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  rater_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ratee_id   uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars      int  NOT NULL CHECK (stars BETWEEN 1 AND 5),
  tags       text[],
  comment    text,
  visible_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deal_id, rater_id)
);

-- ---------------------------------------------------------------
-- Şikayet + uyarı geçmişi
-- ---------------------------------------------------------------
CREATE TABLE reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id     uuid REFERENCES deals(id) ON DELETE SET NULL,
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason      text NOT NULL,
  status      text NOT NULL DEFAULT 'open'
              CHECK (status IN ('open','reviewed','dismissed','actioned')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_warnings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------
-- Puan ortalamasını otomatik güncelle
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_user_rating() RETURNS trigger AS $$
BEGIN
  UPDATE users u SET
    rating_avg = COALESCE((
      SELECT ROUND(AVG(stars)::numeric, 2) FROM ratings
      WHERE ratee_id = NEW.ratee_id AND visible_at IS NOT NULL
    ), 0),
    rating_count = (
      SELECT COUNT(*) FROM ratings
      WHERE ratee_id = NEW.ratee_id AND visible_at IS NOT NULL
    )
  WHERE u.id = NEW.ratee_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ratings_refresh
AFTER INSERT OR UPDATE ON ratings
FOR EACH ROW EXECUTE FUNCTION refresh_user_rating();

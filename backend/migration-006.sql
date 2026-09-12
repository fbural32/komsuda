-- Komşuda migration 006
-- Kategori listesi genişletildi.
-- Gıda, içecek, alkol, sigara ve ilaç bilerek yok (kullanım şartları).

INSERT INTO categories (name, grup, icon, sort_order, is_urgent_allowed, tur) VALUES
  -- Bilgisayar ve elektronik
  ('Mouse',                 'Elektronik', 'mouse',     300, false, 'esya'),
  ('Klavye',                'Elektronik', 'keyboard',  301, false, 'esya'),
  ('USB bellek',            'Elektronik', 'usb',       302, false, 'esya'),
  ('HDMI kablosu',          'Elektronik', 'cable',     303, false, 'esya'),
  ('Ethernet kablosu',      'Elektronik', 'cable',     304, false, 'esya'),
  ('Kulaklık',              'Elektronik', 'headphones',305, false, 'esya'),
  ('Hoparlör',              'Elektronik', 'speaker',   306, false, 'esya'),
  ('Webcam',                'Elektronik', 'camera',    307, false, 'esya'),
  ('Uzaktan kumanda pili',  'Elektronik', 'battery',   308, false, 'esya'),
  ('Modem / router',        'Elektronik', 'wifi',      309, false, 'esya'),

  -- Mutfak gereçleri (gıda değil, alet)
  ('Düdüklü tencere',       'Mutfak',     'pot',       320, false, 'esya'),
  ('Tencere',               'Mutfak',     'pot',       321, false, 'esya'),
  ('Tava',                  'Mutfak',     'pot',       322, false, 'esya'),
  ('Blender',               'Mutfak',     'blender',   323, false, 'esya'),
  ('Mikser',                'Mutfak',     'blender',   324, false, 'esya'),
  ('Rende',                 'Mutfak',     'tool',      325, false, 'esya'),
  ('Kevgir / süzgeç',       'Mutfak',     'tool',      326, false, 'esya'),
  ('Fırın tepsisi',         'Mutfak',     'tray',      327, false, 'esya'),
  ('Kek kalıbı',            'Mutfak',     'tray',      328, false, 'esya'),
  ('Mutfak tartısı',        'Mutfak',     'scale',     329, false, 'esya'),
  ('Oklava',                'Mutfak',     'tool',      330, false, 'esya'),
  ('Semaver / çaydanlık',   'Mutfak',     'cup',       331, false, 'esya'),
  ('Kahve makinesi',        'Mutfak',     'cup',       332, false, 'esya'),
  ('Bardak / tabak seti',   'Mutfak',     'cup',       333, false, 'esya'),
  ('Konserve açacağı',      'Mutfak',     'tool',      334, false, 'esya'),
  ('Streç film / folyo',    'Mutfak',     'box',       335, false, 'esya'),

  -- Bebek ve çocuk
  ('Biberon',               'Bebek',      'baby',      340, true,  'esya'),
  ('Mama sandalyesi',       'Bebek',      'chair',     341, false, 'esya'),
  ('Bebek küveti',          'Bebek',      'droplet',   342, false, 'esya'),
  ('Oyun parkı',            'Bebek',      'box',       343, false, 'esya'),
  ('Termometre (bebek)',    'Bebek',      'thermometer',344, true, 'esya'),
  ('Buhar makinesi',        'Bebek',      'wind',      345, true,  'esya'),

  -- Giyim ve tekstil
  ('Şemsiye (yedek)',       'Giyim',      'umbrella',  350, false, 'esya'),
  ('Mont / kaban',          'Giyim',      'shirt',     351, false, 'esya'),
  ('Bere / atkı / eldiven', 'Giyim',      'shirt',     352, false, 'esya'),
  ('Yağmur çizmesi',        'Giyim',      'shoe',      353, false, 'esya'),
  ('Dikiş seti',            'Giyim',      'needle',    354, false, 'esya'),
  ('Ütü masası',            'Giyim',      'table',     355, false, 'esya'),
  ('Çamaşır ipi / mandal',  'Giyim',      'rope',      356, false, 'esya'),
  ('Kuru temizleme poşeti', 'Giyim',      'box',       357, false, 'esya'),

  -- Araç
  ('Araç şarj aleti',       'Araç',       'car',       360, true,  'esya'),
  ('Yedek lastik / stepne', 'Araç',       'car',       361, true,  'esya'),
  ('Cam suyu',              'Araç',       'droplet',   362, false, 'esya'),
  ('Antifriz',              'Araç',       'snowflake', 363, true,  'esya'),
  ('Çekme halatı',          'Araç',       'rope',      364, true,  'esya'),
  ('Reflektör / üçgen',     'Araç',       'triangle',  365, true,  'esya'),
  ('Zincir (kar)',          'Araç',       'snowflake', 366, true,  'esya'),

  -- Ev tamir ve hırdavat
  ('Vida / dübel',          'Hırdavat',   'tool',      370, false, 'esya'),
  ('Çivi',                  'Hırdavat',   'tool',      371, false, 'esya'),
  ('Zımpara',               'Hırdavat',   'tool',      372, false, 'esya'),
  ('Silikon / macun',       'Hırdavat',   'tool',      373, false, 'esya'),
  ('Boya rulosu',           'Hırdavat',   'brush',     374, false, 'esya'),
  ('Maskeleme bandı',       'Hırdavat',   'tape',      375, false, 'esya'),
  ('Eldiven (iş)',          'Hırdavat',   'hand',      376, false, 'esya'),
  ('Hortum',                'Hırdavat',   'droplet',   377, false, 'esya'),
  ('Lavabo pompası',        'Hırdavat',   'tool',      378, true,  'esya'),
  ('Kova / leğen',          'Hırdavat',   'box',       379, false, 'esya'),

  -- Evcil hayvan
  ('Mama kabı',             'Evcil',      'paw',       385, false, 'esya'),
  ('Taşıma kafesi',         'Evcil',      'box',       386, false, 'esya'),
  ('Kedi tuvaleti',         'Evcil',      'paw',       387, false, 'esya'),

  -- Etkinlik ve misafir
  ('Katlanır sandalye',     'Misafir',    'chair',     390, false, 'esya'),
  ('Ek yatak / şilte',      'Misafir',    'bed',       391, false, 'esya'),
  ('Servis tabağı',         'Misafir',    'tray',      392, false, 'esya'),
  ('Masa örtüsü',           'Misafir',    'table',     393, false, 'esya'),
  ('Doğum günü mumu',       'Misafir',    'flame',     394, false, 'esya'),
  ('Hediye paketi',         'Misafir',    'gift',      395, false, 'esya'),

  -- Spor ve hobi
  ('Bisiklet',              'Spor',       'bike',      400, false, 'esya'),
  ('Yoga matı',             'Spor',       'square',    401, false, 'esya'),
  ('Top',                   'Spor',       'ball',      402, false, 'esya'),
  ('Raket',                 'Spor',       'racket',    403, false, 'esya'),
  ('Balık malzemesi',       'Spor',       'fish',      404, false, 'esya'),

  -- Yeni hizmetler
  ('Kapı / kilit değişimi', 'Tamirat',    'key',       410, true,  'hizmet'),
  ('Perde montajı',         'Taşıma',     'hammer',    411, false, 'hizmet'),
  ('Televizyon montajı',    'Taşıma',     'device',    412, false, 'hizmet'),
  ('Doğalgaz tesisatı',     'Tamirat',    'flame',     413, true,  'hizmet'),
  ('Böcek ilaçlama',        'Temizlik',   'spray',     414, false, 'hizmet'),
  ('Baca temizliği',        'Temizlik',   'spray',     415, false, 'hizmet'),
  ('Su kaçağı tespiti',     'Tamirat',    'droplet',   416, true,  'hizmet'),
  ('Anahtar kopyalama',     'Diğer iş',   'key',       417, false, 'hizmet'),
  ('Ayakkabı tamiri',       'Diğer iş',   'shoe',      418, false, 'hizmet'),
  ('Terzi',                 'Diğer iş',   'needle',    419, false, 'hizmet'),
  ('Fotoğrafçı',            'Diğer iş',   'camera',    420, false, 'hizmet'),
  ('Çocuk bakımı',          'Diğer iş',   'baby',      421, false, 'hizmet'),
  ('Yaşlı refakati',        'Diğer iş',   'heart',     422, false, 'hizmet'),
  ('Taşıma yardımı (tek)',  'Taşıma',     'truck',     423, false, 'hizmet');

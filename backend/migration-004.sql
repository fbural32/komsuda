-- Komşuda migration 004
-- Hizmet kategorilerinde geri sayım yerine randevu

-- Randevu alanları
ALTER TABLE deals ADD COLUMN IF NOT EXISTS randevu_tarih date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS randevu_slot text
  CHECK (randevu_slot IN ('sabah','ogle','ikindi','aksam'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS randevu_teklif_eden uuid REFERENCES users(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS randevu_onaylandi boolean NOT NULL DEFAULT false;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS randevu_degisti boolean NOT NULL DEFAULT false;

-- 'scheduled' durumu: randevu kuruldu, gün bekleniyor
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_status_check;
ALTER TABLE deals ADD CONSTRAINT deals_status_check
  CHECK (status IN ('negotiating','running','scheduled','completed','cancelled'));

-- Hizmette süre kolonu kullanılmıyor, boş kalabilsin
ALTER TABLE deals ALTER COLUMN duration_minutes DROP NOT NULL;

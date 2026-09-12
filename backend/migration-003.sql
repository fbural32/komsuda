-- Komşuda migration 003
-- Hizmet süreleri 4 saate kadar uzatıldı
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_duration_minutes_check;
ALTER TABLE deals ADD CONSTRAINT deals_duration_minutes_check
  CHECK (duration_minutes IN (10,15,20,30,60,120,240));

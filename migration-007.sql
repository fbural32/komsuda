-- Komşuda migration 007
-- Eşya teslimat süreleri 15/20/30 dk oldu (yarıçap 10 km'ye çıktığı için)
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_duration_minutes_check;
ALTER TABLE deals ADD CONSTRAINT deals_duration_minutes_check
  CHECK (duration_minutes IN (15,20,30,60,120,240));

-- Komşuda migration 005
-- Fotoğraflar veritabanında tutulur. Anlaşma kapanınca silinir,
-- bu yüzden kalıcı depolama servisine gerek yok.

CREATE TABLE IF NOT EXISTS deal_photos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id    uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  sender_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mime       text NOT NULL DEFAULT 'image/jpeg',
  veri       bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS deal_photos_deal_idx ON deal_photos (deal_id);

-- photo_url artık fotoğraf kimliğini tutuyor
COMMENT ON COLUMN deals.photo_url IS 'deal_photos.id değeri';

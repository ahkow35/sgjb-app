CREATE TYPE price_source AS ENUM ('manual', 'barcode', 'scraper', 'admin');

ALTER TABLE price_entries
  ADD COLUMN source price_source NOT NULL DEFAULT 'manual';

UPDATE price_entries
SET source = 'scraper'
WHERE submitted_by IS NULL;

CREATE INDEX IF NOT EXISTS price_entries_submitted_by_idx
  ON price_entries (submitted_by);

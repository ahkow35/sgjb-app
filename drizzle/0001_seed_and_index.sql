-- Full-text search index on product name
CREATE INDEX IF NOT EXISTS products_name_fts ON products USING GIN (to_tsvector('english', name));

-- Quantity must be positive (not expressible via Drizzle schema, add manually)
ALTER TABLE price_entries ADD CONSTRAINT price_entries_quantity_check CHECK (quantity > 0);

-- Seed stores
INSERT INTO stores (name, country, city, type) VALUES
  ('FairPrice', 'SG', 'Singapore', 'supermarket'),
  ('Cold Storage', 'SG', 'Singapore', 'supermarket'),
  ('Giant SG', 'SG', 'Singapore', 'supermarket'),
  ('Watson SG', 'SG', 'Singapore', 'pharmacy'),
  ('Guardian SG', 'SG', 'Singapore', 'pharmacy'),
  ('AEON JB', 'MY', 'Johor Bahru', 'supermarket'),
  ('Giant JB', 'MY', 'Johor Bahru', 'supermarket'),
  ('Tesco JB', 'MY', 'Johor Bahru', 'supermarket'),
  ('Watson JB', 'MY', 'Johor Bahru', 'pharmacy'),
  ('Guardian JB', 'MY', 'Johor Bahru', 'pharmacy')
ON CONFLICT DO NOTHING;

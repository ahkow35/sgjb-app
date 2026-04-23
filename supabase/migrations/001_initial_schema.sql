-- Stores (SG and MY retailers)
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  country text not null check (country in ('SG', 'MY')),
  city text not null default '',
  type text not null check (type in ('supermarket', 'pharmacy', 'petrol')),
  url text not null default '',
  created_at timestamptz not null default now()
);

-- Products
create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text not null default '',
  category text not null default '',
  image_url text not null default '',
  unit_type text not null check (unit_type in ('weight', 'each', 'volume')),
  barcode text unique,
  created_at timestamptz not null default now()
);

create index products_name_search on products using gin(to_tsvector('english', name || ' ' || brand));
create index products_barcode on products (barcode) where barcode is not null;

-- Price entries (community-contributed)
create table price_entries (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  price numeric(10,2) not null,
  currency text not null check (currency in ('SGD', 'MYR')),
  quantity numeric(10,3) not null default 1 check (quantity > 0),
  unit text not null default 'each',
  price_per_unit numeric(10,4) generated always as (price / quantity) stored,
  submitted_by uuid,  -- FK to auth.users added in Phase 9 (Auth)
  date_observed date not null default current_date,
  created_at timestamptz not null default now()
);

create index price_entries_product_id on price_entries (product_id, date_observed desc);

-- Cached live data (exchange rate, petrol)
create table live_data (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS
alter table stores enable row level security;
alter table products enable row level security;
alter table price_entries enable row level security;
alter table live_data enable row level security;

-- Public read on everything
create policy "Public read stores" on stores for select using (true);
create policy "Public read products" on products for select using (true);
create policy "Public read price_entries" on price_entries for select using (true);
create policy "Public read live_data" on live_data for select using (true);

-- Anyone can insert price entries and products (anonymous or authenticated)
create policy "Anyone can submit prices" on price_entries for insert with check (true);
create policy "Anyone can add products" on products for insert with check (true);

-- Service role can upsert live_data (for cron refresh)
-- Note: service_role key bypasses RLS, so no explicit policy needed for writes to live_data

-- Seed: stores
insert into stores (name, country, city, type, url) values
  ('FairPrice', 'SG', 'Singapore', 'supermarket', 'https://www.fairprice.com.sg'),
  ('Giant SG', 'SG', 'Singapore', 'supermarket', 'https://giant.sg'),
  ('Sheng Siong', 'SG', 'Singapore', 'supermarket', 'https://shengsiong.com.sg'),
  ('Watson SG', 'SG', 'Singapore', 'pharmacy', 'https://www.watsons.com.sg'),
  ('Guardian SG', 'SG', 'Singapore', 'pharmacy', 'https://www.guardian.com.sg'),
  ('AEON JB', 'MY', 'Johor Bahru', 'supermarket', 'https://www.aeon.com.my'),
  ('Mydin JB', 'MY', 'Johor Bahru', 'supermarket', 'https://www.mydin.com.my'),
  ('Giant MY', 'MY', 'Johor Bahru', 'supermarket', 'https://giant.com.my'),
  ('Watson MY', 'MY', 'Johor Bahru', 'pharmacy', 'https://www.watsons.com.my'),
  ('Guardian MY', 'MY', 'Johor Bahru', 'pharmacy', 'https://www.guardian.com.my');

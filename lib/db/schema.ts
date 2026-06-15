import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
  date,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core'

export const countryEnum = pgEnum('country', ['SG', 'MY'])
export const storeTypeEnum = pgEnum('store_type', ['supermarket', 'pharmacy', 'petrol'])
export const unitTypeEnum = pgEnum('unit_type', ['weight', 'each', 'volume'])
export const currencyEnum = pgEnum('currency_type', ['SGD', 'MYR'])
export const priceSourceEnum = pgEnum('price_source', ['manual', 'barcode', 'scraper', 'admin'])

export const stores = pgTable('stores', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  country: countryEnum('country').notNull(),
  city: text('city').notNull().default(''),
  type: storeTypeEnum('type').notNull(),
  url: text('url').notNull().default(''),
})

export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  brand: text('brand').notNull().default(''),
  category: text('category').notNull().default(''),
  imageUrl: text('image_url').notNull().default(''),
  unitType: unitTypeEnum('unit_type').notNull(),
  barcode: text('barcode'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const priceEntries = pgTable('price_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  storeId: uuid('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: currencyEnum('currency').notNull(),
  quantity: numeric('quantity', { precision: 10, scale: 3 }).notNull().default('1'),
  unit: text('unit').notNull().default('each'),
  pricePerUnit: numeric('price_per_unit', { precision: 10, scale: 4 }),
  source: priceSourceEnum('source').notNull().default('manual'),
  submittedBy: uuid('submitted_by'),
  dateObserved: date('date_observed').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  submissionCount: integer('submission_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const liveData = pgTable('live_data', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

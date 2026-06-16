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
  // Email is no longer used for login (phone + PIN only). Kept nullable and
  // optional for future receipts/export per the household-basket spec.
  email: text('email').unique(),
  phoneNumber: text('phone_number').unique(),
  // Stores the bcrypt hash of the 6-digit PIN (legacy rows hold an old password hash).
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  submissionCount: integer('submission_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Brute-force protection for phone + PIN login. Keyed by phone number; Vercel
// serverless has no shared in-memory state, so attempts live in the DB.
export const loginAttempts = pgTable('login_attempts', {
  phoneNumber: text('phone_number').primaryKey(),
  failedCount: integer('failed_count').notNull().default(0),
  lockedUntil: timestamp('locked_until'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const liveData = pgTable('live_data', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

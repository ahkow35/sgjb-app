import type { Config } from 'drizzle-kit'
import { config } from 'dotenv'

// drizzle-kit runs outside Next, so load the local env explicitly. Prefers the
// non-pooling URL for DDL (push/generate/studio).
config({ path: '.env.development.local' })

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL_NON_POOLING ?? process.env.POSTGRES_URL ?? '',
  },
} satisfies Config

# Archived migrations

These hand-written SQL files (and the `0000` drizzle snapshot/journal) were the
pre-`drizzle-kit push` migration history. They were applied to the database by
hand and were never kept consistent with `lib/db/schema.ts` or with each
other — `0002` (the `source` column on `price_entries`) was never applied to
production, which broke every user price submission until 2026-07.

The project now uses `drizzle-kit push` with `lib/db/schema.ts` as the single
source of truth (see the root README). These files are retained for history
only and are **not** part of the live workflow. Do not run them.

-- Phase 9: Add users table for email/password auth
CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  submission_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for login lookup
CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- Allow price_entries.submitted_by to reference users
ALTER TABLE price_entries
  ADD CONSTRAINT price_entries_submitted_by_fkey
  FOREIGN KEY (submitted_by) REFERENCES users (id) ON DELETE SET NULL
  NOT VALID;  -- NOT VALID so existing NULL rows don't block migration

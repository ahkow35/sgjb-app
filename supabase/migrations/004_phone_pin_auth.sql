-- Phone + PIN auth overhaul. Email login removed; email kept optional/nullable.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

ALTER TABLE users ADD COLUMN phone_number text UNIQUE;
ALTER TABLE users ADD COLUMN display_name text;

CREATE TABLE IF NOT EXISTS login_attempts (
  phone_number text PRIMARY KEY,
  failed_count integer NOT NULL DEFAULT 0,
  locked_until timestamp,
  updated_at timestamp NOT NULL DEFAULT now()
);

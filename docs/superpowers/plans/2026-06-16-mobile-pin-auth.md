# Plan: Step 2 — Mobile number + 6-digit PIN login (full auth overhaul, email removed)

Implements Step 2 of `docs/superpowers/specs/2026-06-15-household-basket-scope.md`.
Step 1 (write-protection) is already merged on `main`.

## Goal

Replace email/password login **entirely** with **mobile number + 6-digit PIN**.
Users have been told to re-login. Add the brute-force protection the spec requires
(a 6-digit PIN over guessable phone numbers is weak without lockout).

## Key decisions

1. **Hard switch — remove email auth.** Single NextAuth Credentials provider
   (`phone-pin`). The email provider, email signup logic, and email UI are deleted.
   Existing `users` rows are **kept, not wiped** (non-destructive): old email
   accounts simply become un-loginable, and users re-register with phone+PIN.
   Their past price contributions stay attributed and harmless. (A wipe would be a
   separate explicit step if requested.)
2. **Country selector instead of fuzzy phone parsing.** UI offers SG (+65) / MY
   (+60) + a local-number field, normalised to E.164 on submit. Avoids the
   ambiguity of guessing country from an 8-digit string.
3. **PIN = exactly 6 digits, numeric.** Hashed with bcrypt (cost 12, as before)
   and stored in the existing `users.password_hash` column — no new credential column.
4. **Rate-limit via a DB table** (`login_attempts`), keyed by phone, because
   Vercel serverless has no shared in-memory state. Lock after 5 consecutive
   failures; exponential backoff (60s × 2^(fails−5), capped at 1h); reset on
   success. Failures never reveal whether the phone exists ("Incorrect phone or
   PIN" for both unknown-number and wrong-PIN).
   *Tradeoff:* phone-keyed lockout means an attacker can deliberately lock a known
   victim. Accepted for a low-stakes household app per the spec; backoff is short
   and self-clearing. Revisit (add IP keying) only if abused.

## Out of scope (later steps)

- Households / `default_household_id` wiring (Step 3).
- Baskets, verdict engine (Steps 4+).
- SMS/OTP or phone verification — explicitly excluded by the spec.
- Wiping old email user rows / reattributing their data (separate step if wanted).

## Schema changes

- `users.email` → **nullable** (phone-only accounts have no email). Keep `unique`.
- `users.phone_number` → `text`, **unique**, nullable. Store E.164.
- `users.display_name` → `text`, nullable (spec field; used by Profile later).
- New table `login_attempts`:
  - `phone_number text primary key`
  - `failed_count integer not null default 0`
  - `locked_until timestamptz` (nullable)
  - `updated_at timestamptz not null default now()`

Migrations: `drizzle/0003_phone_pin_auth.sql` + `supabase/migrations/004_phone_pin_auth.sql`
(both kept in sync, matching the Step-1 pattern).

## Phases

Each phase ≤5 files; verify (`tsc`, `eslint`, `jest`) before moving on.

### Phase 1 — Data layer + pure helpers (no auth wiring yet)
- `lib/db/schema.ts`: email nullable, add `phone_number`, `display_name`, add `loginAttempts` table.
- `drizzle/0003_phone_pin_auth.sql` + `supabase/migrations/004_phone_pin_auth.sql`.
- `lib/phone.ts`: `normalizeToE164(country, local)` + `isValidPin(pin)` (pure, testable).
- `__tests__/lib/phone.test.ts`: SG/MY normalisation, leading-zero handling, invalid input, PIN validation.

### Phase 2 — Auth backend
- `auth.ts`: **replace** the email Credentials provider with a single `phone-pin`
  provider (normalise → look up by phone → check lockout → verify PIN → on fail
  record attempt, on success reset). Email provider deleted.
- `lib/login-attempts.ts`: `checkLock(phone)` / `recordFailure(phone)` / `clear(phone)` against `login_attempts`.
- `app/api/auth/signup/route.ts`: **rewrite** for phone+PIN only (validate phone+PIN,
  enforce phone uniqueness, create user with `password_hash` = bcrypt(PIN)). Email signup path removed.
- `__tests__/api/phone-auth.test.ts`: signup validation, lockout after N failures, reset on success, no user-enumeration leak.

### Phase 3 — UI
- `app/auth/page.tsx`: **replace** the email/password form with phone+PIN (country
  select + number + 6-digit PIN input, `inputMode="numeric"`). No email form.
- `auth.ts` jwt/session callbacks: carry `display_name` if present (light touch).
- Manual check: sign up by phone, sign out, sign in by phone, trigger lockout + recovery.

## Verification checklist

- [ ] `npx tsc --noEmit` clean
- [ ] `npx eslint . --quiet` clean
- [ ] `npx jest` all green
- [ ] New phone+PIN signup → signin round-trip works
- [ ] 6 wrong PINs → locked with backoff; correct PIN after unlock works
- [ ] Wrong phone and wrong PIN return identical error
- [ ] Email login is gone (no email provider / form)
- [ ] Migration `004` is additive (email made nullable; no data backfill needed)

## Confirmed direction

- Hard switch, email auth removed. Existing user rows kept (non-destructive).
- Lockout: 5 failures → backoff 1m doubling to 1h cap.
- Country set: SG + MY only.

# SGJB Household Basket Build Scope

> **Revised 2026-06-15.** Optimised from the original scope:
> 1) login switched to mobile-number + 6-digit PIN (no SMS/OTP), and the write-protection fix decoupled from it so it ships first;
> 2) prices stay global/shared — only baskets are household-scoped (visibility enum dropped);
> 3) basket verdict now has an explicit decision rule and is gated on price completeness;
> 4) price entries are immutable observations (correct by superseding, not editing);
> 5) legacy anonymous data has a migration policy;
> 6) navigation reduced to 4 tabs (Trip folded into the basket result).

## Product Bet

SGJB should be a trusted SG/JB shopping decision tool for a household or small community, not a broad public price index.

The core promise:

> Know whether your regular JB shopping run is actually worth it, using prices your household trusts.

This build should make baskets, price freshness, and trusted contribution the primary workflow.

## Target User

- Singapore-based shoppers who occasionally buy groceries, pharmacy items, petrol, baby supplies, pet supplies, or household staples in Johor Bahru.
- Households or small groups who repeat similar shopping trips and want to keep a shared price book current.
- Users who care less about complete market coverage and more about whether their own basket is worth buying across the border.

## Product Positioning

Use this positioning in product copy and UX decisions:

> A trusted SG/JB price book for your household's regular basket.

Secondary framing:

> See if your JB shopping run still saves money after exchange rate, petrol, tolls, and transport.

## Scope Summary

This build should ship:

1. Mobile-number + PIN login.
2. Write-protection and ownership on all mutation endpoints (ships first, independent of the login change).
3. Household/group ownership.
4. Saved baskets as the main product object.
5. Basket-level SG vs JB comparison.
6. Trip-adjusted savings result with an explicit verdict rule.
7. Authenticated price contribution.
8. Price freshness and trust labels.

This build should not try to become a complete public price index.

## Navigation

Replace the current product-listing-first mental model with a basket-first model.

Recommended bottom navigation (4 tabs):

- Basket
- Update
- Prices
- Profile

Navigation intent:

- Basket: user's active/default basket, saved baskets, and the trip-adjusted verdict. Trip settings open as a sheet from the basket result — there is no separate Trip tab.
- Update: fast workflow for updating stale/missing prices.
- Prices: searchable product and price book.
- Profile: mobile account, household, contribution history.

Rationale: Trip ROI is meaningful only against a basket, so it lives inside the basket result rather than as a standalone destination. This keeps mobile navigation light.

## Mobile + PIN Login

Use mobile number as the primary identity, with a 6-digit PIN as the secret. This is **not** SMS OTP — there is no texted code and no SMS provider. It is the same credentials flow already in the app, with the email field replaced by phone number and the password replaced by a numeric PIN.

### Requirements

- Users sign up and sign in with a mobile number plus a 6-digit numeric PIN.
- Store phone numbers in E.164 format, for example `+6591234567` or `+60123456789`.
- Support Singapore and Malaysia numbers first.
- Hash the PIN with bcrypt (already in the stack). Reuse the existing `users.password_hash` column to store the hashed PIN — the credential storage needs no new column, only `users.phone_number`.
- On sign-in, find the user by normalized phone number, then verify the PIN against the hash.
- Keep email optional for future receipts/export, not required for login.

### Auth Security Notes

A 6-digit numeric PIN has only ~1,000,000 combinations, and phone numbers are enumerable, so the username is effectively public. This is weaker than email + password and **requires** abuse protection:

- Rate-limit and lock out repeated failed sign-in attempts per phone number (for example, lock after 5 consecutive failures with exponential backoff).
- Do not reveal whether a phone number exists on a failed attempt.
- This is an accepted tradeoff for a low-stakes household price tool. Revisit (stronger secret, optional 2FA, or an SMS verify step) only if the app's scope grows beyond household/community use.

### Recommended UX

1. User enters mobile number.
2. New users set a 6-digit PIN; returning users enter their PIN.
3. App signs the user in.
4. New users are prompted to create or join a household (via invite code).

### Data Model Direction

Add or migrate toward:

- `users.phone_number`
- `users.display_name`
- `users.default_household_id`

Reuse the existing `users.password_hash` for the PIN hash. `users.phone_verified_at` is **not** part of this build — there is no verification step without OTP; add it later only if an SMS/WhatsApp verify step is introduced.

Existing email/password accounts can be preserved temporarily, but new product UX should favor phone + PIN login.

### Auth Policy

Require a signed-in user for:

- creating products
- creating price entries
- deleting price entries
- creating barcode product stubs
- creating baskets
- joining households

Public anonymous browsing can remain read-only.

## Households

Households make the app useful without needing public-scale data quality.

### Requirements

- A user can create a household.
- A user can invite another user with an **invite code** (no phone-based invites in this build — invite codes remove any dependency on SMS or contact lookup).
- **Baskets** can belong to a household. **Prices stay global and shared** — see Price Visibility.
- A user can switch household context if they belong to more than one.
- Default basket ownership should be household-private.

### Roles

Start with two roles:

- Owner: manage household, invite members, delete household-owned data.
- Member: create baskets, add prices, delete own entries.

Admin tooling can be added separately for global cleanup.

## Price Visibility

Prices are **global and shared** in this build. There is no per-price privacy setting and no visibility enum.

Rationale: a price observed at a JB store is an objective public fact. Privatising prices per household would fragment the shared price density that makes the app useful — a two-person household would only ever see its own contributions. Trust is conveyed by source, freshness, and submitter labels (below), not by hiding data.

If a genuine private-rate case appears later (for example a wholesale/member-only price), handle it with a single `is_private` flag rather than reintroducing a multi-state visibility model.

## Saved Baskets

Baskets should become the app's main object.

### Requirements

- A user can create a basket.
- A basket belongs to either a user or a household.
- A basket has a name, for example "Weekly groceries", "JB pharmacy run", or "Baby supplies".
- A basket contains products, target quantities, and preferred package units.
- A user can duplicate a basket.
- A user can mark one basket as default.

### Basket Result

Each basket should show:

- SG total.
- JB total in MYR.
- JB total converted to SGD.
- Gross savings before trip cost.
- Estimated trip cost.
- Net savings after trip cost.
- **Priced coverage, shown as "X of N items priced"** for both SG and JB.
- Missing price count.
- Stale price count.
- Last updated date.

#### Verdict Rule

The key result is a plain-language verdict, decided in this order:

1. **Completeness gate first.** If fewer than a set share of basket items have both an SG and a JB price that is Fresh or Aging (placeholder: 80% — product to confirm), the verdict is **"Needs more prices"**, regardless of computed savings. Partial baskets understate the JB total and bias the verdict optimistic, so coverage is checked before money.
2. **Then the savings rule** (only once the completeness gate passes):
   - Net savings ≥ `S_high` → **"Worth a dedicated trip"**
   - `0 < net savings < S_high` → **"Worth it if already going"**
   - Net savings ≤ 0 → **"Not worth a dedicated trip"**

`S_high` is a product decision (placeholder: SGD 30). The completeness threshold and `S_high` must be defined as named config, not hardcoded inline.

Totals must always display the "X of N priced" basis so the user can see the verdict is not guessing.

## Trip ROI

Trip ROI is integrated into the basket result (opened as a settings sheet from the Basket screen), not a standalone tab.

### Inputs

- Selected basket.
- Exchange rate.
- Transport mode: drive, bus, taxi/private hire.
- Route.
- Tolls.
- Fuel price.
- Fuel efficiency.
- Number of people.

### Output

- Gross basket savings.
- Trip cost.
- Net savings.
- Break-even basket size.
- Verdict (per the Verdict Rule above).

## Price Freshness

Freshness should be visible everywhere prices influence decisions.

### Freshness Rules

Use simple thresholds for this build:

- Fresh: observed within 14 days.
- Aging: observed within 15 to 45 days.
- Stale: observed more than 45 days ago.

(Grocery/promo prices move faster than 14 days; per-category thresholds are a future refinement, not part of this build.)

### UI Labels

Show labels such as:

- Fresh
- Aging
- Stale
- Missing
- Updated today
- Last seen 12 days ago

### Update Workflow

The Update tab should prioritize:

1. Basket items with missing prices.
2. Basket items with stale JB prices.
3. Basket items with stale SG prices.
4. Recently updated items for confirmation.

Updating a price means **adding a new observation**, not editing an old one (see Ownership And Permissions).

## Price Trust Labels

Every price should show where it came from.

### Source Types

Add a source label to price entries:

- `manual`
- `barcode`
- `scraper`
- `admin`

Optional future values:

- `receipt_photo`
- `member_verified`

### Trust Indicators

Start with simple labels:

- Submitted by you.
- Submitted by household member.
- Scraped from retailer.
- Scanned barcode.
- Verified recently.
- Stale.

Do not add ratings or complex reputation yet.

## Ownership And Permissions

This build must close the current open-write gap. Today, `POST /api/price-entries` inserts even when there is no signed-in user — that is the gap.

Price entries are treated as **immutable observations**: there is no edit path. A correction is a new observation that supersedes the old one (latest `date_observed` wins). This removes an entire mutable-edit surface from the permission model.

### Rules

- Anonymous users can read global data only.
- Signed-in users can create prices and products.
- Users can **delete** only their own price entries (there is no edit).
- Household owners can delete household-owned baskets and their items.
- Product creation requires sign-in.
- Barcode-created product stubs require sign-in.
- Admin-only global cleanup can be implemented later.

## Legacy Data Migration

Existing `price_entries` were written under the open-write model, so many have `submitted_by = NULL`. When ownership rules turn on, these rows have no owner.

Policy for this build:

- Backfill legacy null-owner rows to `source = 'scraper'` (or `'admin'` where appropriate).
- Treat them as read-only and non-deletable by members; only admin cleanup can remove them.
- This must run before ownership checks are enabled, or those checks will either break on legacy rows or silently orphan them.

## Product Data

Keep product data practical.

### Required Product Fields

- Name.
- Brand.
- Category.
- Barcode, optional but unique when present.
- Package quantity.
- Package unit.
- Unit type.
- Image URL, optional.

### Product Matching

For this build:

- Match by barcode first.
- Fall back to normalized brand + normalized name + package quantity + package unit.
- Allow manual duplicate cleanup later.

Normalization fields land **with** the basket work, not after it — baskets reference products, and duplicate products would double-count or split prices across the basket total. Avoid building a full canonical product merge system in this build.

## Database Additions

Likely additions:

- `households`
- `household_members`
- `baskets`
- `basket_items`
- `price_entries.source`
- `price_entries.verified_at` (optional; only if `member_verified` is built)
- `products.package_quantity`
- `products.package_unit`
- `products.normalized_name`
- `products.normalized_brand`
- `users.phone_number`
- `users.display_name`
- `users.default_household_id`

**Deliberately not added** (vs. the original scope):

- `price_entries.visibility` — prices are global; no visibility enum.
- `price_entries.household_id` — prices are not household-scoped.
- `price_entries.updated_at` — entries are immutable observations; a change is a new row.
- `users.phone_verified_at` — no verification step without OTP.

## Screens

### Basket Screen

Primary screen.

Must include:

- Active basket selector.
- Basket item list.
- SG/JB totals with "X of N priced" coverage.
- Missing/stale price summary.
- Trip-adjusted verdict.
- Trip settings sheet (transport, exchange rate, etc.).
- Add item.
- Update stale prices CTA.

### Update Screen

Fast contribution workflow.

Must include:

- Missing/stale items from active basket.
- Quick price entry (creates a new observation).
- Store selector.
- Date observed.
- Barcode scan shortcut.

### Prices Screen

Search and inspect product prices.

Must include:

- Product search.
- Product detail.
- SG/JB latest prices.
- Freshness labels.
- Source labels.
- Add to basket.
- Add price (new observation).

### Profile Screen

Account and household settings.

Must include:

- Phone number.
- Display name.
- Household list.
- Invite/join household (invite code).
- Contribution history.
- Sign out.

## Out Of Scope

Do not include in this build:

- SMS OTP or any SMS/WhatsApp-based login or verification.
- Per-price privacy / visibility settings.
- Editing existing price entries (corrections are new observations).
- Public SEO product pages.
- Full public price index positioning.
- Full scraper monitoring.
- Receipt OCR.
- Complex moderation queues.
- Reputation scores.
- Push notifications.
- Multi-country expansion beyond SG/MY.
- Perfect duplicate-product merging.
- Retailer-wide coverage.

## Success Criteria

This build is successful if:

- A user can sign in with mobile number + PIN.
- Failed PIN attempts are rate-limited / locked out.
- A user can create or join a household via invite code.
- A user can create a basket of recurring products.
- A user can compare SG vs JB basket totals with visible "X of N priced" coverage.
- The app tells the user whether the JB trip is worth it after trip costs, and says "Needs more prices" when coverage is too low instead of giving a misleading verdict.
- Prices show freshness and source labels.
- Stale or missing prices are easy to update.
- Anonymous users cannot write or delete data.
- Users cannot delete price entries they do not own.
- Legacy anonymous price rows are owned by `scraper`/`admin` and not member-deletable.

## Implementation Order

1. **Write-protect all mutation endpoints + ownership checks + tests, on the current email auth.** This is the urgent security fix and is independent of the login change — ship it first. Includes the legacy data migration so ownership checks have valid owners.
2. Switch login to mobile number + 6-digit PIN (bcrypt hash in existing `password_hash`, add `users.phone_number`) with failed-attempt rate-limiting/lockout.
3. Add household and membership tables + invite-code join flow.
4. Add baskets and basket items, plus product package/normalization fields.
5. Add source/freshness fields to price entries (global; no visibility, no household_id).
6. Replace cart-first UI with saved-basket UI.
7. Build the verdict engine (completeness gate + savings rule) with integrated trip ROI in the basket result.
8. Build the Update screen for stale/missing prices.

## Build Principle

When choosing between broader coverage and higher trust, choose higher trust.

The app should be useful for 100 household-relevant products before it tries to cover 10,000 public products.

# SGJB App — Improvement Plan (July 2026)

Source: full four-track code review (backend, security, frontend/UX, data pipeline), 2026-07-27.
Every item below was verified against source before inclusion — file:line references are current as of commit `ed209a1`.

**How to work this plan**
- One PR per work package (WP). Each WP lists its acceptance criteria; a WP is done when they all pass, not when the code compiles.
- Phases are ordered by dependency, not just priority. **Phase 0 must land before any other schema-touching work** — `db:push` is currently unsafe.
- Never merge to main directly; feature branch → PR → review, per house rules.
- WPs marked 🤖 are well-scoped enough to delegate to `build-to-pr` (agent builds, human reviews the PR). Unmarked WPs need a human/architect in the loop.

---

## Phase 0 — Make the database safe to touch (blocker for everything else)

> `lib/db/schema.ts` is the declared source of truth for `drizzle-kit push`, but it is missing constraints/indexes that exist in the legacy SQL. The next `db:push` will offer to DROP them. Nothing else that touches the schema may start until this lands.

### WP-0.1 Reconcile Drizzle schema with the live DB — ~0.5 day
- [ ] Run `drizzle-kit pull` (or `\d` inspection) against production; document what actually exists today.
- [ ] Declare in `schema.ts`: `products.barcode` UNIQUE + partial index (legacy `001_initial_schema.sql:20,25`), composite index `price_entries (product_id, date_observed desc)` (legacy `:42`).
- [ ] Add missing new indexes: `price_entries.store_id`, `products.category`, `products.created_at`.
- [ ] Add `check(price > 0)` on `price_entries` (mirrors existing quantity check, `schema.ts:65`).
- [ ] Drop redundant `users_email_idx` (duplicate of the unique constraint, `schema.ts:86-87`).
- [ ] Add unique key for idempotent writes: `(product_id, store_id, submitted_by, date_observed)` for user entries and `(product_id, store_id, date_observed, source)` for scraper entries — pick one composite that serves both (design note below).
- **Accept when:** `drizzle-kit push` against a staging copy reports **no destructive changes**, and `EXPLAIN` on the product-detail price query shows an index scan.

---

## Phase 1 — Fix the comparison core (the product's actual promise)

> Best-price currently = `MIN(raw price)` over all history. Wrong on three axes: ignores package size, ignores age, and scraped units aren't comparable. These ship together as one logical change or the numbers get worse before they get better.

### WP-1.1 Canonical units at write time — ~1 day
- [ ] Normalize every quantity/unit pair to base units (g / ml / each) in ONE shared function used by: `app/api/price-entries/route.ts`, `scripts/scraper/db.ts`, all three scraper parsers. Guardian already does this (`guardian_sg.ts:14-26`); FairPrice and Watsons don't.
- [ ] Enforce a server-side unit allowlist in the price-entries API (currently free text, `route.ts:64`).
- [ ] One-off backfill script: recompute `price_per_unit` for existing rows into canonical units.
- **Accept when:** unit tests prove `1 kg` and `1000 g` produce identical `price_per_unit`; backfill run on staging shows no row where equivalent packs differ >1% per-unit.

### WP-1.2 Rank by price-per-unit within a freshness window — ~1–1.5 days 🤖 (after 1.1 merges)
- [ ] `lib/products-query.ts` and `app/api/cart/prices/route.ts`: "best" = lowest `price_per_unit` among each store's **most recent** entry within the freshness window (default 90 days — see Decisions). Not min-over-all-history.
- [ ] Return `date_observed` age; UI shows "as of N days ago" and a stale badge past the window.
- [ ] Fix `pkg_qty/pkg_unit` only populating from the SGD side (`products-query.ts:160`) — return per-currency package size.
- [ ] **Tests first**: `products-query.ts` currently has zero coverage. Minimum cases: per-unit beats raw price; stale entry excluded; newer entry supersedes cheaper older one at same store; MY-only product returns package size.
- **Accept when:** the review's canonical failure case (RM4.50/250g vs RM12/1kg) ranks the 1kg pack as best.

### WP-1.3 Scraper hygiene quick fixes — ~0.5 day 🤖
- [ ] Tag scraper inserts `source: 'scraper'` (`scripts/scraper/db.ts:63-73` — currently shown to users as "Manual").
- [ ] "Store not found" must count as `failed`, not `saved` (`db.ts:17-20` + `runner.ts:52-60`).
- [ ] Scraper writes idempotent via the Phase-0 unique key + `onConflictDoUpdate`.
- **Accept when:** re-running `npm run scrape` twice produces zero duplicate rows; run summary distinguishes saved/skipped/failed truthfully.

---

## Phase 2 — Frontend quick wins (one PR, ~1–1.5 days total) 🤖

Small, independent, high-impact. Bundle as a single "frontend fixes" PR or two.

- [ ] **Search**: debounce 300ms (copy the pattern from `submit/page.tsx:88-110`), make the input controlled, remove `key={q}` remount (`components/SearchBar.tsx:39-46`).
- [ ] **Scanner camera restart**: hold `onProduct`/`onNotFound` in a ref inside `BarcodeScanner`; mount effect runs once (`BarcodeScanner.tsx:128`, `submit/page.tsx:194-206`).
- [ ] **Cart**: key the fetch effect on the product-ID set, not the `items` array reference; visible error + retry instead of `.catch(() => {})` (`app/cart/page.tsx:34-59`).
- [ ] **A11y**: remove `maximumScale: 1` (`app/layout.tsx:25`); fix gold-on-white CTA contrast (~2.3:1 → use navy text on gold) (`tailwind.config.ts:52`, `AddToCartButton.tsx:36`); `aria-label` on search input; `aria-expanded` on the add-price toggle.
- [ ] **Bundle**: `next/dynamic` import for `PriceTrendSparkline` (recharts) so it loads only when a history dropdown opens (`PriceHistoryDropdown.tsx:7`).
- [ ] **Loading states**: add `loading.tsx` skeletons for `(dashboard)`, `products`, `products/[id]`.
- [ ] **Trip ROI**: pass `rate`/`ron95` via URL params from the cart instead of two client fetches (`app/trip-roi/page.tsx:45-54`).
- **Accept when:** typing in search fires ≤1 request per pause and never loses focus; camera stream initializes exactly once per scanner open; `+`/`-` in cart triggers zero refetches; Lighthouse a11y pass on /products has no contrast or zoom failures.

---

## Phase 3 — Abuse & privacy hardening (one PR, ~1–2 days)

- [ ] **Strip `submitted_by` UUIDs** from the unauthenticated `GET /api/products/[id]/prices` response (`route.ts:24`) — single-line privacy fix, do first.
- [ ] **Rate limiting** on `POST /api/auth/signup`, `/api/price-entries`, `/api/products`: DB-backed token bucket keyed on user-id + IP (same pattern as `login_attempts` — no new infra needed).
- [ ] **Signup enumeration**: same-shaped response whether or not the phone exists (currently a distinguishable 409, `signup/route.ts:40`); wrap the insert in try/catch → clean 409 on the unique-violation race.
- [ ] **Login**: dummy bcrypt compare when user not found (timing oracle, `auth.ts:46`); atomic SQL upsert for `recordFailure` (read-then-write race, `login-attempts.ts:34-53`); secondary IP-level attempt counter.
- [ ] **Cron**: fail closed when `CRON_SECRET` unset; `timingSafeEqual` (`cron/refresh/route.ts:9`).
- [ ] **Headers**: CSP, `X-Frame-Options`, HSTS, `nosniff`, `poweredByHeader: false` in `next.config.mjs`.
- [ ] **Input caps**: length limits on product name/brand/category; `date_observed` range check (not future, not >1 year old).
- **Accept when:** scripted signup/price-entry floods get 429s; anonymous API responses contain no user identifiers; login timing is constant for known vs unknown numbers (spot-check with 100 samples).

---

## Phase 4 — Submission quality (scanner + manual prices)

> Goal: a repeat submission takes ~10 seconds (scan → confirm store → price → done) and cannot silently produce garbage data.

### WP-4.1 Defer product creation until price submission — ~1 day (design-reviewed, not delegated)
- [ ] `GET /api/barcode` becomes read-only: returns the OFF-derived **draft**, inserts nothing (today it creates stub products that float to the top of the list because browse sorts by `created_at desc` — `barcode/route.ts:100-114`).
- [ ] Product + first price entry created atomically in one transaction when the user submits.
- **Accept when:** scan-then-abandon leaves zero DB rows; concurrent same-barcode submits produce one product (unique constraint from Phase 0 + `onConflictDoNothing`).

### WP-4.2 Scanner reliability — ~1 day 🤖
- [ ] Restrict ZXing to EAN-13/EAN-8/UPC-A/UPC-E; validate GTIN check digit; require 2 consecutive identical reads; normalize UPC-A → EAN-13.
- [ ] `decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } })` instead of default device (`BarcodeScanner.tsx:46`).
- [ ] Manual barcode entry field in the modal's error AND scanning states; "scan again" button; `role="dialog"`, focus trap, Escape-to-close.
- [ ] Cascade lookup: Open Food Facts → Open Beauty Facts → Open Products Facts (stores include pharmacies; OFF alone misses much of Guardian/Watsons inventory). Log `source` outcomes to measure hit rate.
- **Accept when:** a deliberately misread-prone label (crumpled/angled) never creates a wrong product in 20 manual trials; camera-denied path still lets a user complete a submission.

### WP-4.3 Manual price entry: can't-produce-garbage defaults — ~1.5 days
- [ ] Extract shared `PriceEntryForm` from `AddPriceInline.tsx` + `submit/page.tsx:512-618` (do this FIRST — every rule below otherwise gets implemented twice).
- [ ] Prefill package size/unit from the product's most recent entry; on weight/volume products with no prior entry, require explicit package-size interaction (current default of `quantity=1, unit=g` records 1 gram — `submit/page.tsx:61-62,122-125`).
- [ ] Outlier soft-confirm: server compares against recent median for product+store; >3× deviation → `409 needs_confirmation`; form asks one confirm question. Catches missing-decimal typos (12.50 → 1250).
- [ ] Same-day resubmission upserts instead of appending (Phase-0 unique key) — doubles as the app's only edit mechanism; surface as "updated your earlier price".
- [ ] Remember last-used store; store step defaults to it with one-tap confirm.
- [ ] `inputMode="decimal"` on all price inputs (submit page lacks it; inline form has it).
- **Accept when:** submitting the same product twice in a day yields one row; a 100× typo requires an explicit confirm; repeat submission at the same store = scan → 2 taps → price → submit.

---

## Phase 5 — Cross-store product matching (needs a design session first)

> Highest-effort, highest-leverage: today each scraped store creates its own disjoint product rows, so the SG↔MY comparison often has nothing to compare. Do NOT start coding before a 1-hour design decision on the matching strategy.

### WP-5.1 Design doc (½ day, architect-level)
- [ ] Decide: normalization-only matching vs. a curated `product_links` table vs. both. Recommendation: both — normalized auto-match with a manual link/unlink admin override.
- [ ] Decide SKU vs GTIN split: separate `store_sku` column; `barcode` holds only validated GTINs (Guardian currently writes its internal SKU into `barcode` — `guardian_sg.ts:103` — which can never match FairPrice's EANs and risks false collisions).

### WP-5.2 Implementation — ~2–3 days after design
- [ ] Migrate Guardian SKUs out of `barcode`; name normalization (case-fold/trim/collapse whitespace) before match; backfill-merge obvious duplicates behind an admin review list.
- [ ] Scraper scheduling: the product scrapers are currently manual-only (`npm run scrape`) — decide cadence and runner (Vercel cron can't run Playwright; needs GitHub Actions or a VPS cron) and add a "scrape returned <N items" alert so silent selector breakage is caught.
- [ ] `/api/exchange-rate`: serve stale cache on upstream failure instead of 500 (and remove the client's silent hardcoded 3.5 fallback, `CurrencyContext.tsx:15`).

---

## Deferred / explicitly not now
- Moderation queue, reputation scores, receipt-photo verification — post-traction.
- Torch/zoom camera controls — wait for real complaints.
- Service worker / offline cache — worthwhile (in-store connectivity!) but only after Phases 1–4; until then the manifest oversells.
- Dark mode: currently styled but unreachable (class strategy, no toggle). **Decide: wire it (`darkMode: "media"` is one line) or strip the dead CSS.** Don't leave it half-shipped.

## Decisions needed from Nyan before the relevant WP starts
1. **Freshness window** for "current price" (proposed: 90 days; shorter = more accurate, more empty cells). → blocks WP-1.2
2. **Rate-limit thresholds** (proposed: 200 price entries/user/day, 5 signups/IP/hour). → blocks Phase 3
3. **Dark mode: keep or kill.** → Phase 2 tail
4. **Scraper runner + cadence** (GitHub Actions weekly vs VPS cron daily). → blocks WP-5.2
5. **Matching strategy sign-off** after WP-5.1 design doc.

## Suggested sequence & effort
| Order | Work | Est. | Parallel-safe? |
|---|---|---|---|
| 1 | Phase 0 schema reconcile | 0.5d | — (blocks all) |
| 2 | Phase 1 comparison core | 3d | with Phase 2 |
| 2 | Phase 2 frontend quick wins | 1.5d | with Phase 1 |
| 3 | Phase 3 abuse/privacy | 2d | with Phase 4 |
| 3 | Phase 4 submission quality | 3.5d | with Phase 3 |
| 4 | Phase 5 matching + scheduling | 3–4d | after design session |

Total ≈ 13–15 dev-days; two tracks can run in parallel after Phase 0, so ~2 calendar weeks for a two-person (or human + agent) team.

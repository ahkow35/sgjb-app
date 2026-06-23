# SGJB Visual Polish — Design Spec

## Goal
Transform the app from a functional default shadcn/Tailwind UI into a polished consumer app with Navy + Gold branding, Outfit font, and refined component design across all screens.

## Design Tokens

### Color Palette
- **Primary (Navy):** `#1B2A4A` — HSL(220 46% 19%)
- **Primary foreground:** `#FFFFFF`
- **Accent (Gold):** `#C9A84C` — HSL(40 47% 55%)
- **Background:** `#F8F9FC` — very light blue-grey tint (not pure white)
- **Card:** `#FFFFFF`
- **Muted:** `#EEF2FA`
- **Muted foreground:** `#6B7A99`
- **Border:** `#E2E8F2`
- **Destructive:** `#DC2626`
- **Success green:** `#16A34A`

### Typography
- **Font:** Outfit (Google Fonts) — replaces Inter
- **Weights used:** 400 (body), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold for prices)

### Shape
- **Border radius:** `0.75rem` (12px) — up from 0.5rem, rounder and friendlier
- **Card shadow:** `0 2px 12px rgba(27,42,74,0.08)`

---

## Screen-by-Screen Changes

### 1. Global (`globals.css` + `layout.tsx`)
- Update all CSS custom properties to Navy + Gold tokens
- Replace Inter import with Outfit from Google Fonts
- Set `--background` to the light blue-grey tint
- Increase `--radius` to `0.75rem`

### 2. Dashboard (`app/(dashboard)/page.tsx` + widgets)

**Hero section** (replaces plain "SGJB Dashboard" h1):
- Full-width navy gradient banner (`#1B2A4A → #243B6E`)
- App logo/name "SGJB" in white, 28px 800 weight
- Tagline: "SG & JB Price Comparison" in white/70
- Exchange rate card embedded in hero with frosted glass style (white/12 background, white border)
- Rate shown large: `RM 3.1067` in 32px 800, sub-label `1 MYR = S$ 0.32`
- Gold "Live" badge with dot

**Petrol widget** (below hero):
- Section title: "JB Petrol Prices" in navy, uppercase xs tracking
- 3-column card with tinted backgrounds per grade:
  - RON95: green tint `#F0FDF4` / `text-green-700`
  - RON97: blue tint `#EFF6FF` / `text-blue-700`  
  - Diesel: amber tint `#FFFBEB` / `text-amber-700`
- Price in 24px 800 weight, label in 10px muted

### 3. Products Page (`app/products/page.tsx`)

- **Sticky search bar** at top: white pill with navy focus ring, Search icon left, clear X right
- **Category filter chips** below search: scrollable horizontal row — All / Beverages / Pharmacy / Snacks / Health
- Products list in a `space-y-3` stack

**Product Card** (`components/ProductCard.tsx`):
- White card, 12px radius, subtle shadow
- Product image (48×48) with rounded-lg, left of text
- Product name 14px/600, brand 12px muted
- Category + unit_type badges (navy/10 background)
- Price comparison row: two tinted pills side by side
  - SG pill: `bg-[#EEF2FF]` border `#C7D7F5`, navy price, "🇸🇬 SG" label
  - JB pill: `bg-[#FFFBEB]` border `#FDE68A`, gold price, "🇲🇾 JB" label
- Savings callout: gold pill "Save S$X.XX" only shown when JB is cheaper
- Add to Cart button: gold background, white text, rounded-lg

### 4. Bottom Nav (`components/BottomNav.tsx`)
- Active item: navy icon + label, gold dot indicator below icon
- Inactive: muted grey
- **Cart badge**: red circle with item count overlaid on cart icon when cart has items
- Nav background: white with top border `border-t border-[#E2E8F2]`

### 5. Cart Page (`app/cart/page.tsx`)
- Header with cart item count in navy badge
- Per-item card: white, navy product name, gold "In cart" tag
- Price comparison pills consistent with ProductCard style
- Totals card: navy gradient header with "Cart Total" label, white price figures
- Savings row: gold pill with checkmark "You save S$X.XX"
- "Calculate trip ROI →" button: full-width, gold background, navy text

### 6. Auth Page (`app/auth/page.tsx`)
- Full navy gradient background (top 40%) fading to light bg
- SGJB logo centered, white on navy section
- White card below with tabs + form
- Primary button: navy fill, Outfit 600

### 7. Submit Page (`app/submit/page.tsx`)
- Step indicators: navy filled circle for active, gold check for completed, muted for future
- Scan button: navy border, navy icon

### 8. Trip ROI Page (`app/trip-roi/page.tsx`)
- Results card: navy gradient header ("Trip Verdict"), white body
- Net savings positive: gold text + gold pill
- Net savings negative: red text

---

## Files Changed
| File | Change |
|---|---|
| `app/globals.css` | New color tokens + radius |
| `app/layout.tsx` | Outfit font |
| `components/ExchangeWidget.tsx` | Hero redesign |
| `components/PetrolWidget.tsx` | Tinted grade cards |
| `components/ProductCard.tsx` | Full redesign |
| `components/BottomNav.tsx` | Cart badge + gold active |
| `app/(dashboard)/page.tsx` | Remove plain h1, add hero wrapper |
| `app/products/page.tsx` | Sticky search + category chips |
| `app/cart/page.tsx` | Polish |
| `app/auth/page.tsx` | Polish |
| `app/submit/page.tsx` | Step indicator polish |
| `app/trip-roi/page.tsx` | Results card polish |

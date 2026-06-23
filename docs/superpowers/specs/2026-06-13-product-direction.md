# SGJB Product Direction

## Strategic Fork

SGJB can evolve in two distinct directions:

1. A trusted private/community price book for food, pharmacy, petrol, and cross-border shopping decisions.
2. A public price intelligence platform backed by community submissions and automated extraction from official supermarket sites.

The UI can look similar in both cases, but the operating model is different. The community product optimizes for trust, relevance, and repeated use. The public product optimizes for coverage, canonical product data, automation, moderation, and data quality.

## Direction 1: Private/Community Price Book

This is the stronger near-term path.

The core value proposition is:

> My household or community knows where to buy common items cheaper, with enough trust to act on it.

Product improvements should focus on trust, low-friction contribution, and recurring shopping workflows.

Recommended capabilities:

- Require sign-in for submissions.
- Let users create households or groups so data can be private to a community.
- Allow users to edit/delete only their own submissions.
- Add lightweight moderation: flag suspicious entries, review edits, and show who submitted each price.
- Improve product matching through barcodes, aliases, package size normalization, brand cleanup, and category cleanup.
- Focus on recurring baskets: weekly groceries, pharmacy basics, baby items, pet food, and petrol.
- Make shopping lists a primary workflow.
- Answer "where should I buy this basket?" instead of only showing product listings.
- Track price history per product/store.
- Add confidence indicators such as "verified by 3 users", "last seen 2 days ago", "scraped from source", and "manual entry".
- Make contribution fast: scan barcode, select store, enter price, optionally attach a photo.

This path does not require comprehensive market coverage. It needs reliable prices for the 100-500 products a specific household or community actually buys.

## Direction 2: Public Price Platform

This is a harder path with larger potential upside.

The core value proposition is:

> A public, searchable, current grocery and pharmacy price index for Singapore and Johor Bahru.

To make this credible, SGJB would need stronger data and operations systems:

- A canonical product database that can match the same item across stores, package sizes, barcodes, brands, and variants.
- Automated scrapers per retailer with monitoring, retries, change detection, and failure alerts.
- Source attribution for every price: URL, scrape timestamp, retailer, region, and availability.
- Price normalization for unit price, bundle price, promo mechanics, member pricing, and delivery fees.
- Anti-spam and abuse controls for public submissions.
- Admin review tools for product merges, duplicate cleanup, suspicious prices, and scraper failures.
- Legal and terms-of-service review for scraping and republication of retailer-derived prices.
- Ranking logic that separates official scraped prices from community-submitted prices.
- A data-quality pipeline that labels prices as fresh, stale, conflicting, unverified, outlier, or unavailable.

Going public too early risks creating a messy database of duplicate products and stale prices. The main challenge is not the frontend. It is product identity, source quality, and moderation.

## Recommended Path

Start with the private/community product, but preserve the data model needed for the public product later.

Near-term priorities:

- Make the app community-first.
- Require authentication for writes.
- Add ownership, groups, and trust signals.
- Improve product and package normalization.
- Add official scraping as a secondary source for selected stores and selected products.
- Label every price entry by source: `manual`, `barcode`, `scraper`, `admin`, or future variants.
- Build basic admin tools early, even if they are utilitarian.

This produces a useful app now while creating a cleaner dataset for a future public version.

## Product Shape

SGJB should shift from "browse products" toward "answer shopping decisions".

Strong workflows:

- "I am going to JB. Is this basket worth buying there?"
- "Where is my usual grocery list cheapest this week?"
- "Has this product become expensive?"
- "What are the best cross-border savings right now?"
- "What prices did my community recently verify?"

A public app competes on coverage. A community app competes on relevance and trust. At this stage, relevance and trust are easier to win.

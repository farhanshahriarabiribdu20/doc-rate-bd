# doc-rate-bd (fosholnexa.com) — rules for any change

## Vercel Blob free plan: never exceed 2,000 "advanced" operations a month (owner's standing rule, for the whole year)

Advanced operations = `put`, `list`, `copy` (reads via `get` are "simple", 10K/month; `del` is free). When the limit was
passed (25 Nov 2026) the store was blocked and the site could not read its own data. So for EVERY change:

1. Count the writes a feature causes per use and per month before building it. Prefer 0–1 writes per action.
2. Never call `list()` on a public/visitor request path or on every admin action. Keep an index/rolling blob and read it with `get`.
3. Do not write per keystroke / per visit. Batch in memory, write once per burst, skip the write when nothing changed.
4. Visitor-triggered writes must go through `api/_budget.js`: `await allow(kind)` before the write (daily cap + monthly stop line,
   returns the Bengali "not today" message) and `count(kind, n)` for direct `put`/`list` calls (`writeFresh` counts itself).
   Add the new kind to `DAILY_CAPS` and to the labels in `src/components/BlobMeter.jsx`.
5. Admin actions are counted but never blocked. The admin settings tab shows the monthly meter (estimate).
6. Reads that fail must not look like "empty" (see `api/_fresh.js`): never write back after a failed read.
7. Add edge cache (`s-maxage`) to public GETs; every cache miss that touches Blob costs a read.

Current monthly budget (approx.): publish ~300, undo copy ~60, day archive ~90, backup ~60, stats ~120, votes ~240, visitor writes capped
(`DAILY_CAPS`), visitor writes stop at `STOP_VISITORS_AT` (1,500 total).

## Other constraints
- Vercel Hobby: max 12 serverless functions (extend existing ones with query params).
- Most visitors use phones: keep mobile layout first; desktop must stay unchanged unless asked.
- Marketplace needs no login and ads auto-publish; admin can only delete/ban/verify/edit.

# TODO: Fix PDF download failing with "Internal server error."

## Root Cause (Confirmed)
- `GET /api/admin/orders/:id/bill/pdf` uses Puppeteer to render the invoice HTML → PDF.
- Works locally because Puppeteer's Chromium browser is installed at `~/.cache/puppeteer/chrome`.
- In production the Chromium browser is not installed, so `puppeteer.launch()` throws
  `Browser was not found at the configured executablePath`, which the error handler
  masks into the generic `500 "Internal server error."`.

## Plan
- [x] Investigate PDF endpoint + compare with working invoice (text/html) routes
- [x] Reproduce PDF generation directly (works — 202KB PDF)
- [x] Reproduce via HTTP in dev + production (works locally)
- [x] Simulate missing browser → confirms root cause (LAUNCH FAILED: Browser was not found)
- [ ] Fix `server/src/utils/bill.ts`:
  - [ ] Auto-detect Chrome/Chromium (PUPPETEER_EXECUTABLE_PATH → puppeteer cache → system paths)
  - [ ] Reuse a single browser instance (lazy, across requests)
  - [ ] Clear error message if no browser found
- [ ] Test invoice (text/html) still works
- [ ] Test PDF download works
- [ ] Run build (`npm run build`)
- [ ] Provide root cause + changed files

## Not Changed
- Database / Prisma schema / Orders / Invoice generation / Authentication / Frontend UI

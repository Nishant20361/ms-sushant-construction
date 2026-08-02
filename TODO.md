# TODO — Unicode Font Invoice PDF Implementation

## Task
- [x] 1. Register `NotoSansDevanagari-Regular.ttf` + `NotoSansDevanagari-Bold.ttf` in `buildBillPdf()` using `import.meta.url`-relative paths
- [x] 2. Replace `Helvetica` / `Helvetica-Bold` with the registered Unicode fonts (fixes ₹ symbol + Hindi rendering)
- [x] 3. Rewrite PDF layout: A4, invoice header, business details, customer details, fixed-column product table, discount, final amount, footer message
- [x] 4. Add page-break safety so long item lists do not overflow the page
- [x] 5. Run `npm run typecheck` (server + client)
- [x] 6. Run `npm run build` (server + client)
- [x] 7. Final audit report


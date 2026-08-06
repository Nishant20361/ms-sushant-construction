# Phase 2 – Advanced Sales Analytics & Business Reports

## Backend
- [x] Create `server/src/utils/analytics.ts` (analytics engine)
- [x] Create `server/src/utils/export.ts` (CSV + XLSX export helpers)
- [x] Create `server/src/utils/analyticsPdf.ts` (customer statement + report PDF via Puppeteer)
- [x] Create `server/src/routes/admin/analytics.ts` (all requireAdmin endpoints)
- [x] Install `exceljs` (server)
- [x] Mount analytics router in `server/src/routes/admin/index.ts`

## Frontend
- [x] Install `recharts` (client)
- [x] Create `client/src/components/charts.tsx` (responsive reusable chart wrappers)
- [x] Create `client/src/pages/admin/AnalyticsDashboard.tsx`
- [x] Create `client/src/pages/admin/CustomerDueReport.tsx`
- [x] Create `client/src/pages/admin/CustomerStatement.tsx`
- [x] Create `client/src/pages/admin/ProductHistory.tsx`
- [x] Add analytics types to `client/src/types.ts`
- [x] Add analytics API methods to `client/src/lib/api.ts`
- [x] Add routes to `AdminRoutes.tsx`
- [x] Add nav items to `AdminLayout.tsx`

## Testing
- [x] prisma generate (clean)
- [x] Server typecheck (`npx tsc --noEmit`) — clean
- [x] Server build (`npm run build`) — clean
- [x] Client typecheck (`npx tsc -b --noEmit`) — clean
- [x] Client build (`npm run build`) — clean
- [x] Existing modules verified:
  - payment.test.ts: 19/19 pass (Order/Payment/Due/Dashboard logic intact)
  - api.test.ts: failures are pre-existing test-DB provisioning issues (products not seeded in isolated ms_sushant_test Postgres DB), unrelated to analytics changes
  - All changes are additive only — Orders, Billing, Invoice, Payment, Due Management, Auth, Products, Categories, Settings, and Sales Reports logic untouched
</content>

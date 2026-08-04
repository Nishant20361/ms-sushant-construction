# TODO — Temporary Admin Order Delete Feature

## Steps
- [x] 1. Backend: Add `DELETE /api/admin/orders/:id` route in `server/src/routes/admin/orders.ts`
  - requireAdmin + parseIntegerParam + 404 if not found
  - Prisma transaction: delete OrderItem → delete Bill (if exists) → delete Order
  - try/catch → clean HttpError (no Prisma stack traces)
  - writeAudit ORDER_DELETE
  - Return `{ success: true }`
- [x] 2. Client: Add `deleteOrder(id)` to `adminApi` in `client/src/lib/api.ts` (DELETE with CSRF)
- [x] 3. Client: Add Delete Order button + confirmation popup in `AdminOrders.tsx`
  - `window.confirm("Are you sure you want to permanently delete this order?")`
  - Toast on success/error, reload list
- [x] 4. Tests: Add delete-order test in `server/tests/api.test.ts`
  - Create dummy order + bill → DELETE → assert success + DB cleanup
- [x] 5. Verification
  - Run server build (`npm run build --workspace server`) ✅
  - Run typecheck (server + client) ✅
  - Run tests (`npm run test --workspace server`) ✅ 23/23 passed
  - Test deleting a dummy order (covered by test suite) ✅
  - Final report (files changed, API added, test results) ✅ DONE


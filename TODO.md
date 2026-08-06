# TODO: Phase 2 — Customer Due Management System

## Database
- [x] Add `notes String?` to `OrderPayment` model in `schema.prisma`
- [x] Create migration `20260808000000_add_payment_notes`
- [x] Run `prisma generate` + `prisma migrate deploy/status`

## Backend
- [x] Update `server/src/validators/index.ts` (payment notes + receiveCustomerPaymentSchema)
- [x] Update `server/src/utils/serializer.ts` (payment notes + customer detail serializers)
- [x] Update `server/src/routes/admin/orders.ts` (enriched due-snapshot filters, customer detail, customer-level FIFO payment)
- [x] Update `server/src/routes/admin/dashboard.ts` (cash/online split)
- [x] Update `server/src/routes/public.ts` order creation to store payment notes (if applicable)

## Frontend
- [x] Update `client/src/types.ts` (CustomerDue summary, OrderPayment.notes, CustomerDetail, PaymentHistoryEntry, dashboard cash/online)
- [x] Update `client/src/lib/api.ts` (getDuesSummary filters, getCustomerDetail, receiveCustomerPayment)
- [x] Update `client/src/pages/admin/AdminDues.tsx` (filters, customer detail view, payment history, customer-level receive payment)
- [x] Update `client/src/pages/admin/Dashboard.tsx` (Total Sales / Cash / Online / Due cards)

## Tests & Verification
- [x] Extend `server/tests/payment.test.ts` (customer summary/filters, FIFO allocation, customer-level payments, dashboard)
- [x] Run server build + typecheck
- [x] Run client build + typecheck
- [x] Run vitest suite


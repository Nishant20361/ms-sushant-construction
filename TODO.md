# Production Audit — M/S Sushant Construction

## ✅ CORS Fix (Completed)
- [x] Root cause: CORS allowlist in `server/src/app.ts` only allowed
  `http://localhost:5173` (from `CLIENT_URL`). Opening via `http://127.0.0.1:5173`
  was rejected with "Not allowed by CORS".
- [x] Fix: `isLoopbackOrigin()` allows `localhost`, `127.0.0.1`, `::1` origins
  in development; production uses strict `CLIENT_URL` allowlist.
- [x] Verified: preflight OPTIONS returns 204 + correct
  `Access-Control-Allow-Origin` for both `localhost` and `127.0.0.1`.
- [x] Verified: POST `/api/admin/auth/login` returns 200 with admin object +
  auth cookie when opened via `http://127.0.0.1:5173`.

## Phase 1: Build Verification
- [ ] npm install (workspaces)
- [ ] npm run typecheck (server + client)
- [ ] npm run build (server + client)
- [ ] Fix every build/type error

## Phase 2: Backend
- [ ] Verify all API endpoints (public + admin)
- [ ] Verify Prisma uses PostgreSQL
- [ ] Verify migrations are applied
- [ ] Verify seed works
- [ ] Verify admin account exists

## Phase 3: Frontend
- [ ] Verify every page loads
- [ ] Verify every route works
- [ ] Verify refresh on routes works
- [ ] Verify React Router production config

## Phase 4: Authentication
- [ ] Verify login
- [ ] Verify logout
- [ ] Verify session persistence
- [ ] Verify invalid login returns 401

## Phase 5: CSRF
- [ ] Verify GET /api/csrf
- [ ] Verify frontend fetches CSRF before login
- [ ] Verify login sends credentials: include + X-CSRF-Token
- [ ] Verify write APIs reject missing token with 403
- [ ] Verify valid token succeeds

## Phase 6: Cookies
- [ ] Verify Secure, SameSite, HttpOnly settings
- [ ] Verify Render proxy config (trust proxy)
- [ ] Verify cookies present in browser

## Phase 7: CORS
- [ ] Verify CLIENT_URL matches deployed frontend
- [ ] Verify credentials enabled
- [ ] Verify unauthorized origins rejected

## Phase 8: Admin
- [ ] Dashboard
- [ ] Products CRUD
- [ ] Categories CRUD
- [ ] Orders CRUD
- [ ] Settings page
- [ ] Image upload
- [ ] Password change

## Phase 9: Customer
- [ ] Home page
- [ ] Products
- [ ] Cart
- [ ] Checkout
- [ ] Order creation
- [ ] Order history

## Phase 10: Database
- [ ] Verify reads
- [ ] Verify writes
- [ ] Verify stock updates
- [ ] Verify no failed transactions
- [ ] Verify order creation

## Phase 11: Production
- [ ] Verify both deployed URLs work
- [ ] No console errors
- [ ] No network failures
- [ ] No 404
- [ ] No 500
- [ ] No CORS issues
- [ ] No CSRF issues

## Phase 12: Security
- [ ] No secrets exposed
- [ ] CSRF not disabled
- [ ] Security not weakened
- [ ] No hardcoded credentials

## Phase 13: Final Verification
- [ ] All tests pass, report PASS/FAIL per feature
</content>


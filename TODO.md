# Cloudinary Upload Integration Fix

## Analysis
- `server/src/utils/cloudinary.ts` exists and is configured, but is **never imported/used**.
- The upload route `server/src/routes/admin/uploads.ts` currently saves to local disk and returns `/uploads/products/<file>.webp`.
- Cloudinary credentials live in the **root** `.env`, but `server/src/config.ts` only loads `server/.env` (which has only `DATABASE_URL`). So `cloudinary.config()` runs with undefined values → "Must supply api_key" at runtime.
- Client already handles `https://` URLs via `resolveImageUrl` and CSP `imgSrc https:` allows Cloudinary. No frontend change needed.
- Logo/banner/business-logo uploads reuse `/api/admin/uploads`, so fixing the route covers them.
- No category image upload exists (Category has no image field) — not applicable.

## Plan (approved by user)
1. Make `cloudinary.ts` defensively load env vars (root `.env` + `server/.env`) before `cloudinary.config()`.
2. Update upload route: Multer → Sharp optimize → Cloudinary upload → return `{ url: secure_url }`. Clean up temp files.
3. Update `scripts/verify-upload.ts` to assert a real Cloudinary URL and reachability.
4. Append Cloudinary vars to `server/.env` (values never printed).

## Steps
- [x] 1. Update `server/src/utils/cloudinary.ts` (env loading guard)
- [x] 2. Update `server/src/routes/admin/uploads.ts` (Cloudinary upload)
- [x] 3. Update `server/scripts/verify-upload.ts` (Cloudinary verification)
- [x] 4. Append Cloudinary vars to `server/.env`
- [x] 5. `cd server && npm install`
- [x] 6. `npx prisma generate`
- [x] 7. `npm test`
- [x] 8. `npm run build`
- [x] 9. Start `npm run dev` + verify `/api/health`
- [x] 10. Run `npx tsx scripts/verify-upload.ts` (real Cloudinary upload)
- [x] 11. Verify product image save + frontend display path (E2E script passed — see `scripts/e2e-verify-cloudinary.ts`)


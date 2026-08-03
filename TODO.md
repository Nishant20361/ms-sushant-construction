# Product Delete Error Fix - TODO

## Steps
- [x] Modify `server/src/routes/admin/products.ts` DELETE handler:
  - [x] Block deletion when product has related order items (return clean "Unable to delete product" via HttpError)
  - [x] Wrap delete transaction in try/catch to convert any Prisma error into clean message
  - [x] Keep success path + audit log unchanged
- [x] Build server: `cd server && npm run build`
- [x] Run server tests: `npm test`
- [x] Build frontend: `cd client && npm run build`
- [x] Verify: delete works, success message appears, no Prisma stack trace in browser

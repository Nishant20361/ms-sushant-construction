# Admin security and quantity-input fixes

## Changes

- Changing the recovery/notification email requires the current admin password even when 2FA is disabled. Existing 2FA email-change restrictions remain. Web and admin-app forms now send the password explicitly; the web form saves on a button press instead of each keystroke.
- Failed, unknown-user and account-locked password logins use the same public response. Password verification also runs for unknown users. The database still tracks failures and enforces the ten-attempt, fifteen-minute account lockout.
- The Khatabook profit API requires a fifteen-minute PIN unlock stored against the authenticated device session. Explicit lock clears it on the server. PIN/security updates revoke existing unlocks. The shared default PIN is removed; initial setup requires the admin password or the existing recovery flow.
- Khatabook PIN protection is an extra gate on its profit endpoint, not a new role system: ordinary admin order, billing, stock and reporting permissions remain available to authenticated admins through their existing endpoints.
- Vercel frontend responses receive CSP, anti-framing, content-type and referrer headers. If the API hostname changes, update the CSP connect-src allowlist too.
- In the admin app's customer-order product grid, quantity inputs have their own full-width, 44-point-high touch area. Long unit labels no longer compete with the input for horizontal space. Cart quantity edits retain blank/decimal drafts and reject invalid quantities before checkout instead of snapping back while typing. Whole-unit handling matches the server for labels such as `piece (12 m)` and `sheet`.
- The customer mobile app home badge now says Dhanbad instead of Bihar.

## Deployment

The backend requires the included `20261010190000_khatabook_session_unlock` migration. Run `prisma migrate deploy` before starting the updated server; the repository's server start script already does this. Generate the Prisma client during the build as usual.

Deploy the backend and web client together. Rebuild/install the admin and customer mobile apps for their UI changes; pushing source does not update an already installed APK. Existing admin apps cannot change recovery email without the updated password field.

## Validation

- Backend build/typecheck and 57 tests in the database-independent configuration passed, including six route-level security regressions with real password hashing/JWT/CSRF middleware and isolated database/provider mocks.
- Admin app typecheck and 72 unit tests passed, including quantity-editing regressions.
- Web client typecheck, production build and six unit tests passed.
- Full PostgreSQL integration tests and migration execution were not run: no isolated PostgreSQL test database was available. No production database was touched.
- The reported tap issue was addressed from layout inspection; the updated screen still needs testing on the affected Android device. No native APK was built in this environment.

Use the root `npm run test:unit` and the app's `npm test` for unit tests. For the backend database-independent tests alone, run `npm run test:unit` in `server`. Integration tests require an explicit isolated `TEST_DATABASE_URL` as documented by the repository test configuration.

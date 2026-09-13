# Production audit — September 13, 2026

The changes are implemented and locally verified across the API, website and both mobile apps. **Release gates remain**: rotate the exposed provider credential, resolve or explicitly assess the remaining mobile advisories, and complete deployed-browser and physical-device smoke tests. No production database was modified and nothing was deployed.

## Fixed findings

| Area | Finding and resulting behavior |
| --- | --- |
| Provider credentials | Removed a hardcoded AgentRouter API key and misleading startup logs. Keys are environment-only; AgentRouter fails immediately without a key and cannot call the network during tests. The removed key still needs revocation at the provider. |
| Database deployment | Migrations were missing `Admin.passwordChangedAt`, `SiteSetting.heroVideoUrl` and `mobileHeroVideoUrl`. Added an idempotent migration and aligned the purchase-batch UUID default with the existing SQL default. Migration-only provisioning now matches the Prisma schema. |
| Concurrent login | Failed-password increments and session-cap enforcement now serialize per admin. Concurrent device logins cannot exceed the configured cap. An expired lockout starts a fresh failure window. |
| Sessions | Require a stored, unexpired session associated with the correct admin and token hash. Reject legacy sessionless tokens. Database failures are no longer disguised as authentication failures that force users to log out. |
| Two-factor authentication | Verification codes are consumed atomically and lock after five incorrect guesses. Password changes invalidate pending challenges. Enabled 2FA cannot silently bypass verification when email is absent. Changing 2FA requires the current password; changing its recovery email requires disabling 2FA first. Failed OTP delivery now produces an error. |
| Customer privacy | A phone number alone no longer reveals a customer's name, address or order history. Guest history requires a known order reference and matching phone; profile lookup without proof returns null. Admin lookup remains authenticated. New order references use an unpredictable 64-bit suffix, replacing the collision-prone 16-bit suffix. |
| Web checkout | Persist an idempotency key for each unchanged checkout attempt, including retries after a dropped response. Guard duplicate submissions. Share CSRF initialization across concurrent writes and refresh a rejected token once. Requests have timeouts. |
| Web cart | Reject malformed persisted entries, duplicates, invalid prices and non-finite quantities. Align whole-unit quantities with the server and refresh price/stock when adding an existing item. Remove unverified phone-based autofill and its misleading existing/new-customer indicators. |
| Catalog | Hide products in inactive categories and reject their purchase. Public orders record their web/app source. |
| Inventory | Reactivating cancelled orders conditionally decrements stock so concurrent requests cannot oversell. Order items are processed in stable product order. |
| Accounting retention | Orders with payment records cannot be deleted. Unpaid orders must be cancelled before deletion, ensuring stock is restored. The web delete control explains these restrictions. |
| Uploads | A WebP upload could be deleted by cleanup because its original and final names collided. Optimized and temporary files now have distinct names. Malformed multipart requests receive a client error. |
| Recovery settings | Changing the Khatabook recovery address no longer overwrites every administrator's email. Database read failures do not fall back to potentially stale PIN credentials. Failed recovery email delivery is reported. |
| HTTP behavior | Return appropriate errors for invalid JSON, excessive request bodies, unsupported encodings and malformed upload paths. CORS permits checkout idempotency headers. Admin responses and customer lookups use `no-store`. Production CSRF cookies are always Secure. |
| Runtime | Connect to the database before listening; expose database readiness separately from liveness; exit on fatal asynchronous errors and shut down gracefully. Bound assistant session count and stop retaining base64 photos in conversation history. Add a web render-error recovery screen. |
| Mobile | Require order-reference verification for history. Add password confirmation for 2FA settings. Bound native CSRF initialization and respect already-cancelled customer requests. |
| Dependencies | Upgrade vulnerable build/test/upload dependencies and compatible transitive packages. Align Vite across the React plugin and test runner. Pin compatible UUID overrides for ExcelJS and Expo's Xcode generator. Root npm audit has no remaining findings. |
| Tooling | Restrict destructive tests to a separate local database with `test` in its name, reject application-database aliases, isolate provider credentials, and remove automatic data-loss acceptance from normal `db:push`. Source packaging respects Git ignores, rejects secrets/signing keys and skips symlinks. |
| CI | Use Node 24, check backend/web quality and migrations, compare migrated schema, run tests and the production dependency audit, and typecheck/test/export both Android apps. |

## Verification

- Server: **188 tests pass**, including real PostgreSQL concurrency, accounting, upload and security tests.
- Website: **6 tests pass** for cart validation, concurrent CSRF initialization and safe checkout retries.
- Admin mobile: **69 tests pass**; both mobile TypeScript checks pass.
- Packaging: **2 tests pass**; generated ZIP inspected to verify private environments, uploads, dependencies and signing keys are excluded.
- Root lint, TypeScript checks and production build pass.
- Both Android JavaScript/Hermes bundles export successfully. These are not signed APK/AAB builds or installed-device tests.
- All **24 SQL migrations** applied to a disposable database. `prisma migrate diff --exit-code` reports no difference from the Prisma schema after the corrective migration.
- The built server passed a local **production-mode smoke test**: readiness, public settings, secure CSRF cookies, disallowed-origin rejection, protected admin access and clean SIGTERM shutdown.
- Root dependency audit: **0 vulnerabilities**. Both mobile lockfiles retain **7 findings each: 4 high and 3 moderate**, including dependency-chain duplicates described below.

Testing used disposable PostgreSQL databases on loopback port 55439, not the configured development or production databases. Local execution used Node 26; the updated CI targets Node 24 and has not been run remotely during this task.

## Remaining release gates

1. **Revoke the exposed AgentRouter key** in the provider account, then supply a fresh `AGENTROUTER_API_KEY` if this provider is needed. Removing it from source does not invalidate the credential or remove it from Git history. The value is intentionally omitted from this report.
2. **Address mobile dependency findings.** `image-size` and its Metro dependency chain account for four high findings in each mobile tree; the audited affected range includes all published image-size versions. The issue concerns malformed image parsing in build tooling. `decode-uri-component`, `query-string` and `expo-router` account for three moderate findings; the dependency decoder can consume excessive CPU on malformed percent-encoded input. npm proposes an incompatible Expo Router downgrade. The available patched decoder uses ESM, while the installed query-string calls its CommonJS function export, so blindly overriding it would break routing. A compatible upstream release or a reviewed compatibility patch plus route/device tests is still needed. See the [image parser advisory](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr), [additional parser advisory](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) and [URI decoder advisory](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr).
3. **Release the updated clients with the API.** Old mobile history requests omit the newly required order reference. Old admin clients cannot change 2FA without sending the current password. Checkout still accepts manual customer details. Existing guest order references remain valid; guest tracking relies on possession of a reference and matching phone number, not verified customer sign-in.
4. **Verify hosting configuration and real integrations.** Set a random JWT secret of at least 32 characters, the exact HTTPS frontend origin, a managed database and durable uploads. Run migrations before starting the new code; back up the real database first. Configure readiness monitoring and test email/reset/OTP, image upload, checkout, payments and push on the deployed environment. Test cookie authentication in browsers with third-party-cookie restrictions; prefer a shared site domain or same-origin API proxy where needed.
5. **Complete interactive checks.** No browser was available in the connected browser runtime, so visual browser verification could not be performed. Native installed builds, physical-device behavior, iOS builds, load tests, multi-instance behavior and backup restoration were not verified. In-memory rate limits and assistant sessions are per process; a multi-instance deployment needs shared state if global enforcement/session continuity is required.

## Reproduce

Use `npm ci` at the repository root and separately in `mobile/` and `admin-mobile/`. The runtime recommendation is recorded in `.nvmrc`; supported release lifecycles are listed in the [Node.js release documentation](https://nodejs.org/en/about/previous-releases).

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run build
# Set a distinct local TEST_DATABASE_URL before the integration suite:
npm test
npm audit
npm run package
```

Run `npm run typecheck`, `npm test --if-present`, and `npx expo export --platform android --output-dir /tmp/expo-export` inside each mobile directory. `npm run start --workspace server` applies migrations before launching the API. No database reset is part of production startup.

# Sushant Control

## Phase 10 production and release guide

Sushant Control is an Android-first Expo Router application for `com.mssushantconstruction.admin`. It uses React Query for bounded in-memory server state, the native cookie jar for the server-issued HttpOnly Admin session, an in-memory CSRF token, and authenticated server APIs for Dashboard, Orders, Products, Categories, Dues, Payments, Billing, Analytics, Reports, Notifications, Settings, and Account. CSV/XLSX/PDF output is generated in app-scoped cache and handed to the Android share/print UI; it is not stored as permanent app data.

### Local run and native rebuild

```bash
cd admin-mobile
npm install --legacy-peer-deps
EXPO_PUBLIC_ADMIN_API_BASE_URL=https://your-development-api.example/api npx expo start --dev-client
```

Native dependencies include the cookie manager, image picker, printing, sharing, and notifications. After changing a native dependency or `app.json`, rebuild the development client:

```bash
npx expo run:android --device
```

Select `RMX3840` when prompted. Expo Go is not a supported authentication or push test environment. Development may use an explicit HTTP loopback URL; non-development builds accept HTTPS only. With no override, the app uses `https://ms-sushant-construction.onrender.com/api` and never falls back to localhost.

### Push architecture and prerequisites

The database notification is canonical and Expo push is best-effort. The server supports `NEW_ORDER`, `LOW_STOCK`, `OUT_OF_STOCK`, and `PAYMENT_RECEIVED`; deterministic keys suppress duplicate notification records. Delivery errors cannot roll back orders, stock, or payments. Account is the only place that requests notification permission. Logout and password change unregister only the current device; an immediate `DeviceNotRegistered` response deactivates a token.

Real Android push requires all of the following before release:

- an Expo project linked to this app and its real `extra.eas.projectId` in Expo config;
- a Firebase Android app whose package is `com.mssushantconstruction.admin`;
- `google-services.json` referenced by `expo.android.googleServicesFile` (do not add a placeholder file);
- the corresponding FCM v1 service-account credential uploaded securely to the Expo/EAS project;
- a newly compiled development or release client, followed by foreground/background/terminated delivery and tap-routing tests on a physical device.

Never copy service-account private keys, signing passwords, session secrets, or production environment values into this repository. Push receipt polling is not implemented because the server has no background-job scheduler. Immediate ticket errors are handled, but delayed provider failures require operational monitoring. In-app notification retention remains three days; 7–30 days is recommended for production review.

### Production prerequisites and release process

Before any production rollout: back up the database and environment configuration; review and apply `20260821090000_phase9_push_notifications`; verify the migrated schema; deploy the compatible server; verify existing/new notifications and Admin login; configure Expo/FCM; then register a real device and test push. Do not deploy the new server before its required additive migration is present. Roll back application code independently while retaining the additive columns/table; do not destructively reverse the migration after data is written.

Production server configuration requires `DATABASE_URL`, a strong `JWT_SECRET`, and an HTTPS `CLIENT_URL`. Deployment-specific Admin bootstrap credentials are required only for controlled bootstrap/reset operations. Configure Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) for durable uploads and either Brevo or SMTP variables for email. `COOKIE_DOMAIN`, `TRUST_PROXY`, Groq, and email-provider alternatives are deployment-dependent. Keep all values in the deployment secret manager.

For Android distribution, retain ownership and an encrypted offline backup of the release keystore, never commit it, and increment `android.versionCode` for every published binary while updating the user-facing app version. Prefer Play managed distribution or a controlled enterprise channel for this Admin app. Customer APK update fields in Settings apply only to the customer application and must not be reused as a Sushant Control self-update channel.

Phase 10 validation commands are:

```bash
npm run typecheck
npm test
npx expo-doctor
npx expo export --platform android
cd android && ./gradlew compileDebugKotlin
```

Known release limitations are: real push is blocked until Expo project ID and FCM credentials are supplied; push receipts are not polled; payment POST endpoints have no idempotency key and therefore must never be automatically retried; the three-day notification history is short; and Expo Doctor sees the repository parent React 18 alongside the Admin-local React 19 even though Admin compilation/export resolves its local dependency. A release APK/AAB, EAS build, signing configuration, production migration, and deployment all require separate explicit approval.

## Phase 9 settings, account and Android push

Settings and Account now use the authenticated server settings/profile contracts. Business, website, customer-app, update, invoice and image fields are saved explicitly; theme remains a local non-sensitive preference. Password changes unregister this device where possible, invalidate the server session and return to Login.

Android push uses `expo-notifications` and Expo Push Service. The Admin explicitly enables notifications from Account; startup never prompts unexpectedly. The app creates Orders, Inventory, Payments and General channels, registers only the Expo token with the authenticated/CSRF-protected backend, and unregisters only this device on logout/password change. Raw tokens are never displayed or logged. A configured Expo `projectId` and Android FCM credentials are still required for real delivery.

The in-app database notification is canonical; push is best-effort delivery. Supported events are `NEW_ORDER`, threshold-crossing `LOW_STOCK`, `OUT_OF_STOCK`, and one `PAYMENT_RECEIVED` event per order-payment or customer FIFO action. Deterministic dedupe keys and transition checks suppress repeats. Provider failure never rolls back orders, stock or payments. Immediate `DeviceNotRegistered` responses deactivate tokens; receipt polling is deferred because this server has no background-job scheduler.

Foreground delivery refreshes notification queries without an intrusive banner. Background/terminated delivery is handled by Android/Expo when network, FCM credentials and OS battery policy permit. Push taps use explicit IDs and wait for authentication before protected navigation. The existing three-day in-app retention remains unchanged. Phase 10 must complete real-device/credential QA, receipt operations and production hardening.

## Phase 8 analytics, reports, exports and notifications

Analytics uses the existing authenticated server KPIs, rankings and chart endpoints. Reports cover daily/weekly/monthly sales, customer dues, customer statements and product history. CSV/XLSX exports are authenticated, written only to app-scoped cache, and handed to the native share sheet.

The in-app Notification Center supports all/unread views, mark-one/mark-all, refresh, cached offline display and order deep links. The server remains authoritative and retains these order alerts for three days. Its current Prisma model has no event type, title or message fields, so low-stock, out-of-stock and payment-received event creation was intentionally not added: doing so safely requires the schema migration prohibited in Phase 8.

Android-first native Admin application for **M/S Sushant Construction**. Phase 4 adds the real authenticated app shell and live operational Dashboard while preserving Phase 3 secure authentication and the Phase 2 design system. Android identity remains `com.mssushantconstruction.admin`.

## Phase 4 Dashboard and app shell

The authenticated Expo Router hierarchy is `/(admin)` → guarded Stack → `(tabs)` with five safe-area-aware destinations: Dashboard, Orders, Products, Dues, and More. Dashboard is real; the other four are explicit polished boundaries and make no business requests. More provides the existing confirmed Logout action and lists future modules without pretending they are implemented.

The Dashboard consumes only existing bounded authenticated GET contracts:

| Endpoint | Purpose | Shape/limits |
|---|---|---|
| `GET /api/admin/dashboard` | Business overview | `stats`, five `recentOrders`, at most ten `lowStockProducts` |
| `GET /api/admin/notifications?limit=1` | Header unread badge | one notification maximum plus authoritative `unreadCount` |

Both require the existing HttpOnly Admin cookie; GET requests require no CSRF header. No Dashboard mutation exists. Requests use the shared `AdminApiClient`, accept React Query cancellation signals, and retain centralized 401 handling.

Dashboard values are runtime-normalized because Prisma decimal-like values may arrive as strings and optional/unknown fields must not crash UI. Null/invalid/negative amounts become safe zero values, missing text receives explicit neutral labels, invalid dates render through the shared safe formatter, and unknown order statuses display a labeled neutral badge.

`stats.totalRevenue` is presented accurately as **Recorded sales value — non-cancelled order subtotals**. It is not renamed “today's sales” because the current Dashboard contract is lifetime-oriented and differs semantically from Analytics/Sales Reports. `lowStockCount` is labeled **Low-stock preview** because the server calculates it from a query capped at ten products; it is not claimed as a complete total. Total due is used directly from the server. No customer-due list is downloaded or summed on-device.

### Query, refresh, and offline policy

- Overview and unread-summary queries start in parallel with stable query keys and a 60-second stale window.
- Initial load uses a full Dashboard skeleton; pull-to-refresh retains existing content and uses the native refresh indicator.
- `@react-native-community/netinfo` connects native reachability to React Query's `onlineManager`; AppState connects to `focusManager`. Reconnect and foreground refetch therefore use React Query's existing policy without custom request loops.
- One safe retry is allowed for Dashboard reads; 401 still invalidates through AuthProvider, 403 remains a visible access error, and 429 receives retry-later wording.
- In-memory data remains visible with a compact offline/stale banner. With no cached data, the Dashboard shows a professional offline/error state and Retry. Financial data is never persisted.
- The timestamp uses `dataUpdatedAt` and is computed only on render/refetch—there is no continuous timer.

### UI, responsiveness, and performance

The header uses the local-time greeting, safe Admin username, crisp compact logo, real unread count when available, and account access. A restrained financial hero shows recorded sales, collected value, due, and total orders. A responsive two-column metric grid shows pending orders, active products, total due, and explicitly limited low-stock preview. Recent orders and five low-stock rows are bounded summaries with safe empty states.

The Dashboard uses one vertical ScrollView because all server previews are strictly bounded; later full modules must use paginated FlatList/SectionList. Content is capped at 620dp, metric widths derive from available width, financial text shrinks safely, customer/product names truncate, and the tab bar retains 48dp+ targets with filled-icon plus background active state. No charts, animations, fake values, nested long lists, or repeated computations were added.

Light, Dark, and live System themes all consume semantic tokens. Refresh indicators, bottom navigation, skeletons, banners, badges, modals, and placeholders use themed colors. Accessibility includes labeled financial values, notification count, tab destinations, status text/icons, scalable text, and safe Logout confirmation.

### Logo correction

The Phase 2 `logo.png` is a textured square illustration. Android downsampling at 48–72dp blended its smoky background and fine detail into a washed-out block. Phase 4 adds a dedicated 1024×1024 transparent, flat `assets/logo-mark.png`; `BrandLogo` renders it with `contain`, zero fade, no tint, and no stretch. Launcher and splash assets remain separate and unchanged.

### Generated Android directory

`android/` was generated by the successful local Expo development build. It remains on disk for native debugging but is ignored as CNG output; `app.json` and installed native packages remain the source configuration. Do not run `expo prebuild --clean`. Because Phase 4 adds NetInfo native code, rebuild the existing development client once with `npx expo run:android --device`; subsequent JavaScript-only iterations can use `npx expo start --dev-client`.

## Native authentication architecture

The app reuses the existing web security model:

1. `GET /api/csrf` creates the API-origin double-submit cookie and returns the paired value.
2. `POST /api/admin/auth/login` sends `{ username, password }` with `X-CSRF-Token`.
3. The server places the 24-hour JWT only in the Secure, HttpOnly `ms_sushant_admin_token` cookie. JavaScript never receives or stores it.
4. React Native fetch shares the platform cookie jar. `@preeternal/react-native-cookie-manager` supplies persistence barriers and reliable cleanup; no cookie value is copied into JS storage.
5. `GET /api/admin/auth/me` verifies JWT issuer/audience, expiry, active Admin state, and `passwordChangedAt` before protected content appears.

The CSRF value is held in memory only. Mutations acquire it lazily, concurrent acquisition is deduplicated, and the exact backend CSRF rejection triggers one refresh/retry at most. Ordinary 403 responses never log the Admin out. Login, forgot/reset, and other expected unauthenticated 401s suppress centralized expiry handling.

No JWT, password, profile, cookie, CSRF value, or Admin response is stored in AsyncStorage. AsyncStorage remains exclusively for the non-sensitive `light | dark | system` preference. SecureStore is unnecessary because the native cookie jar owns the persistent HttpOnly credential.

## Native-build requirement

The cookie manager is native code. It works in Expo development/production builds but **not Expo Go**. A custom local development build is required for physical session/cookie QA; this phase deliberately does not run EAS or build an APK/AAB. Standard Expo JavaScript export still validates bundling.

The server supplies `Max-Age` for both auth and CSRF cookies, so native stores can restore them after restart. Android calls an explicit cookie flush after issuance; iOS Foundation networking persists the cookie without a WebView. Logout attempts scoped auth/CSRF deletion and falls back to clearing this app's cookie stores on older Android WebView providers.

## Session lifecycle and routing

- Startup stays `unknown` and renders only a checking state until `/auth/me` resolves.
- Valid session → guarded `/(admin)/(tabs)` Dashboard shell.
- Missing/invalid session → `/(auth)` Login.
- Offline startup → Login with “connect to continue”; a potentially valid cookie is retained but no protected content is exposed.
- After five meaningful foreground minutes, `/auth/me` is revalidated. Brief backgrounding does not log out or create request loops.
- A genuine centralized 401 clears cookie transport, Admin profile, and the entire React Query cache, then returns to Login with a calm expiry notice.
- Logout calls the CSRF-protected backend endpoint where possible, but local cookie/profile/query cleanup always completes if the network fails. In that case the server cookie may remain valid until expiry, but it is removed from this app's jar.

Only safe profile fields from login/`/me` are retained in memory: `id`, `username`, nullable `email`, server-reported `role`, and response timestamps when supplied. Role-level authorization remains an existing backend gap; the app does not invent client-only permissions.

## Auth screens and actions

- Real premium Login with Username, Password, show/hide, password-manager metadata, loading lock, and safe invalid/offline/server/rate-limit messages.
- Real Forgot Password using `{ email }` and the generic non-enumerating response.
- Real Reset Password accepting the route/deep-link `token`, enforcing 12–128 characters plus confirmation, then returning to Login with success.
- Reusable `changePassword(currentPassword, newPassword)` service. The backend clears the cookie and invalidates older sessions through `passwordChangedAt`; a future Account screen must clear local auth immediately after success.
- Real logout with a safe confirmation dialog.

The existing scheme supports `sushantcontrol://reset-password?token=...`. The app never logs the token and removes it from navigation history after success. Current server emails intentionally continue pointing to the website reset URL from `CLIENT_URL`; enabling native email links later requires an explicit product/server decision and was not silently changed.

## Security and error policy

- Production API is HTTPS-only and credential-bearing URLs are rejected by shared environment validation.
- 401 means invalid session except on explicitly unauthenticated auth operations.
- 403 means forbidden and does not imply expiry; only the exact CSRF error receives one retry.
- 429 is shown professionally and never automatically retried.
- Passwords are never logged/persisted and are cleared after success/unmount where practical.
- Auth operations are not React Query mutations and receive no automatic retries. Duplicate submission is disabled while loading.
- Logout/session invalidation clears Admin-sensitive query cache. No query-cache persistence exists.

## Protected navigation boundary

Dashboard is the only live business module in Phase 4. Orders, Products, and Dues are route placeholders; More lists Analytics, Categories, Billing, Reports, Settings, and Account as locked future modules. No placeholder calls an API or displays fake records.

## React duplicate-version audit

Admin has its isolated React 19.2.3 install while the repository parent currently exposes React 18.3.1 for existing workspaces. Admin TypeScript and Android Metro export resolve and bundle successfully from `admin-mobile/node_modules`; no actual duplicate-module runtime failure was observed. Parent dependencies were deliberately left untouched to avoid destabilizing client/server/customer mobile. A custom native-device smoke test remains required.

## Testing and verification

```bash
npm test
npm run typecheck
npm run doctor
npx expo export --platform android
```

Focused tests cover valid/unauthenticated/offline startup policy, centralized 401 versus 403/429, exact one-time CSRF retry, invalid credentials, rate-limit UX, and reset validation. Real login, persistence, restart, foreground restoration, logout cookie removal, autofill, TalkBack, and reset deep links require a custom native build and authorized test credentials. Never use or print `INITIAL_ADMIN_PASSWORD` for automation.

## Existing backend gaps intentionally unchanged

Role-level authorization; order-deletion stock restore; payment-filter mismatch; invoice HTML escaping; dashboard sales mismatch; capped low-stock count; web expired-session handling; and stock ledger remain controlled future work.

No database/schema/migration, server route, web Admin, customer app, business feature, deployment, signing, EAS, APK/AAB, commit, or push is part of Phase 3.
# Sushant Control (Admin Mobile)

## Phase 7: Dues, Payments, Billing and Invoices

The Dues tab now loads customer-level server balances from `GET /api/admin/orders/due-snapshot`, with search/date/payment filters and customer detail from `GET /api/admin/orders/customer/:mobile`. Customer payments use `POST /api/admin/orders/customer/:mobile/payments`; the server transactionally allocates the amount oldest-first and may create multiple append-only `OrderPayment` rows. Order payments use `POST /api/admin/orders/:id/payments`. Modes are `CASH` and Admin-recorded `ONLINE` only—there is no gateway or bank verification, and payment rows cannot be edited or deleted.

Billing is available under More and from Order Details. It reads and saves discount-only bills through `GET/POST/PUT /api/admin/orders/:id/bill`. Final amount is subtotal minus discount; no GST/tax is calculated, and the order number remains the invoice number. Authenticated server text/HTML from `/bill/text` and `/bill/html` power clipboard, native text share, WhatsApp handoff, native print, and server-HTML-to-PDF sharing. This preserves server business metadata and Devanagari-capable output rather than rebuilding invoices in JavaScript.

Financial mutations are pessimistic, disabled offline, protected from repeat taps while active, and invalidate Dues, Orders, Billing and Dashboard queries. The backend has no payment idempotency key, so exactly-once behavior cannot be guaranteed across transport failure/retry; the app never automatically retries financial mutations. Payment, customer-payment and bill routes write audit records but create no notification records. Phase 8/9 notification support remains separate.

Phase 7 adds official Expo `expo-print`, `expo-sharing` and `expo-clipboard` modules. Rebuild the development client using `npx expo run --device` and select `RMX3840`. Use approved test financial records only; never alter an important production balance for QA. Phase 8 analytics, exports and Notification Center work is intentionally excluded.

## Phase 6: Products, Categories, Images and Current Stock

The Products tab now provides real paginated Products management with server-backed search, category and active-state filters, fixed-size image thumbnails, create/edit forms, current-stock editing, active toggling and guarded deletion. Categories are available under More → Categories with list, create, edit, visibility and server-controlled delete/deactivate behavior.

Products consume `GET/POST /api/admin/products`, `GET/PUT/DELETE /api/admin/products/:id`, and `PATCH /api/admin/products/:id/toggle`. Categories consume `GET/POST /api/admin/categories` and `PUT/DELETE /api/admin/categories/:id`. Images use authenticated `POST /api/admin/uploads`, multipart field `file`; JPEG, PNG and WebP up to 5 MB are accepted, re-encoded to WebP when possible, and stored through Cloudinary or the configured local fallback. Gallery/camera permissions are requested only after the corresponding action. A selected image is previewed locally and uploaded only during Save; the saved server URL then becomes authoritative.

Stock is a direct current value rounded to three decimals. Bag and piece values are validated as whole numbers in the native UX; the server remains authoritative. There is no inventory adjustment ledger, receipt history, reason history or stock valuation API, so none is represented. Low-stock labels use the Dashboard/profile threshold semantics; out-of-stock is always zero or below. Product, Category, Orders picker and Dashboard queries are selectively invalidated after mutations. Cached in-memory reads can remain visible offline, while all catalog/image/stock mutations are disabled and never queued.

The current backend creates `NEW_ORDER` notifications during public order creation only. Product edits and order stock deduction do not create low/out-of-stock notifications, and no duplicate-suppression flow exists for such events. That remains a Phase 8/9 backend requirement; no notification or push infrastructure was added here.

Because `expo-image-picker` is a native dependency, rebuild the development client with `npx expo run --device` and choose `RMX3840`. Verify list/search/filter/pagination/refresh, images, create/edit/toggle/delete restrictions, integer and decimal stock, Dashboard refresh, Categories, the Orders product picker, offline mutation blocking, themes and session behavior. Use approved test data only. Phase 7 Payments/Billing work is intentionally excluded.

## Phase 5: native Orders management

The authenticated Orders tab now consumes the existing Admin API and provides a paginated, virtualized list; 350 ms server-backed search; status, payment-status, and date filters; pull-to-refresh; order details; stock-aware status changes; and server-authoritative item editing. No sample order data is used.

Consumed endpoints:

- `GET /api/admin/orders` with `search`, `status`, `paymentStatus`, `from`, `to`, `page`, and `limit`
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id/status`
- `PATCH /api/admin/orders/:id/edit`
- `GET /api/admin/products` for the bounded, active-product edit picker

The list requests 20 rows at a time and the picker requests at most 30 products per search. Query keys separate list filters, details, and picker searches. Status/edit success invalidates Orders and Dashboard queries. Cancellation restores stock under existing server rules; reactivation reserves stock and may fail if inventory is insufficient. Item edits remain pessimistic, and the backend recalculates prices, subtotal, stock, and existing bill values.

Payments and Billing remain deferred: details show read-only payment history and link outstanding balances to the Dues boundary. The native app intentionally does not expose permanent order deletion because the existing hard-delete endpoint does not restore stock. No offline mutation queue exists; cached reads may remain visible while status/edit controls are disabled offline.

## Real-device Orders QA

With the existing debug development client installed, run `npx expo start --dev-client`, open Sushant Control, and verify list/search/filters/pagination/refresh/details, customer links, totals, status confirmation, edit add/remove/quantity behavior, server stock rejection, Dashboard refresh, offline reads and disabled mutations, all theme modes, and sign-out. Never delete or cancel a real customer order merely for testing.

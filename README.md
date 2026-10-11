<p align="center">
  <img src="assets/readme-hero.svg" alt="M/S Sushant Construction — Building trust, delivering quality" width="100%" />
</p>

<h1 align="center">M/S Sushant Construction</h1>

<p align="center">
  A modern construction-material ordering platform with a customer storefront, secure admin workspace, stock control, billing, reports, and a bilingual construction assistant.
</p>

<p align="center">
  <a href="https://github.com/Nishant20361">GitHub profile</a>
  &nbsp;•&nbsp;
  <a href="https://ms-sushant-construction-client.vercel.app">Live website</a>
  &nbsp;•&nbsp;
  <a href="LICENSE.md">MIT License</a>
</p>

## Business Saathi — private admin companion

The web admin and Sushant Control source now include a discreet Business Saathi shortcut: customer udhari lookup with PIN protection and same-name selection, plus friendly Hindi/Hinglish/English business advice and voice dictation. It cannot change business records or generate reports. [Setup, scope and verification](docs/business-saathi.md).

## Latest source update — October 2026

- Admin recovery email changes require the current password; failed login responses are consistent.
- Khatabook profit access requires a server-verified PIN unlock that expires after 15 minutes.
- Admin Android customer-order quantity fields have dedicated touch space and editable quantity drafts.
- Customer Android home branding now says **Dhanbad**.
- Production dependencies are updated to patched versions. [Verified CI run](https://github.com/Nishant20361/ms-sushant-construction/actions/runs/38079177553) passed backend checks, database migrations, tests and both Android bundle exports; its production dependency audit reported zero vulnerabilities.

[Release notes and downloads](https://github.com/Nishant20361/ms-sushant-construction/releases) · [Security and input update details](docs/admin-security-and-input-fixes.md)

**Mobile delivery:** these changes are in source. Existing APK downloads are older builds; new signed APKs and physical-device verification are still required. Apply the included database migration and deploy the API with the updated clients.

## Highlights

| Customer experience | Operations & security |
| --- | --- |
| Browse products and categories | Secure admin authentication with HttpOnly cookies |
| Cart and checkout with server-verified prices | Product, category, stock, order and payment management |
| Order tracking and responsive mobile UI | CSRF protection, input validation and rate limiting |
| Hindi, English and Hinglish construction assistant | Bills, analytics, reports, audit logs and email notifications |

## Technology

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Mobile apps:** React Native, Expo (customer app and Sushant Control admin app)
- **Backend:** Express, TypeScript, Prisma
- **Database:** PostgreSQL
- **Quality:** Vitest, ESLint, TypeScript checks and GitHub Actions CI

## Quick start

### Requirements

- Node.js 24 LTS (see `.nvmrc`)
- npm 9+
- PostgreSQL

### Run locally

```bash
git clone https://github.com/Nishant20361/ms-sushant-construction.git
cd ms-sushant-construction
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

| Service | Address |
| --- | --- |
| Storefront | `http://localhost:5173` |
| Admin panel | `http://localhost:5173/admin` |
| API | `http://localhost:5100` |

## Environment setup

At minimum, set these values in `.env` before deployment:

```env
NODE_ENV=production
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?schema=public"
JWT_SECRET="replace-with-at-least-32-random-characters"
CLIENT_URL="https://ms-sushant-construction-client.vercel.app"
TRUST_PROXY=true
```

For Render Free, use Brevo's HTTPS API: set `BREVO_API_KEY` and set `EMAIL_FROM` to a sender email verified in Brevo. This avoids Render's blocked SMTP ports. SMTP credentials remain supported for paid hosting.

### Deployment URLs

| Service | Required configuration |
| --- | --- |
| Frontend | `https://ms-sushant-construction-client.vercel.app` |
| Backend | `https://ms-sushant-construction.onrender.com` |
| Backend `CLIENT_URL` | `https://ms-sushant-construction-client.vercel.app` |
| Frontend `VITE_API_BASE` | `https://ms-sushant-construction.onrender.com/api` |
| Frontend `VITE_UPLOADS_BASE` | `https://ms-sushant-construction.onrender.com/uploads` |

The committed `client/.env.production` already supplies the two frontend build values. In the Render backend dashboard, set `NODE_ENV=production`, `CLIENT_URL`, `BREVO_API_KEY`, and `EMAIL_FROM`. `TRUST_PROXY` is automatically enabled on Render, though setting it to `true` explicitly is fine.

For the backend Render service, use these commands in the Render dashboard:

```text
Build Command: npm ci --include=dev && npm run build --workspace server
Start Command: npm run start --workspace server
```

`--include=dev` is required at build time because TypeScript and Prisma tooling are development dependencies.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API and frontend together |
| `npm run lint` | Run lint checks |
| `npm run typecheck` | Run TypeScript validation |
| `npm test` | Run isolated API integration tests and frontend unit tests |
| `npm run test:unit` | Run database-free tests and source archive safeguards |
| `npm run build` | Create production builds |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Seed initial data |

## Audit and release verification

See [PRODUCTION_AUDIT.md](PRODUCTION_AUDIT.md) for fixes, verification results, compatibility changes and remaining release gates. This audit does not replace production smoke tests, device testing or a database backup.

Integration tests require an **isolated local PostgreSQL database** with `test` in its name. Put only the test URL in `server/.env.test` (or set it in your shell):

```env
TEST_DATABASE_URL="postgresql://USER@localhost:5432/ms_sushant_test?schema=public"
```

Do not set `DATABASE_URL` to the test database in your normal environment. Test setup refuses a shared application database or a remote host. It provisions the test schema and tests delete their fixtures. `npm run test:unit` runs without PostgreSQL.

For the mobile clients, run `npm ci`, `npm run typecheck`, and `npm test --if-present` inside each of `mobile/` and `admin-mobile/`. CI also exports each Android bundle. Exporting JavaScript is not a signed APK/AAB or a physical-device test.

The backend has `/api/health` for liveness and `/api/ready` for database readiness. Set readiness monitoring to the latter. Startup connects to PostgreSQL before listening. Failed startup and fatal process errors exit so the host can restart the service.

Deployments must run migrations before starting the new code. `npm run start --workspace server` already does this. Preserve uploads using configured Cloudinary storage or a persistent `UPLOAD_DIR` disk; the default local uploads folder is not durable on an ephemeral host.

The web and mobile clients must be released with the new API: public history requires both a mobile number and a known order reference; changing admin 2FA requires the current password. Guest checkout no longer exposes a previous customer's address based only on a phone number. Existing administrator sessions without server-side session records must sign in again.

## Production checklist

- [ ] Use a managed PostgreSQL database and run migrations.
- [ ] Set a random `JWT_SECRET` with at least 32 characters; example placeholders are rejected.
- [ ] Set `CLIENT_URL` to the exact public HTTPS website URL.
- [ ] Verify `VITE_API_BASE` targets the deployed backend before building the frontend.
- [ ] Configure SMTP credentials and send a test order/reset email.
- [ ] Serve the frontend over HTTPS and proxy `/api` to the server.
- [ ] Set `TRUST_PROXY=true` only behind a trusted reverse proxy.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## Project structure

```text
client/       React storefront and admin panel
server/       Express API, Prisma schema, routes and tests
mobile/       Customer Android app (React Native / Expo)
admin-mobile/ Sushant Control admin Android app
docs/         Deployment and security update notes
assets/       README and project visual assets
.github/      Continuous-integration workflow
```

## Author

Built and maintained by **Nishant Kumar**.

- GitHub: `https://github.com/Nishant20361`
- Website: `https://ms-sushant-construction-client.vercel.app`

## License

Released under the [MIT License](LICENSE.md). © 2026 Nishant Kumar.

## Android downloads

- [Customer app 1.0.6 (build 9)](https://github.com/Nishant20361/ms-sushant-construction-releases/releases/tag/customer-app-v1.0.6)
- [Sushant Control admin app 1.0.5 (build 7)](https://github.com/Nishant20361/ms-sushant-construction-releases/releases/tag/sushant-control-v1.0.5)

Signed APKs are published in the separate releases repository. The website customer download and admin dashboard download link to their respective APKs. Customer in-app update prompts use the admin-configured Site Settings version, build number and direct APK URL; these database settings are independent of a GitHub push. Sushant Control currently uses manual APK updates. Physical-device installation has not been verified.

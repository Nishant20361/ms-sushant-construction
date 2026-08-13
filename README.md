<p align="center">
  <img src="assets/readme-hero.svg" alt="M/S Sushant Construction — Building trust, delivering quality" width="100%" />
</p>

<h1 align="center">M/S Sushant Construction</h1>

<p align="center">
  A modern construction-material ordering platform with a customer storefront, secure admin workspace, stock control, billing, reports, and a bilingual construction assistant.
</p>

<p align="center">
  <a href="https://github.com/your-github-username">GitHub profile</a>
  &nbsp;•&nbsp;
  <a href="https://your-domain.example">Live website</a>
  &nbsp;•&nbsp;
  <a href="LICENSE.md">MIT License</a>
</p>

> **Placeholders:** replace `your-github-username` and `your-domain.example` with your real GitHub profile and website domain before publishing.

## Highlights

| Customer experience | Operations & security |
| --- | --- |
| Browse products and categories | Secure admin authentication with HttpOnly cookies |
| Cart and checkout with server-verified prices | Product, category, stock, order and payment management |
| Order tracking and responsive mobile UI | CSRF protection, input validation and rate limiting |
| Hindi, English and Hinglish construction assistant | Bills, analytics, reports, audit logs and email notifications |

## Technology

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Express, TypeScript, Prisma
- **Database:** PostgreSQL
- **Quality:** Vitest, ESLint, TypeScript checks and GitHub Actions CI

## Quick start

### Requirements

- Node.js 20+
- npm 9+
- PostgreSQL

### Run locally

```bash
git clone https://github.com/your-github-username/ms-sushant-construction.git
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
JWT_SECRET="use-a-long-random-secret"
CLIENT_URL="https://your-domain.example"
TRUST_PROXY=true
```

Also configure your SMTP values (`EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASSWORD`, and `EMAIL_FROM`) for order notifications and password-reset emails.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the API and frontend together |
| `npm run lint` | Run lint checks |
| `npm run typecheck` | Run TypeScript validation |
| `npm test` | Run the isolated integration test suite |
| `npm run build` | Create production builds |
| `npm run db:migrate` | Apply database migrations |
| `npm run db:seed` | Seed initial data |

## Production checklist

- [ ] Use a managed PostgreSQL database and run migrations.
- [ ] Set a strong `JWT_SECRET`.
- [ ] Set `CLIENT_URL` to the exact public HTTPS website URL.
- [ ] Configure SMTP credentials and send a test order/reset email.
- [ ] Serve the frontend over HTTPS and proxy `/api` to the server.
- [ ] Set `TRUST_PROXY=true` only behind a trusted reverse proxy.
- [ ] Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

## Project structure

```text
client/       React storefront and admin panel
server/       Express API, Prisma schema, routes and tests
assets/       README and project visual assets
.github/      Continuous-integration workflow
```

## Author

Built and maintained by **Nishant Kumar**.

- GitHub: `https://github.com/your-github-username`
- Website: `https://your-domain.example`

## License

Released under the [MIT License](LICENSE.md). © 2026 Nishant Kumar.

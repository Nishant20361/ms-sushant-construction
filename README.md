# M/S SUSHANT CONSTRUCTION — Full-Stack Website

## 🇮🇳 हिन्दी / 🇬🇧 English

---

### 📋 Prerequisites

- **Node.js** v18+ (recommended v20+)
- **npm** v9+
- **PostgreSQL** (optional — SQLite works out of the box for local development)

---

### 🚀 Setup (Local Development — SQLite)

```bash
# 1. Clone the repository
cd ms-sushant-construction

# 2. Copy environment file
cp .env.example .env
# Edit .env and set:
#   - JWT_SECRET to a long random string (64+ hex chars)
#   - INITIAL_ADMIN_PASSWORD to a strong password (min 12 chars)

# 3. Install dependencies
npm install

# 4. Run database migration
npm run db:migrate

# 5. Seed the database (creates categories, products, admin, settings)
npm run db:seed

# 6. Start both backend and frontend
npm run dev
```

Frontend → http://localhost:5173  
Admin panel → http://localhost:5173/admin  
Backend API → http://localhost:5100  

---

### 🐘 Switching to PostgreSQL (Production)

**One file change:**

1. `server/prisma/schema.prisma` — line 5: change `provider = "sqlite"` to `provider = "postgresql"`
2. `.env` — set `DATABASE_URL` to your PostgreSQL connection string, e.g.:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
   ```
3. Run `npm run db:migrate && npm run db:seed`

**No model changes needed.** The code is fully PostgreSQL-compatible.

---

### 🔐 Creating the First Admin

The seed script reads `INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_PASSWORD` from `.env`.

```bash
# Set these in .env before running db:seed
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=your-strong-password-here

# Then run
npm run db:seed
```

---

### 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start backend + frontend concurrently |
| `npm run build` | Build both server and client for production |
| `npm run lint` | Run ESLint on both workspaces |
| `npm run typecheck` | TypeScript type checking |
| `npm run test` | Run backend API tests |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:reset` | Reset database (drop all data) |
| `npm run package` | Create clean source ZIP |

---

### 🧪 Testing

```bash
npm run test
```

Tests cover:
- Admin route returns 401 without login
- Wrong admin password is rejected
- Checkout validates bad phone number and invalid quantity
- Browser cannot change product price (server-enforced)
- Browser cannot buy more than available stock
- Public customer data is never exposed
- Inactive product cannot be ordered

---

### 🛡️ Security Checklist

- [x] HttpOnly cookies for JWT (no localStorage/sessionStorage)
- [x] CSRF protection on all state-changing requests
- [x] Argon2id password hashing (min 12 chars)
- [x] Rate limiting (login, checkout, general API)
- [x] Helmet security headers
- [x] CORS allowlist (no wildcard in production)
- [x] Zod validation on every API request
- [x] No raw SQL from user input
- [x] Generic error messages (no stack traces leaked)
- [x] Image upload: JPEG/PNG/WebP only, max 5 MB, MIME check, random filenames
- [x] Order prices verified server-side (never trust browser)
- [x] DB transaction for order placement with stock locking
- [x] Public API never exposes customer/order/admin data
- [x] Secrets never in code (`.env` only)

---

### 📁 Project Structure

```
ms-sushant-construction/
├── client/              # React + Vite + Tailwind
│   ├── src/
│   │   ├── components/  # Shared UI (Navbar, Footer, Cart, Toast, etc.)
│   │   ├── context/     # Cart, Settings, Admin Auth contexts
│   │   ├── lib/         # API client, format utilities
│   │   └── pages/       # Home, Checkout, Admin pages
│   └── ...
├── server/              # Express + Prisma + TypeScript
│   ├── prisma/          # Schema, migrations, seed
│   ├── src/
│   │   ├── middleware/  # Auth, error handler, rate limit, upload, CSRF
│   │   ├── routes/      # Public + Admin API routes
│   │   ├── utils/       # Password, token, serializers, validators
│   │   └── validators/  # Zod schemas
│   └── ...
├── scripts/             # Packaging script
├── uploads/             # Uploaded images (gitignored except .gitkeep)
├── .env.example
├── docker-compose.yml   # Optional PostgreSQL
├── package.json         # npm workspaces root
└── README.md
```

---

### 📸 ZIP Packaging

```bash
npm run package
```

Creates `ms-sushant-construction-source.zip` in the project root.  
Excludes: `node_modules/`, `.env`, `logs/`, `dist/`, `coverage/`, `.git/`, `server/uploads/`, `dev.db`.

---

### 🚀 Deployment Checklist

1. [ ] Switch Prisma to PostgreSQL provider
2. [ ] Point `DATABASE_URL` to production PostgreSQL
3. [ ] Generate a strong `JWT_SECRET` (64+ hex chars)
4. [ ] Set strong `INITIAL_ADMIN_PASSWORD`
5. [ ] Set `NODE_ENV=production`
6. [ ] Build frontend: `npm run build --workspace client`
7. [ ] Build backend: `npm run build --workspace server`
8. [ ] Configure reverse proxy (Nginx/Caddy) to serve client `dist/` and proxy `/api` to Node
9. [ ] Ensure `Secure` cookie flag is enabled (requires HTTPS)
10. [ ] Set `CLIENT_URL` to production frontend URL

---

## 📄 License

Private — M/S Sushant Construction

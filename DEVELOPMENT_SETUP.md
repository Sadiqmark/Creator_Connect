# Creator Connect — Development Setup & Portability Guide

> **Canonical Developer Onboarding & Environment Guide**  
> This guide provides the complete, authoritative, step-by-step instructions for setting up, configuring, running, and verifying Creator Connect on a clean development machine.

---

## 1. Overview

Creator Connect is a two-sided platform connecting Businesses with Creators for structured collaboration.

### Architecture Summary
* **Monorepo Structure:** Modular Monolith using **npm workspaces** (`shared`, `backend`, `frontend`, `e2e`).
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, TanStack React Query, Lucide Icons.
* **Backend:** Node.js, Express.js, TypeScript, Prisma ORM, Pino Logging, Zod environment validation.
* **Database:** PostgreSQL (>= 15) with Prisma schema migrations and partial unique indexes.
* **Identity & Authentication:** Firebase Client SDK (Web SPA) + Firebase Admin SDK (Express JWT token verification).
* **Testing:** Jest + Supertest (Backend), Vitest + React Testing Library (Frontend), Playwright (E2E in Google Chrome).

---

## 2. Prerequisites

Ensure the following tools are installed on your machine before setup:

| Tool | Version Requirement | Verification Command | Installation Method |
|---|---|---|---|
| **Node.js** | `>= 20.0.0` (LTS recommended) | `node -v` | [nodejs.org](https://nodejs.org) or `nvm install 22` |
| **npm** | `>= 10.0.0` | `npm -v` | Included with Node.js |
| **PostgreSQL** | `>= 15.0` | `psql --version` | Homebrew: `brew install postgresql@16` |
| **Google Chrome** | Latest Stable | `ls -d "/Applications/Google Chrome.app"` | [google.com/chrome](https://google.com/chrome) |
| **Git** | `>= 2.30.0` | `git --version` | Pre-installed on macOS / Xcode CLI tools |

---

## 3. Clone Repository

Clone the repository and navigate into the root project directory:

```bash
git clone https://github.com/Sadiqmark/Creator_Connect.git
cd Creator_Connect
```

---

## 4. Install Dependencies

Install all dependencies across all workspaces (`shared`, `backend`, `frontend`) from the repository root:

```bash
npm install
```

* This command installs all root and workspace dependencies using `package-lock.json`.
* It automatically establishes npm workspace symlinks for the `@creator-connect/shared` package.

---

## 5. Environment Configuration

The application requires environment configuration files in both `backend/` and `frontend/`.  
Templates are provided as `.env.example` in each workspace.

### Step 5.1: Create Backend Environment File

```bash
cp backend/.env.example backend/.env
```

#### Backend Variables (`backend/.env`):

| Variable | Description | Default / Example | Secret? |
|---|---|---|---|
| `PORT` | Express HTTP server port | `8000` | No |
| `NODE_ENV` | Runtime environment mode | `development` | No |
| `CORS_ORIGIN` | Allowed client origin for CORS | `http://localhost:5173` | No |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/creator_connect?schema=public` | **YES** |
| `FIREBASE_PROJECT_ID` | Google Firebase Project ID | `placeholder-project-id` | No |
| `FIREBASE_CLIENT_EMAIL`| Firebase Admin Service Account email | `service-account@project.iam.gserviceaccount.com` | No |
| `FIREBASE_PRIVATE_KEY` | Firebase Admin Service Account RSA Key | `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"` | **CRITICAL SECRET** |

---

### Step 5.2: Create Frontend Environment File

```bash
cp frontend/.env.example frontend/.env
```

#### Frontend Variables (`frontend/.env`):

| Variable | Description | Default / Example | Secret? |
|---|---|---|---|
| `VITE_API_BASE_URL` | REST API base endpoint | `http://localhost:8000/api/v1` | No |
| `VITE_FIREBASE_API_KEY` | Firebase Web Client API key | `placeholder-api-key` | No (Public Client Key) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Authentication domain | `project.firebaseapp.com` | No |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Project ID | `placeholder-project-id` | No |
| `VITE_FIREBASE_STORAGE_BUCKET`| Firebase Cloud Storage bucket | `project.appspot.com` | No |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | `1234567890` | No |
| `VITE_FIREBASE_APP_ID` | Firebase Web Application ID | `1:1234567890:web:abcdef` | No |

> [!IMPORTANT]
> **NEVER commit actual `.env` files.** They are ignored by Git. `.env.example` files must contain placeholders only.

---

## 6. Firebase Configuration

Creator Connect uses Firebase for identity authentication and password management.

### Architectural Division:
1. **Frontend Client SDK (`frontend/src/config/firebase.ts`):**
   * Uses public Web App configuration values from `frontend/.env`.
   * Obtains Google ID Tokens upon user login.
2. **Backend Admin SDK (`backend/src/config/firebase.ts`):**
   * Uses private Service Account credentials from `backend/.env`.
   * Cryptographically verifies ID tokens on incoming requests.

### How to obtain credentials on a clean machine:
1. Navigate to the **[Firebase Console](https://console.firebase.google.com)** for the shared project.
2. **For Frontend:** Go to **Project Settings** -> **General** -> **Your apps** -> Copy web app config values into `frontend/.env`.
3. **For Backend:** Go to **Project Settings** -> **Service accounts** -> Click **Generate new private key** -> Copy `project_id`, `client_email`, and `private_key` into `backend/.env`.

---

## 7. PostgreSQL Configuration

### Canonical macOS Setup (Homebrew PostgreSQL 16)

```bash
# 1. Install PostgreSQL 16
brew install postgresql@16

# 2. Start PostgreSQL service
brew services start postgresql@16

# 3. Create the 'creator_connect' database
createdb creator_connect
```

### Establishing Database Credentials
By default on macOS, Homebrew PostgreSQL connects using your current macOS username without a password.

* **Default macOS URL:**
  ```env
  DATABASE_URL="postgresql://localhost:5432/creator_connect?schema=public"
  ```
* **If configuring with `postgres` superuser and password:**
  ```bash
  psql -d postgres -c "CREATE USER postgres WITH SUPERUSER PASSWORD 'postgres';"
  ```
  Then in `backend/.env`:
  ```env
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/creator_connect?schema=public"
  ```

### Alternative: Docker PostgreSQL Container
If you prefer Docker:
```bash
docker run --name creator-connect-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=creator_connect \
  -p 5432:5432 \
  -d postgres:16-alpine
```

---

## 8. Prisma Database Setup

Once PostgreSQL is running and `DATABASE_URL` is set in `backend/.env`, run the database lifecycle sequence from the root directory:

```bash
# 1. Generate Prisma Client TypeScript typings
npm run db:generate

# 2. Apply version-controlled SQL migrations
npm run db:migrate

# 3. Seed deterministic development dataset
npm run db:seed
```

### Prisma Commands Reference:

| Script | Command | Purpose | Safety |
|---|---|---|---|
| `npm run db:generate` | `prisma generate` | Generates `@prisma/client` TypeScript typings | Completely Safe |
| `npm run db:migrate` | `prisma migrate deploy` | Applies pending SQL migrations | Non-destructive |
| `npm run db:seed` | `ts-node prisma/seed.ts` | Populates baseline synthetic test records | Overwrites test data |
| `npm run db:studio` | `prisma studio` | Opens Prisma visual database browser | Inspection only |

> [!WARNING]
> **`prisma migrate reset`** is a destructive command for development only. It drops the database, re-applies all migrations, and re-seeds. Use only when resetting your local database.

---

## 9. Running the Application

### Option A: Concurrent Development Mode (Recommended)
Starts both Backend and Frontend concurrently from the repository root:

```bash
npm run dev
```

* **Frontend Application:** [http://localhost:5173](http://localhost:5173)
* **Backend API:** [http://localhost:8000](http://localhost:8000)
* **Backend Health Check:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### Option B: Individual Services

```bash
# Terminal 1 — Backend only
npm run dev:backend

# Terminal 2 — Frontend only
npm run dev:frontend
```

---

## 10. Testing and Verification

Run the full automated test and quality verification suite from the root directory:

```bash
# 1. Run all unit and integration tests (67 tests)
npm test

# 2. Run TypeScript strict typecheck across all workspaces
npm run typecheck

# 3. Run ESLint across backend and frontend
npm run lint

# 4. Verify production bundle build
npm run build
```

---

## 11. Playwright / Browser Testing

Creator Connect includes real-browser end-to-end testing using Google Chrome.

### Running E2E Tests:

Ensure local development servers are running (`npm run dev`), then in a new terminal:

```bash
# Run tests in headless mode
npm run test:e2e

# Run tests in headed (visual browser) mode
npx playwright test --headed
```

> [!NOTE]
> If Google Chrome is not installed on the machine, install Chromium for Playwright:
> ```bash
> npx playwright install chromium
> ```

---

## 12. Troubleshooting

### Issue: `Port 8000 or 5173 already in use`
* **Cause:** A previous instance of node or vite is still running in the background.
* **Fix:** Kill the process occupying the port:
  ```bash
  lsof -ti :8000 | xargs kill -9
  lsof -ti :5173 | xargs kill -9
  ```

### Issue: `PrismaClientInitializationError: Can't reach database server`
* **Cause:** PostgreSQL is not running or `DATABASE_URL` credentials in `backend/.env` are incorrect.
* **Fix:**
  1. Check PostgreSQL service: `brew services list` or `docker ps`
  2. Start service: `brew services start postgresql@16`
  3. Test direct connection: `psql "$DATABASE_URL"`

### Issue: `Firebase Admin SDK initialization warning`
* **Cause:** `FIREBASE_PRIVATE_KEY` or `FIREBASE_CLIENT_EMAIL` are placeholders.
* **Fix:** The backend will still run for health checks and development mock modes, but real Firebase ID token verification requires valid credentials in `backend/.env`.

---

## 13. Git / GitHub Workflow

* **Repository:** `https://github.com/Sadiqmark/Creator_Connect.git`
* **Default Branch:** `main`
* **Branching Strategy:** Feature branches branched from `main` (`feature/phase-X-...`).
* **Commit Guidelines:** Use semantic, conventional commit messages:
  * `feat: ...`
  * `fix: ...`
  * `chore: ...`
  * `docs: ...`
  * `test: ...`

---

## 14. Security Rules

1. **Zero Secret Commits:** Never commit `.env`, private keys, Service Account JSON files, or database credentials.
2. **Server-Authoritative Role:** Client-supplied role attributes in request bodies are ignored; `req.user.role` from PostgreSQL is strictly enforced.
3. **Collaboration Email Isolation:** Private contact emails must never be exposed through public DTOs.
4. **Email Verification Gate:** Unverified users must not access workspace routes or protected APIs.

---

## 15. New Machine Recovery Checklist

Use this 5-minute checklist when cloning to a brand-new computer:

```bash
# 1. Clone and enter directory
git clone https://github.com/Sadiqmark/Creator_Connect.git
cd Creator_Connect

# 2. Install dependencies
npm install

# 3. Create environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 4. Start PostgreSQL and create database
brew services start postgresql@16
createdb creator_connect

# 5. Initialize Database
npm run db:generate
npm run db:migrate
npm run db:seed

# 6. Verify entire test suite
npm test
npm run typecheck
npm run lint
npm run build

# 7. Start application
npm run dev
```

* **Frontend:** [http://localhost:5173](http://localhost:5173)  
* **Backend:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

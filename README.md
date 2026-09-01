# Creator Connect

> A two-sided creator-discovery and structured collaboration platform connecting **Businesses** with **Creators**.

---

## 📖 Source of Truth Documentation

Creator Connect is governed strictly by the following four architectural and specification documents:

1. [REQUIREMENTS.md](REQUIREMENTS.md) — What the product does, domain workflows, and MVP boundaries.
2. [ARCHITECTURE.md](ARCHITECTURE.md) — How the system is built, invariants, and technical architecture.
3. [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) — How the product looks, feels, moves, and behaves.
4. [IMPLEMENTATION_CONTROL_PLAN.md](IMPLEMENTATION_CONTROL_PLAN.md) — Implementation governance and phase sequencing.
5. [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) — Canonical development environment setup and portability guide.

---

## 🏗️ Repository Architecture

Creator Connect is structured as a **Modular Monolith** with npm workspaces:

```text
Creator_Connect/
├── frontend/                     # React + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── app/                  # Route layouts, providers, error boundaries
│   │   ├── components/           # UI primitives and shared components
│   │   ├── features/             # Feature domains (Auth, Creators, Inquiries, etc.)
│   │   ├── services/             # API client and service integrations
│   │   └── lib/                  # Utilities and Tailwind helpers
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                      # Node.js + TypeScript + Express.js
│   ├── src/
│   │   ├── config/               # Type-safe environment validation (Zod)
│   │   ├── middleware/           # Request ID, Logging, Error & 404 handlers
│   │   ├── routes/               # REST API routers (/api/v1)
│   │   ├── services/             # Application services & business logic
│   │   ├── app.ts                # Express application factory
│   │   └── server.ts             # Server entry point with graceful shutdown
│   ├── tests/                    # Jest & Supertest integration tests
│   └── package.json
│
├── shared/                       # Shared TypeScript types and response contracts
│   ├── src/
│   │   └── index.ts              # Shared DTOs and type definitions
│   └── package.json
│
├── REQUIREMENTS.md
├── ARCHITECTURE.md
├── DESIGN_SYSTEM.md
├── IMPLEMENTATION_CONTROL_PLAN.md
├── package.json                  # Root npm workspace orchestration
├── .gitignore
└── README.md
```

---

## ⚡ Prerequisites

- **Node.js**: `>= 20.0.0` (Tested on `v22.15.1`)
- **npm**: `>= 10.0.0`

---

## 🚀 Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd Creator_Connect
   ```

2. **Install all dependencies:**
   ```bash
   npm install
   ```

3. **Complete Environment & Database Setup:**
   * Refer to **[DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md)** for detailed PostgreSQL, Firebase, and Prisma setup instructions.
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

---

## 💻 Running the Application

### Concurrent Development Mode (Frontend + Backend)
```bash
npm run dev
```
- **Backend API**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **Frontend App**: [http://localhost:5173](http://localhost:5173)

### Individual Services
- **Backend only:** `npm run dev:backend`
- **Frontend only:** `npm run dev:frontend`

---

## 🧪 Testing, Typechecking & Database Scripts

| Command | Description |
|---|---|
| `npm run test` | Run both Backend (Jest) and Frontend (Vitest) test suites |
| `npm run test:backend` | Run backend tests with Jest and Supertest |
| `npm run test:frontend` | Run frontend tests with Vitest and React Testing Library |
| `npm run test:e2e` | Run Playwright real-browser E2E test suite in Chrome |
| `npm run typecheck` | Run TypeScript strict mode verification across all workspaces |
| `npm run lint` | Run ESLint verification across backend and frontend |
| `npm run build` | Build shared types, backend TypeScript, and frontend Vite bundle |
| `npm run db:generate` | Generate Prisma Client TypeScript definitions |
| `npm run db:migrate` | Apply pending PostgreSQL migrations |
| `npm run db:seed` | Seed deterministic development baseline dataset |
| `npm run db:studio` | Open Prisma visual database browser |

---

## 🔒 Security & Privacy Invariants

- **Backend Authoritative:** Client is never trusted for authorization, roles, or inquiry states.
- **Collaboration Email Privacy:** Private contact emails are strictly excluded from public DTOs and only exposed for accepted inquiries to authorized participants.
- **Zero Secrets Committed:** Secrets and private keys are excluded via `.gitignore`.

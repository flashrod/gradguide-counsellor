# GradGuide — Course Recommendation Assistant

Live counselling companion for study-abroad counsellors. Deterministic,
explainable course recommendations from verified catalogue data — plus the
workflow around them: resume import, next-best questions with an answer
loop, what-if exploration, immutable session snapshots, deadline reminders,
and a compact live mode for use alongside the call.

**Live:** frontend on Vercel · backend on Render · Postgres on Neon
**Stack:** Next.js 16 + React 19 + Tailwind v4 · Express + Drizzle ORM + better-auth

## What it does

**Counsellor workflow** — sign up at `/signup` (open registration, one
account per counsellor, sessions scoped to the owner) → add students via
resume import (`/workspace/resume`) or the manual form (`/students/new`)
→ open a workspace (`/workspace?student=<id>`) with ranked
recommendations → answer the Next Best Question inline (scores recompute
live) or attach it to the session notes → explore What-If scenarios and
side-by-side comparisons (select 2–3 cards → sticky compare bar) →
start/end a counselling session → review frozen history under `/sessions`.

**Live mode** (`/live`) — a narrow single-column counsel view for a
window next to Google Meet: current student, top 3 picks with one-line
whys, the next question with its answer box, and notes wired to the
active session. Enter from the workspace header.

**Deadlines** (`/deadlines`) — counsellor-owned reminders (application
due dates, document cutoffs, follow-ups) with overdue highlighting.
Dates are always counsellor-entered: catalogue intakes are season names
with no year, so deadlines are never auto-derived or fabricated.

**Three standout features**
1. **Explainable Match** — every recommendation carries six dimension
   scores (academic, career, budget, eligibility, country, intake) with
   reasons, warnings, and source provenance. No black-box ranking.
2. **Next Best Question, closed loop** — the single missing answer with
   the highest measured impact across the top 10, answerable in place;
   the profile updates and scores recompute immediately.
3. **Immutable session snapshots** — ending a session freezes profile,
   ranking, evidence, notes, and comparisons. History never shifts when
   the catalogue changes.

**Product rules that never bend:** the engine is pure deterministic
TypeScript (no LLM, no randomness — same inputs, same ranking); unknown
information is *unknown*, never ineligible and never invented; manual
counsellor input outranks resume extraction; What-If simulations never
mutate the stored profile.

## Run locally

```bash
npm install
cp backend/.env.example backend/.env   # set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:migrate                      # apply backend/drizzle/*.sql
npm run db:seed                         # DEV ONLY: wipes tables, inserts labelled demo data

npm run dev:backend                     # → http://localhost:4000/api/health
npm run dev:frontend                    # → http://localhost:3000
```

Sign in at `/login` with `demo@gradguide.local` (password from
`DEMO_COUNSELLOR_*` in your `.env`), or create an account at `/signup`.
The seed gives you a demo student, courses, and one completed session.

Checks: `npm run build --workspaces`, `npm run lint --workspace=gradguide-frontend`,
`npm run test:backend` (316 tests; 14 live-DB tests need the dev seed),
`npm run test --workspace=gradguide-frontend` (52 tests).

## Deployment

One shared database: **Neon Postgres**. Both local `backend/.env` and
the Render service point at the same Neon URL — dev and prod read the
same data. `npm run db:migrate` from anywhere applies pending migrations.

- **Backend (Render, `render.yaml`):** `DATABASE_URL` (Neon URL),
  `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` + `FRONTEND_URL` (deployed
  origins), `PORT`. Pre-deploy runs `db:migrate`.
- **Frontend (Vercel, root `frontend/`):** `BACKEND_API_URL` (server
  fetches + `/api` rewrite target), `NEXT_PUBLIC_API_URL` (prerender
  fallback). No config file — defaults work.
- **Catalogue:** production starts empty. Fill it from any machine
  holding the Neon URL:
  `npm run ingest --workspace=gradguide-backend -- --all`
  (`--country=US|UK|CA|DE`, `--limit=N`, `--dry-run`). Never run
  `db:seed` against production — it wipes tables and inserts mocks.
- **Fresh-database behavior:** unknown student → redirect to
  `/students`; empty sessions → "No sessions yet". No crashes on
  empty data.
- **Platform-native deps:** `@rolldown/binding-darwin-arm64` and
  `@tailwindcss/oxide-linux-x64-gnu` live under
  `optionalDependencies` so the lockfile carries both platforms.
  Never move them to `dependencies`/`devDependencies` — that breaks
  the other platform's build with `EBADPLATFORM`.

## Course data

106 real programs across US/UK/CA/DE, ingested from official
university pages only (see `backend/src/ingestion/`). Every course
stores `sourceUrl`, `sourceName`, `lastVerifiedAt`. Missing values stay
null — no inferred GPAs, no converted classifications, no estimated
tuition. `npm run catalogue:report --workspace=gradguide-backend`
prints totals, coverage, suspicious and stale records.

## Architecture notes

- **Same-origin API proxy:** the browser only talks to `/api/*`,
  rewritten by Next.js to the backend. No CORS allow-list to sync, no
  third-party-cookie breakage. Server Components call the backend
  directly and forward cookies explicitly.
- **Auth:** better-auth email+password, backend-owned, session cookie
  as the only counsellor identity. Per-route `requireAuth` (never
  router-level `use()` on a prefix-mounted router). Students and the
  catalogue are public by design; sessions, notes, deadlines, and
  student writes are owner-scoped (foreign rows 404).
- **Key endpoints:** `POST /api/students` · `PATCH /api/students/:id`
  (answer flow) · `GET /api/students/:id/recommendations` ·
  `GET /api/students/:id/next-question` ·
  `POST .../recommendations/simulate` (read-only) ·
  session CRUD + notes/simulations/comparisons ·
  `GET|POST /api/deadlines`, `PATCH|DELETE /api/deadlines/:id` ·
  resume upload/confirm.
- **Monorepo:** npm workspaces (`frontend/`, `backend/`); run
  workspace scripts from the root. Backend is ESM — relative imports
  need `.js` extensions. `drizzle-orm` pinned at `0.44.5` (matches
  `drizzle-kit@0.31`); never edit an applied migration, always add one.

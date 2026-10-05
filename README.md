# GradGuide Copilot — Milestones 1–2

Hiring assignment: Course Recommendation Assistant for study-abroad counsellors.
- Milestone 1: UI shell + mock data only.
- Milestone 2: PostgreSQL + Drizzle foundation (this milestone).
- Not yet: auth, Gemini, resume parsing, recommendation engine, tRPC, Redis.

## Structure

```text
gradguide/
  frontend/   Next.js 16 + React 19 + TypeScript + Tailwind v4 + shadcn-style UI
  backend/    Node.js + Express + TypeScript skeleton (health endpoint only)
```

- `frontend/src/app/(app)/` — routes: workspace, students, courses, sessions, settings
- `frontend/src/components/` — Sidebar, PageHeader, StudentProfile, RecommendationCard, MatchScore, NextQuestionCard
- `frontend/src/components/ui/` — button, card, badge, separator, avatar
- `frontend/src/lib/` — `types.ts`, `mock-data.ts` (mock data stays separate from UI)
- `backend/src/index.ts` — Express app with `GET /api/health` only
- `backend/src/db/schema.ts` — Drizzle schema + relations + inferred types
- `backend/src/db/{index,utils,seed}.ts` — connection pool, health probe, demo seed
- `backend/drizzle/` — generated SQL migrations
- `docker-compose.yml` — local PostgreSQL 16

## Database (Milestone 2)

### Architecture

PostgreSQL 16 + Drizzle ORM (`node-postgres` driver). Schema lives in
`backend/src/db/schema.ts`; migrations are generated with `drizzle-kit generate`
into `backend/drizzle/` and applied with `drizzle-kit migrate`. Environment is
validated with Zod (`backend/src/env.ts`); `backend/src/db/index.ts` owns the
single `pg` Pool.

### Entity relationships

```text
universities 1───∞ courses 1───∞ session_recommendations ∞───1 counselling_sessions
students 1───∞ counselling_sessions 1───∞ session_notes
```

- `courses.university_id → universities.id` (cascade)
- `counselling_sessions.student_id → students.id` (cascade)
- `session_recommendations.{session_id, course_id}` → parents (cascade)
- `session_notes.session_id → counselling_sessions.id` (cascade)
- `counsellor_id` is a plain string until authentication lands.
- `session_recommendations.action` is a Postgres enum:
  `recommended | shortlisted | rejected | discussed`.
- `session_recommendations.score` has a `CHECK (0–100)` constraint.
- Set-valued fields (`careerTags`, `intakes`, `preferredCountries`,
  `academicBackgrounds`) are native `text[]` — no JSON blobs.
- Every course requires provenance: `sourceUrl`, `sourceName`, `lastVerifiedAt`.
- Every money amount carries a `cost_period` (`annual | total | semester | monthly`);
  `living_cost_period` is null exactly when `living_cost_amount` is null (enforced
  by a CHECK constraint).
- **Budget semantics:** `students.budget_amount` is the student's maximum TOTAL
  budget for the complete study programme, including tuition AND living costs
  combined. No currency conversion is performed yet.

### Run PostgreSQL locally

Preferred — Docker Compose (matches `backend/.env.example`):

```bash
cp backend/.env.example backend/.env   # gitignored, local only
npm run db:up                          # docker compose up -d db
```

The environment here already had Homebrew PostgreSQL on port 5432, so
verification ran against that instead (same `DATABASE_URL`, same credentials —
see "Assumptions"). If port 5432 is taken, stop the local Postgres first or
change the compose port mapping.

### Migrate and seed

```bash
npm run db:migrate   # apply backend/drizzle/*.sql
npm run db:seed      # DEV ONLY: clears all tables, inserts labelled demo data
npm run db:down      # stop the compose db container
```

Seed contents (all explicitly labelled demo/mock, stable UUIDs, idempotent):
2 universities, 3 courses, 1 student, 1 live session, 2 recommendations,
1 session note. No real university or course data anywhere.

## Run locally

```bash
# install (from repo root)
npm install

# frontend → http://localhost:3000 (redirects to /workspace)
npm run dev:frontend

# backend → http://localhost:4000/api/health
npm run dev:backend
```

Build / lint:

```bash
npm run build:frontend
npm run build:backend
npm run lint
```

## Decisions

- npm workspaces at the root; each side keeps its own `package.json` and `tsconfig`.
- Backend is intentionally minimal (Express + health endpoint) so Milestone 2+
  (tRPC, PostgreSQL + Drizzle, Gemini) has a clean place to land.
- Frontend and backend are not wired together yet; `frontend/.env.example`
  reserves `NEXT_PUBLIC_API_URL` for later milestones.
- TypeScript strict mode, no `any`, business logic kept out of components.
- `drizzle-orm` is pinned to `0.44.5` (and hoisted to the root `devDependencies`)
  because `drizzle-kit@0.31` requires ORM `compatibilityVersion 10` and resolves
  the ORM relative to its own hoisted location.

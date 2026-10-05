# GradGuide Copilot — Milestone 1 (Application Shell)

Hiring assignment: Course Recommendation Assistant for study-abroad counsellors.
Milestone 1 is UI shell + mock data only. No database, auth, Gemini, tRPC, or
recommendation engine yet.

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

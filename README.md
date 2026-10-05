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

## Recommendation Engine (Milestone 3)

### Why deterministic

Two counsellors given the same student profile and course dataset must see
the same ranking. An LLM is non-deterministic by nature, so it is banned
from the ranking path: scoring is pure TypeScript, no I/O, no randomness,
no global state. A future LLM may turn the structured evidence into prose,
but it will never decide the order.

### Eligibility vs ranking

`evaluateEligibility(student, course)` returns `eligible | ineligible |
unknown` plus structured reasons/warnings. Hard fails (GPA/IELTS/section
below minimum, insufficient work experience, background mismatch) mean
`ineligible` and the course is excluded from ranking. `rankRecommendations`
scores the survivors and sorts by overall desc → eligibility desc →
budget desc → course id asc (total, reproducible order).

### Score weights

Academic 25% · Career 25% · Budget 20% · Eligibility 15% · Country 10% ·
Intake 5%. Every part is an integer 0–100; the overall is
`Math.round` of the weighted sum (eligible→100, unknown→70, ineligible→0
for the eligibility part; neutral 70 wherever data is missing).

### Missing information

Unknown is not ineligible. A missing GPA/IELTS section/work-history yields
`unknown` + warning so the future "Next Best Question" feature knows what
to ask. Currency mismatch yields neutral budget + warning (no invented
exchange rates). Budget never disqualifies — it only scores.

### Cost normalization

`calculateEstimatedTotalCost` scales amounts by period: annual ×
ceil(months/12) years, semester × ceil(months/6) semesters, monthly ×
months, total as-is; tuition + living summed only in one currency.
Period-based amounts with unknown duration yield no estimate (never a
fabricated total); `total`-period amounts remain usable.

## Correctness Hardening (Milestone 5)

- **GPA scales:** values carry their scale (`gpa` + `gpa_scale`, e.g.
  8.4/10 vs 3.0/4.0); comparison uses value/scale. A missing or invalid
  scale is UNKNOWN, never a guess. Originals are preserved for display —
  normalization is internal only, and linearity is a prototype heuristic,
  not an admissions equivalency.
- **TOEFL/IELTS:** alternative English requirements — satisfying one
  accepted test satisfies English; no cross-test conversion. TOEFL overall
  0–120 enforced in schema and Zod.
- **Intakes:** normalized to season/month/year (northern-hemisphere
  convention); "September 2027" matches "Fall", years must agree,
  rolling/year-round matches everything. Originals preserved.
- **Duration:** unpublished means NULL (migration backfills legacy `0`);
  unknown duration never produces a zero cost.
- Weights unchanged (25/25/20/15/10/5). `npm run test:backend` — 161 tests.

## Live Recommendation Workspace (Milestone 6)

The workspace (`/workspace`, dynamic server render) loads a real student
(`GET /api/students/:id`) and engine recommendations
(`GET /api/students/:id/recommendations`) straight from PostgreSQL.
Mock recommendation data is deleted; placeholder Students/Courses/Sessions
pages are untouched.

- Cards render backend output verbatim: overall score, six-dimension
  breakdown, engine reasons/warnings (expandable "Why?"), cost or
  "Unknown" (never $0), intakes, eligibility badge, and source name +
  verified date + clickable source URL.
- GPA shows original value/scale ("8.4 / 10"); TOEFL shown alongside IELTS.
- Next Best Question is derived deterministically from the top
  recommendation's first warning (explicitly labelled placeholder when
  there is nothing to ask — no AI yet).
- `loading.tsx` skeletons, `error.tsx` retry (no silent mock fallback),
  and an honest empty state. The page is `force-dynamic` so results are
  never stale at build time.
- Frontend tests: `npm run test --workspace=gradguide-frontend` (18 tests:
  formatters, card rendering incl. unknown≠zero, evidence toggle, source
  link, empty state, question card states). Configure via
  `frontend/.env` (`BACKEND_API_URL`, `WORKSPACE_STUDENT_ID`).

## Next Best Question (Milestone 7)

### The problem

Counsellor time is limited and profiles are incomplete. Asking for every
missing field wastes the session — the system must surface the single
missing answer most likely to matter.

### How impact is calculated

`rankQuestions(student, recommendations)` (pure, in
`backend/src/recommendations/next-question.ts`) considers the top 10
ranked recommendations. For each student-side unknown (budget, country,
intake, GPA, English, work experience, career goal), the affected set is
the recommendations carrying matching unknown-evidence — e.g. TOEFL is
never asked about when IELTS already satisfies every course, and answered
fields (known budget, set preferences) never become candidates.

```
coverage     = affected / considered
rankCoverage = Σ 1/(1+rank) affected / Σ 1/(1+rank) all considered
impact       = round(100 × (0.5 × coverage + 0.5 × rankCoverage))
```

Rank #1 moves the needle more than rank #10. Priority: HIGH ≥ 70,
MEDIUM 40–69, LOW < 40. Ties break by impact → affected count → fixed
field order → field name. No recommendations, or nothing unresolved,
returns `{ status: "complete" }` — never a fabricated question.

### Why deterministic, why no LLM

Same inputs → same question, explainable as "could affect N of your top
M recommendations". The impact score is a deterministic prioritization
heuristic, not a probability that the answer will change the
recommendation. An LLM may rephrase wording later; it will never decide
priority.

### Wiring

`GET /api/students/:id/next-question` → workspace card shows priority
badge, template question, potential impact, and the structured reason.
`npm run test:backend` covers budget/English/intake/country/work/career
scenarios, rank sensitivity, ties, malformed evidence, and 10×
determinism (19 new tests).

## What-If Recommendation Explorer (Milestone 8)

Counsellors can temporarily override GPA, budget, country, and intake to
preview ranking changes — without ever mutating the stored profile.

- `POST /api/students/:id/recommendations/simulate` with `{ overrides }`
  (Zod-validated: GPA within scale, non-negative budget, 3-letter
  currency, recognizable intake; unknown fields rejected). The service
  loads the student once, ranks the stored profile (baseline) and an
  in-memory copy (simulated) with the one existing engine, and diffs the
  lists: `NEWLY_ELIGIBLE`, `NO_LONGER_ELIGIBLE`, `RANK_UP`, `RANK_DOWN`,
  `UNCHANGED`, each with old/new rank and score. Read-only by
  construction — verified by test and by diffing the row before/after.
- The workspace "What If?" panel posts scenarios client-side, keeps the
  baseline grid and profile untouched, shows a summary (up/down/new/gone
  counts) plus per-course deltas with the most-improved dimension, and
  resets without any request. Empty (all unchanged), error, and invalid
  input states included.

"What-If simulations are temporary scenarios and never modify the
student's stored profile."

## Course Comparison (Milestone 9)

Cards offer a Compare toggle (max 3, client-side only); the tray links to
`/workspace/compare?ids=…`, a dynamic server view joining the existing
recommendations response with display-only `GET /api/courses/:id` rows.

- Table rows: match score, eligibility (with the engine's reason when not
  eligible), six dimension scores, tuition, est. total, duration, GPA /
  IELTS / TOEFL requirements, intakes, backgrounds, source + verified
  date. Unknown stays "Unknown"/"Not provided" — never $0 or 0 months.
- Per-dimension "Strongest" marks the highest value (never an overall
  winner); evidence sections reuse backend reasons/warnings verbatim.
- No scoring, no persistence, no LLM. `npm run test
  --workspace=gradguide-frontend` covers selection, limits, table,
  unknowns, highlights, evidence, and empty states.

### Consistency testing

`ranking.test.ts` runs the same student/courses 5× and asserts deep
equality of status, scores, reasons, warnings, and order; the live-DB
service test asserts identical results across calls. Run with
`npm run test:backend` (111 tests: eligibility, cost, career, country,
intake, ranking, consistency, service mapping + live-DB integration,
ingestion parsing/validation/dedupe/sources).

## Course Ingestion (Milestone 4)

One real university → one real program → PostgreSQL → recommendation
engine. No bulk scraping yet.

### Architecture

```text
program page → fetchHtml → extractCourseCandidate → CourseCandidate
  → Zod validate (VALID/PARTIAL/INVALID) → dedupe → persist → Drizzle
```

- `backend/src/ingestion/utils/fetch.ts` — timeout, User-Agent, retries,
  1s politeness gap, robots.txt honored (throws on disallow).
- `backend/src/ingestion/sources/` — `CollegeScorecardSource` (US Dept of
  Education institution discovery, key via `COLLEGESCOREDATA_API_KEY`) and
  `universities/rit.ts`, the single curated adapter. New universities plug
  in as one file each under `universities/`.
- `backend/src/ingestion/extractors/` + `normalize/` — deterministic
  Cheerio/regex extraction (money, duration, GPA/IELTS/TOEFL, intakes).
  No LLM. Missing values stay null — never fabricated.
- `backend/src/ingestion/validation/courseSchema.ts` — range checks
  (GPA 0–4, IELTS 0–9, TOEFL 0–120) and VALID/PARTIAL/INVALID tiers.
  INVALID is never inserted.
- `backend/src/ingestion/pipeline/persist.ts` — the only place that maps
  candidates to Drizzle inserts (upsert on normalized identity).

### Demo target

- University: Rochester Institute of Technology (USA, Rochester NY)
- Program: Computer Science MS — https://www.rit.edu/study/computer-science-ms
- Extracted: degree MS, GPA 3.0, IELTS 6.5, TOEFL 88, intakes Fall/Spring,
  backgrounds [Computer Science, Engineering, Science, Business].
- Honestly missing: tuition and duration (not published on the program
  page) → PARTIAL tier, stored with nulls, engine treats as neutral.

### Run it

```bash
npm run db:migrate
npm run ingest:demo
```

Needs `backend/.env` with `DATABASE_URL`. Works without a Scorecard key
(enrichment is skipped with a log line); set `COLLEGESCOREDATA_API_KEY`
to enable it (free at https://api.data.gov/signup/).

### Provenance & limitations

Every ingested course stores the exact program-page URL, a source name,
and `lastVerifiedAt`. Current limitations: GPA scales are compared
numerically (US 4.0 vs other scales not yet normalized); TOEFL is stored
but not yet scored by the engine; tuition/duration nullability is new in
migration 0002; duration `0` means "unpublished" (see `eligibilityNotes`).
Next: scale to 20+ universities with per-site adapters + an LLM fallback
for unstructured pages.

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

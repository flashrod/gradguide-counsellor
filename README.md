# GradGuide Copilot

GradGuide Copilot is a counsellor-facing course recommendation assistant designed for live counselling sessions. It produces consistent, explainable recommendations from verified course data while helping counsellors identify missing information and explore how student preferences affect recommendations.

**Who it's for:** study-abroad counsellors conducting live sessions — not students browsing alone. Every screen optimizes for "the counsellor is on a call right now": fast ranking, visible evidence, one high-impact question at a time.

**Why generic recommenders are insufficient:** generic course search can't tell a counsellor *why* a programme fits, what to ask next when a profile is incomplete, or how a "what if my budget were lower?" scenario changes the ranking — and LLM-ranked lists are non-deterministic, so two counsellors get different answers for the same student. GradGuide fixes all three with a deterministic engine plus three differentiators:

1. **Explainable Match** — every recommendation carries dimension scores (academic, career, budget, eligibility, country, intake) with reasons/warnings and source provenance.
2. **Next Best Question** — the single missing answer with the highest measured impact across the top 10 recommendations (deterministic impact score, never fabricated).
3. **What-if Recommendation Explorer** — counsellors preview GPA/budget/country/intake changes; the stored profile is never mutated (verified read-only).

**Core workflow:** counsellor signs in → opens workspace → imports the student resume (or uses an existing profile) → reviews/confirm extracted fields with provenance → gets ranked recommendations → asks the next-best question → explores what-ifs → compares programmes → saves an immutable session snapshot.

**Product rules that never bend:** the engine is pure deterministic TypeScript (no LLM in ranking); unknown information is *unknown*, never ineligible and never invented; manual counsellor input always outranks resume extraction; session history is frozen at creation time.

Hiring-assignment build log below (Milestones 1–13), newest last where applicable.

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

## Counselling Sessions (Milestone 10)

### Why sessions exist

Recommendations, answers, and catalogue data all change over time. A
session freezes what the counsellor saw — student profile, ranked
recommendations with evidence and provenance, the Next Best Question,
saved What-If scenarios, saved comparisons, and notes — so history never
shifts under review.

### What gets persisted

`POST /api/students/:id/sessions` (transactional: student check → session
+ student snapshot → recommendation snapshots → question snapshot).
Queryables stay relational (rank, score, eligibility); evidence,
snapshots, and simulation payloads live in jsonb. `GET
/api/students/:id/sessions`, `GET /api/sessions/:id`, `POST
/api/sessions/:id/end` (endedAt = COMPLETED; null = ACTIVE), plus note,
simulation, and comparison endpoints. Session FKs cascade; snapshot
references deliberately do not, so history survives catalogue edits.

### Lifecycle

Workspace "Start counselling session" → banner shows active → End
persists `endedAt`. `/sessions` lists snapshot summaries (top
recommendation, artifact counts); `/sessions/:id` renders the frozen
record, bannered "Snapshot from [date]".

"Historical session artifacts are snapshots and are not recomputed from
the current course catalogue."

## Current Catalogue (Milestone 12C, Wave 2.5: quality & coverage)

US: 16 universities, 35 programs. UK: 14 universities, 36 programs.
Canada: 12 universities, 19 programs. Germany: 9 universities, 16 programs.
Total: 51 universities, 106 programs (plus labelled demo seed data).

US: Northeastern (6), RIT (5), DePaul (5), Drexel (4), NJIT (3), GMU (2),
UTSA, UNO, FSU, UTD, Buffalo, UIC, UTA, MST, UML, UIUC (1 each).
UK: Southampton, Exeter, Sheffield, Loughborough, Manchester, Bristol,
Keele, Portsmouth (3 each); Liverpool, Leeds, Glasgow, MMU,
Greenwich, York (2 each).
Canada: Toronto, McGill, Dalhousie, Guelph, SFU, Queen's (2 each);
UBC (2); Manitoba, Windsor, Western, Waterloo, York (1 each).
Germany: TUM (4); TU Berlin, HPI, Saarland, Stuttgart (2 each);
Bonn, KIT, RWTH, TU Dresden (1 each).

Wave 2.5 prioritized correctness over count: 12 wrong values were
removed (Drexel $300k scholarship, Buffalo $100 fee, UTA 48 mo,
UTD 8 mo, FSU 36 mo, UIUC 60 mo + IELTS 5.0, York TOEFL 59,
Keele/Loughborough country-specific GPAs, NJIT unattributable table
rate, Portsmouth £60 textbook costs) and 21 legacy `duration = 0`
sentinels were re-ingested to null. Coverage therefore fell in places
(US tuition 16%→0%, UK GPA 15%→0%) — every removed value was proven
wrong, and UNKNOWN is preferable to a wrong value.

Wave 2 targeted ~10–12 Canadian and ~8–10 German universities with
25–35 / 20–30 programs; program counts landed below target (19 / 16)
because only reliably parseable official pages were accepted — no
fabricated records to hit the number.

- Discovery: College Scorecard (US institution cross-checks) plus
  curated official program pages; sitemaps where useful. Aggregators
  only for discovery — course facts always come from official pages.
  Canadian discovery: official university graduate-program pages
  (department + graduate-calendar sources). German discovery: official
  English program pages (CIT/faculty sites, study-program portals).
- Commands: `npm run ingest -- --country=US|UK|CA|DE [--limit=N] [--dry-run]`,
  `npm run ingest -- --all`. Bounded curated lists; per-origin politeness
  with robots.txt + crawl-delay honored; one failure never aborts a run.
- Unknown policy: missing stays null (tuition, GPA, IELTS/TOEFL, intake,
  duration). UK 2:1 classifications are never converted to GPA. Soft
  minima ("no strict requirement") are suppressed, never hardened.
  Per-credit tuition without credit basis stays unknown.
- Germany: grades (1.0–4.0 scale) are never converted to GPA — the
  requirement stays unknown with the original wording in
  `eligibility_notes`. ECTS subject prerequisites, TestDaF/DSH/telc/C1
  certificates, and semester contributions are preserved as evidence,
  never mapped to GPA/IELTS fields. Public universities correctly show
  no tuition (semester contributions are not annualized into tuition).
  Winter/Summer Semester intakes are kept as stated, never forced to Fall.
- Canada: bare "$" resolves to CAD; international tuition preferred where
  stated; per-credit pricing without a credit basis stays unknown.
- Suppressions (page-specific, documented in the adapter): Toronto MScAC
  GPA (B+ letter standing only); Dalhousie/Western/SFU durations (admin
  deadlines or prerequisite descriptions, not program lengths).
- Parser hardening from the Wave 2 audit: durations resolve by text
  position after standard-context preference (a "valid for 5 years" note
  no longer beats the stated "16-month program"); numbers adjacent to
  administrative codes ("Department Code: 78") are never scores; "do not
  accept … starts" drops negated intakes.
- Data completeness (real rows, Wave 2.5): Canada — tuition 11%,
  GPA 26%, IELTS 21%, TOEFL 16%, intake 37%, duration 26%.
  Germany — tuition 0% (correct: no-tuition public programs), GPA 0%
  (correct: no grade conversion), IELTS/TOEFL 13% each, intake 63%,
  duration 75%; 12 programs carry ECTS/language evidence in
  eligibility notes. US — tuition 0% (per-credit pricing dominates;
  unattributable tables suppressed), GPA 51%, IELTS 34%, TOEFL 43%,
  intake 29%, duration 34%. UK — tuition 69%, GPA 0% (2:1
  classifications preserved as notes, never converted), IELTS 58%,
  TOEFL 17%, intake 56%, duration 78%.
- Wave 2.5 parser hardening (each with regression tests): employment
  history never becomes duration ("3 years employment"); prerequisite
  undergraduate lengths never become master's durations ("4-year
  bachelor's"); subsection scores without "the" ("59 in Writing") and
  other-exam-led numbers ("PTE Academic 60", "5 on the OEAI Test") never
  become TOEFL/IELTS; non-refundable application fees never become
  tuition; window-truncated exam names no longer escape attribution.
- Quality report: `npm run catalogue:report
  --workspace=gradguide-backend` prints totals, per-country counts,
  coverage, suspicious records (fee-like tuition, legacy zero
  durations, off-scale English minima), and >90-day stale records.
  Currently: 106 real programs, 0 suspicious, 0 stale.
- Dedupe: normalized university + program + country identity plus URL
  canonicalization; re-runs update instead of duplicating (verified:
  second CA/DE runs inserted 0, updated 35).
- Known gaps: fee-table structures needing layout parsing (York),
  multi-track pages (UTD SE skipped), SPA/bot-walled sites (Birmingham,
  Cardiff, QMUL skipped), TOEFL new 1–6 scale stored only when iBT-range.
  Wave 2 skips: Alberta/Calgary (403/bot-walled), Concordia
  (requirements behind estimators), LMU English Informatics (404),
  Windsor MAC / Western MDA second programs (official URLs churn);
  Stuttgart intakes carry deadline-month noise (May/October/April
  alongside the correct Winter/Summer).

"Official university program pages are the preferred source of truth for
course-level information."

"The catalogue is not intended to represent every university or every
program. Missing data is explicitly preserved as unknown rather than
inferred."

### Scaling further

Same pattern scales to 130–195 universities: country adapters (one file
each), generic extraction, suppression overrides, validated candidates,
idempotent persistence. No per-university scrapers.

## Authentication (Milestone 11)

### Approach

better-auth@1.3.9 (email + password only, pinned — newer lines conflict
with the repo's drizzle-orm/vitest pins), owned by the backend Express
app and backed by the shared PostgreSQL. No OAuth, roles, or tenants.
The Next.js frontend is a thin client (login form, session reads);
cookies are same-site localhost so they flow to the API with
credentialed requests and CORS.

### Local development

```bash
cp backend/.env.example backend/.env   # set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:migrate
npm run db:seed                         # creates demo@gradguide.local (password from DEMO_COUNSELLOR_*)
```

Sign in at `/login` with the demo credentials. Never commit real
credentials; the dev password lives only in local `.env`.

### Identity → sessions

`counsellorId` is a FK to the auth user — derived from the session
cookie server-side and never trusted from the client (spoofed IDs are
ignored). Session list/detail/notes/simulations/comparisons/end all
verify ownership; foreign sessions return 404 so existence never leaks.
Students and the course catalogue stay public (documented boundary —
no per-counsellor student ownership yet).

### Protected surface

Pages (middleware redirect to `/login?next=…`): `/workspace`,
`/workspace/compare`, `/sessions`, `/sessions/:id`. APIs: every
`/api/...sessions...`, `/api/notes/...` route via `requireAuth` plus
ownership checks. Sidebar shows the live counsellor with logout.

### Limitations

Single-counsellor model (no roles/teams), no password reset or email
verification, auth tables are library-owned (hand-written Drizzle mirror,
runtime-verified). Pre-auth dev sessions were removed by migration 0005
— see its header comment.

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

## Resume Ingestion (Milestone 13)

Upload → extract → counsellor review → confirm → existing engine.
Nothing reaches a student profile without explicit confirmation.

- Upload: `POST /api/resumes/upload` (multipart, PDF magic bytes,
  5 MB limit, multer memory storage). pdfjs-dist extracts text per
  page; textless/scanned PDFs become `failed` rows with guidance,
  never empty profiles. Raw PDFs are never persisted — only metadata,
  extracted text, and the validated structure.
- Extraction: deterministic section/regex parsing (`ResumeExtractor`
  interface, so a future LLM can plug in later). GPA keeps value+scale
  (scale unknown stays unknown); percentages never become GPA;
  semester figures never become overall GPA; skills match only inside
  SKILLS sections ("Interested in AI" stays prose); budget, country,
  intake, and career goal are never inferred.
- Mapping: `ResumeExtraction → ProfileCandidate` with per-field
  evidence and `notInferred` list. Precedence is structural:
  only explicitly confirmed fields are written, so manual data is
  never silently overwritten (COUNSELLOR > RESUME > UNKNOWN).
- Confirm: `POST /api/resumes/:id/confirm` creates or patches a
  student transactionally and records field sources + confirmedAt/By.
  Review UI at `/workspace/resume` shows provenance badges, GPA
  alternatives, and existing-vs-resume conflicts (Keep/Use).
- Ownership: extraction rows carry `counsellorId` (FK, 404s across
  counsellors); students stay public per the existing boundary.
- Verified end-to-end in a real browser: upload → review → confirm →
  69 ranked recommendations, working NBQ/What-If/session flow.
  ~250ms per resume, no queues.
- Drive-by fix this milestone: `sessionsRouter.use(requireAuth)` ran
  for every `/api/*` request (prefix-mounted router), 401ing public
  routes and breaking all server-rendered session reads. Auth is now
  per-route; the frontend also sends cookies (`credentials: include`,
  `next/headers` forwarding) so browser session flows work.

## Run locally

```bash
# install (from repo root)
npm install

# database (needs PostgreSQL 16; or: npm run db:up for Docker)
cp backend/.env.example backend/.env   # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
npm run db:migrate                      # apply backend/drizzle/*.sql
npm run db:seed                         # DEV ONLY: resets tables, inserts labelled demo data + demo counsellor

# backend → http://localhost:4000/api/health
npm run dev:backend

# frontend → http://localhost:3000 (redirects to /workspace)
npm run dev:frontend
```

Sign in at `/login` with `demo@gradguide.local` / password from
`DEMO_COUNSELLOR_*` in your local `backend/.env`. The seeded demo
student, courses, and one completed session make the workspace,
catalogue, and history usable immediately.

Build / lint / tests:

```bash
npm run build:frontend
npm run build:backend
npm run lint
npm run test:backend   # 312 tests (live-DB tests need DATABASE_URL)
npm run test --workspace=gradguide-frontend   # 49 tests
```

3-minute demo script: login → workspace (ranked recommendations +
Explainable Match) → **Import resume** → upload a text PDF → review
provenance badges → **Confirm profile** → View recommendations →
Next Best Question → What-if → Compare → Start session → End session →
Sessions history shows the immutable snapshot.

## Environment variables

Backend (`backend/.env`, see `.example`): `PORT`, `DATABASE_URL`,
`BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL` (public backend
origin), `FRONTEND_URL` (public frontend origin for CORS + cookies),
`DEMO_COUNSELLOR_*` (dev seed only), `COLLEGESCOREDATA_API_KEY`
(optional, ingestion enrichment only). Never commit real values —
only `.example` files are tracked. Key production notes: `BETTER_AUTH_URL`
and `FRONTEND_URL` must be the deployed origins (cookies are
`Secure` in production); run `db:migrate` on deploy; `db:seed`
resets tables and is dev-only.

Frontend: `BACKEND_API_URL` (server fetches), `NEXT_PUBLIC_API_URL`
(browser fetches, same backend origin), optional `WORKSPACE_STUDENT_ID`.

## Decisions

- npm workspaces at the root; each side keeps its own `package.json` and `tsconfig`.
- Express + PostgreSQL + Drizzle (`pg` driver); schema in
  `backend/src/db/schema.ts`, versioned SQL in `backend/drizzle/`.
- better-auth (email + password) owns identity; the session cookie is
  the only counsellor identity source server-side.
- No Redis, queues, or object storage: ranking is sub-millisecond and
  resumes are processed in-memory (~250 ms), so there is nothing to cache.
- TypeScript strict mode, no `any`, business logic kept out of components.
- `drizzle-orm` is pinned to `0.44.5` (and hoisted to the root `devDependencies`)
  because `drizzle-kit@0.31` requires ORM `compatibilityVersion 10` and resolves
  the ORM relative to its own hoisted location.

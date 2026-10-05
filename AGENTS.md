<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GradGuide Copilot — agent notes

npm workspaces monorepo: `frontend/` (Next.js, mock data, not wired to backend) + `backend/` (Express + Drizzle + engine + ingestion). Run workspace scripts from the repo root (`npm run test:backend`); backend-only scripts need `backend/` as cwd.

## Backend setup

- Anything touching Postgres needs `backend/.env` (gitignored; copy from `backend/.env.example`). Vitest live-DB tests skip without `DATABASE_URL`.
- Port 5432 may already be held by a Homebrew PostgreSQL — `db:up` then fails with "port is already allocated". Either use the existing server (same credentials) or stop it first.
- Backend is ESM (`"type": "module"`): relative imports MUST use `.js` extensions (`../env.js`), or `tsx`/`tsc` break.

## Drizzle — read before touching

- `drizzle-orm` is pinned to `0.44.5` AND hoisted in root `devDependencies`. Do not upgrade either side alone: `drizzle-kit@0.31` requires ORM `compatibilityVersion 10` and resolves the ORM from its own hoisted location, otherwise `generate`/`migrate` fail with a misleading "install latest version" message.
- `drizzle-kit migrate` fails **silently** (exit 1, no error). Diagnose with `psql -v ON_ERROR_STOP=1 -f backend/drizzle/<file>.sql`.
- Hand-edited migrations: adding a `NOT NULL` column requires a backfill (`ADD nullable → UPDATE → SET NOT NULL`, see `0001`); relaxing constraints needs none. Never edit an already-applied migration — add a new one.

## Tests

- `npm run test:backend` → vitest, scoped to `src/**/*.test.ts` (otherwise compiled `dist/` tests double-run). Apple Silicon needs the `@rolldown/binding-darwin-arm64` devDep — don't remove it.
- Live-DB tests (`service.test.ts`) share one `pg` Pool: close it in `afterAll`, never per-test. They assert the seeded UUIDs as a subset — the catalogue grows via ingestion, so never assert exact row counts.
- Ingestion tests must be offline: parse the committed HTML fixture (`extractors/__fixtures__/`), never live-fetch.

## Hard product invariants (do not "improve")

- Recommendation engine (`backend/src/recommendations/`): pure functions only — no DB/HTTP/LLM/env/randomness. Unknown ≠ ineligible. Neutral score is 70. All scores `Math.round`, clamped 0–100. The LLM must never decide ranking.
- Ingestion: missing values stay `null` — never fabricate (no inferring GPA from prose, no months from credit hours). `robots.txt` is enforced; only public pages.
- Known debt (don't silently "fix" without asking): GPA scales compared numerically across 4.0/10.0 systems; TOEFL stored but unscored; `durationMonths 0` means unpublished; intake vocab is season names.

## Commits

Small commits with short imperative messages (e.g. `Add scoring engine with tests`), one concern each. Fold README and package.json/script changes into their feature commit — never standalone README-only or script-only commits. Never commit `backend/.env`.

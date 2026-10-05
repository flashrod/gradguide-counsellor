# gradguide-backend — Milestone 1 skeleton

Node.js + Express + TypeScript. Health endpoint only; no business logic yet.

## Endpoints

- `GET /api/health` → `{ status: "ok", service, timestamp }`

## Run locally

```bash
npm install
cp .env.example .env   # optional, defaults to PORT=4000
npm run dev            # tsx watch
npm run build          # tsc → dist/
npm start              # node dist/index.js
```

tRPC, PostgreSQL/Drizzle, and Gemini land here in later milestones.

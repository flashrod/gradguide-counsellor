import "dotenv/config";

import cors from "cors";
import express, { type Request, type Response } from "express";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./auth.js";
import { loadEnv } from "./env.js";
import { recommendationsRouter } from "./routes/recommendations.js";
import { deadlinesRouter } from "./routes/deadlines.js";
import { visaRouter } from "./routes/visa.js";
import { resumesRouter } from "./routes/resumes.js";
import { coursesRouter } from "./routes/courses.js";
import { nextQuestionRouter } from "./routes/next-question.js";
import { sessionsRouter } from "./routes/sessions.js";
import { simulationRouter } from "./routes/simulation.js";
import { studentsRouter } from "./routes/students.js";

const env = loadEnv();

const app = express();
// Credentialed CORS for the Next.js frontend (cookies must flow).
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));

// better-auth handler first: it consumes the raw request itself.
app.use("/api/auth", toNodeHandler(auth));

app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "gradguide-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", recommendationsRouter);
app.use("/api", deadlinesRouter);
app.use("/api", visaRouter);
app.use("/api", coursesRouter);
app.use("/api", nextQuestionRouter);
app.use("/api", sessionsRouter);
app.use("/api", simulationRouter);
app.use("/api", studentsRouter);
app.use("/api", resumesRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`gradguide-backend listening on http://localhost:${env.PORT}`);
});

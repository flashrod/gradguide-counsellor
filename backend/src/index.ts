import cors from "cors";
import express, { type Request, type Response } from "express";

import { recommendationsRouter } from "./routes/recommendations.js";
import { studentsRouter } from "./routes/students.js";

const PORT = Number(process.env["PORT"] ?? 4000);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "gradguide-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", recommendationsRouter);
app.use("/api", studentsRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`gradguide-backend listening on http://localhost:${PORT}`);
});

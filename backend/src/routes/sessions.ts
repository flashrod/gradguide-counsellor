import { Router, type Request, type Response } from "express";
import { z } from "zod";

import {
  addSessionNote,
  createSession,
  endSession,
  getSessionDetail,
  listSessions,
  saveSessionComparison,
  saveSessionSimulation,
  SessionNotFoundError,
  updateSessionNote,
} from "../sessions/service.js";
import { StudentNotFoundError } from "../recommendations/service.js";
import { simulationOverridesSchema } from "../recommendations/simulation.js";

const studentParams = z.object({
  studentId: z.string().uuid("studentId must be a UUID"),
});

const sessionParams = z.object({
  sessionId: z.string().uuid("sessionId must be a UUID"),
});

const noteParams = z.object({
  noteId: z.string().uuid("noteId must be a UUID"),
});

const createBody = z.object({
  counsellorId: z.string().trim().min(1).max(200),
});

const noteBody = z.object({
  content: z.string().trim().min(1).max(5000),
});

const simulationBody = z.object({
  overrides: simulationOverridesSchema,
});

const comparisonBody = z.object({
  courseIds: z.array(z.string().uuid()).min(2).max(3),
});

export const sessionsRouter: Router = Router();

function handleError(error: unknown, res: Response): void {
  if (error instanceof StudentNotFoundError || error instanceof SessionNotFoundError) {
    res.status(404).json({ error: (error as Error).message });
    return;
  }
  throw error;
}

sessionsRouter.post("/students/:studentId/sessions", async (req: Request, res: Response) => {
  const params = studentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.issues[0]?.message });
    return;
  }
  const body = createBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "counsellorId is required" });
    return;
  }
  try {
    res.status(201).json({
      session: await createSession(params.data.studentId, body.data.counsellorId),
    });
  } catch (error) {
    handleError(error, res);
  }
});

sessionsRouter.get("/students/:studentId/sessions", async (req: Request, res: Response) => {
  const params = studentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.issues[0]?.message });
    return;
  }
  try {
    res.json({ sessions: await listSessions(params.data.studentId) });
  } catch (error) {
    handleError(error, res);
  }
});

sessionsRouter.get("/sessions/:sessionId", async (req: Request, res: Response) => {
  const params = sessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.issues[0]?.message });
    return;
  }
  try {
    res.json(await getSessionDetail(params.data.sessionId));
  } catch (error) {
    handleError(error, res);
  }
});

sessionsRouter.post("/sessions/:sessionId/end", async (req: Request, res: Response) => {
  const params = sessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.issues[0]?.message });
    return;
  }
  try {
    res.json({ session: await endSession(params.data.sessionId) });
  } catch (error) {
    handleError(error, res);
  }
});

sessionsRouter.post("/sessions/:sessionId/notes", async (req: Request, res: Response) => {
  const params = sessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.issues[0]?.message });
    return;
  }
  const body = noteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Note content must be 1–5000 characters" });
    return;
  }
  try {
    res.status(201).json({
      note: await addSessionNote(params.data.sessionId, body.data.content),
    });
  } catch (error) {
    handleError(error, res);
  }
});

sessionsRouter.put("/notes/:noteId", async (req: Request, res: Response) => {
  const params = noteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.issues[0]?.message });
    return;
  }
  const body = noteBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Note content must be 1–5000 characters" });
    return;
  }
  try {
    res.json({ note: await updateSessionNote(params.data.noteId, body.data.content) });
  } catch (error) {
    if ((error as Error).message.startsWith("Note not found")) {
      res.status(404).json({ error: (error as Error).message });
      return;
    }
    throw error;
  }
});

sessionsRouter.post("/sessions/:sessionId/simulations", async (req: Request, res: Response) => {
  const params = sessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.issues[0]?.message });
    return;
  }
  const body = simulationBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({
      error: "Invalid simulation overrides",
      details: body.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }
  try {
    res.status(201).json({
      simulation: await saveSessionSimulation(params.data.sessionId, body.data.overrides),
    });
  } catch (error) {
    handleError(error, res);
  }
});

sessionsRouter.post("/sessions/:sessionId/comparisons", async (req: Request, res: Response) => {
  const params = sessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.issues[0]?.message });
    return;
  }
  const body = comparisonBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Select 2–3 courses to compare" });
    return;
  }
  try {
    res.status(201).json({
      comparison: await saveSessionComparison(params.data.sessionId, body.data.courseIds),
    });
  } catch (error) {
    if ((error as Error).message.startsWith("Courses are not in the current recommendations")) {
      res.status(400).json({ error: (error as Error).message });
      return;
    }
    handleError(error, res);
  }
});

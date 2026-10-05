import { Router, type Request, type Response } from "express";
import { z } from "zod";

import {
  getStudentById,
  StudentNotFoundError,
} from "../recommendations/service.js";

const paramsSchema = z.object({
  studentId: z.string().uuid("studentId must be a UUID"),
});

export const studentsRouter: Router = Router();

/**
 * GET /api/students/:studentId
 * Minimal student record for the workspace profile. No management
 * endpoints in this milestone.
 */
studentsRouter.get("/students/:studentId", async (req: Request, res: Response) => {
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }
  try {
    res.json({ student: await getStudentById(parsed.data.studentId) });
  } catch (error) {
    if (error instanceof StudentNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
});

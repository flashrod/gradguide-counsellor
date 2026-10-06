import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/require-auth.js";
import {
  getStudentById,
  StudentNotFoundError,
} from "../recommendations/service.js";
import { createStudentProfile, listStudentProfiles } from "../students/service.js";

const paramsSchema = z.object({
  studentId: z.string().uuid("studentId must be a UUID"),
});

const createStudentSchema = z.object({
  name: z.string().min(1).max(200),
  degree: z.string().max(200).default(""),
  field: z.string().max(200).default(""),
  gpaValue: z.number().finite().min(0).nullable().default(null),
  gpaScale: z.number().int().positive().nullable().default(null),
  budgetAmount: z.number().finite().min(0).nullable().default(null),
  budgetCurrency: z.string().regex(/^[A-Z]{3}$/).nullable().default(null),
});

export const studentsRouter: Router = Router();

/**
 * GET /api/students — minimal counsellor-facing roster for attaching
 * resumes and picking review targets. Authenticated; newest last.
 */
studentsRouter.get("/students", requireAuth, async (_req: Request, res: Response) => {
  res.json({ students: await listStudentProfiles() });
});

/**
 * POST /api/students — create a profile shell (resume confirm usually
 * fills it). Authenticated. Unknown numerics stay null, never zero.
 */
studentsRouter.post("/students", requireAuth, async (req: Request, res: Response) => {
  const parsed = createStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }
  try {
    const student = await createStudentProfile({
      name: parsed.data.name,
      degree: parsed.data.degree,
      field: parsed.data.field,
      gpaValue: parsed.data.gpaValue,
      gpaScale: parsed.data.gpaScale,
      budgetAmount: parsed.data.budgetAmount,
      budgetCurrency: parsed.data.budgetCurrency,
    });
    res.status(201).json({ student });
  } catch {
    res.status(500).json({ error: "Could not create the student profile." });
  }
});

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

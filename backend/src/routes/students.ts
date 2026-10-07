import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/require-auth.js";
import {
  getStudentById,
  StudentNotFoundError,
} from "../recommendations/service.js";
import { createStudentProfile, listStudentProfiles, updateStudentProfile } from "../students/service.js";

const paramsSchema = z.object({
  studentId: z.string().uuid("studentId must be a UUID"),
});

const createStudentSchema = z.object({
  name: z.string().min(1).max(200),
  degree: z.string().max(200).default(""),
  field: z.string().max(200).default(""),
  gpaValue: z.number().finite().min(0).nullable().default(null),
  gpaScale: z.number().int().positive().nullable().default(null),
  ieltsOverall: z.number().finite().min(0).max(9).nullable().default(null),
  toeflOverall: z.number().int().min(0).max(120).nullable().default(null),
  budgetAmount: z.number().finite().min(0).nullable().default(null),
  budgetCurrency: z.string().regex(/^[A-Z]{3}$/).nullable().default(null),
  careerGoal: z.string().max(500).nullable().default(null),
  preferredCountries: z.array(z.string().min(1).max(100)).max(20).default([]),
  preferredIntake: z.string().max(100).nullable().default(null),
  workExperienceMonths: z.number().int().min(0).max(600).nullable().default(null),
  livingCostAmount: z.number().finite().min(0).nullable().default(null),
  livingCostCurrency: z.string().regex(/^[A-Z]{3}$/).nullable().default(null),
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
      ieltsOverall: parsed.data.ieltsOverall,
      toeflOverall: parsed.data.toeflOverall,
      budgetAmount: parsed.data.budgetAmount,
      budgetCurrency: parsed.data.budgetCurrency,
      careerGoal: parsed.data.careerGoal,
      preferredCountries: parsed.data.preferredCountries,
      preferredIntake: parsed.data.preferredIntake,
      workExperienceMonths: parsed.data.workExperienceMonths,
      livingCostAmount: parsed.data.livingCostAmount,
      livingCostCurrency: parsed.data.livingCostCurrency,
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

/**
 * PATCH /api/students/:studentId — record an answer to the next-best
 * question (or any counsellor-known correction). Authenticated. Only the
 * supplied keys change; unknown values stay null, never zero. Updates the
 * live profile only — past session snapshots are copies and never rewrite.
 */
const updateStudentSchema = z.object({
  gpaValue: z.number().finite().min(0).optional(),
  gpaScale: z.number().int().positive().optional(),
  ieltsOverall: z.number().finite().min(0).max(9).nullable().optional(),
  toeflOverall: z.number().int().min(0).max(120).nullable().optional(),
  budgetAmount: z.number().finite().min(0).nullable().optional(),
  budgetCurrency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
  careerGoal: z.string().max(500).nullable().optional(),
  preferredCountries: z.array(z.string().min(1).max(100)).max(20).optional(),
  preferredIntake: z.string().max(100).nullable().optional(),
  workExperienceMonths: z.number().int().min(0).max(600).nullable().optional(),
  livingCostAmount: z.number().finite().min(0).nullable().optional(),
  livingCostCurrency: z.string().regex(/^[A-Z]{3}$/).nullable().optional(),
});

studentsRouter.patch("/students/:studentId", requireAuth, async (req: Request, res: Response) => {
  const params = paramsSchema.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.issues[0]?.message });
    return;
  }
  if (req.body == null || typeof req.body !== "object") {
    res.status(400).json({ error: "Provide at least one profile field to update." });
    return;
  }
  const parsed = updateStudentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }
  try {
    res.json({
      student: await updateStudentProfile(params.data.studentId, parsed.data),
    });
  } catch (error) {
    if (error instanceof StudentNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
});

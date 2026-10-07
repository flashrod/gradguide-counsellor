import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/require-auth.js";
import { getStudentById, StudentNotFoundError } from "../recommendations/service.js";
import {
  getVisaChecklist,
  setVisaStep,
  VisaCountryNotFoundError,
} from "../visa/service.js";

const paramsSchema = z.object({
  studentId: z.string().uuid("studentId must be a UUID"),
});

const setStepSchema = z.object({
  country: z.string().min(1).max(100),
  itemKey: z.string().min(1).max(100),
  done: z.boolean(),
});

export const visaRouter: Router = Router();

function counsellorId(req: Request): string {
  const id = req.counsellor?.id;
  if (id == null) throw new Error("Authenticated counsellor missing");
  return id;
}

async function handle(
  res: Response,
  work: () => Promise<unknown>,
  key: string
): Promise<void> {
  try {
    res.json({ [key]: await work() });
  } catch (error) {
    if (
      error instanceof StudentNotFoundError ||
      error instanceof VisaCountryNotFoundError
    ) {
      res.status(404).json({ error: (error as Error).message });
      return;
    }
    throw error;
  }
}

/** GET /api/students/:studentId/visa — checklist states for the student. */
visaRouter.get(
  "/students/:studentId/visa",
  requireAuth,
  async (req: Request, res: Response) => {
    const params = paramsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.issues[0]?.message });
      return;
    }
    const id = counsellorId(req);
    const studentId = params.data.studentId;
    await handle(res, async () => {
      const student = await getStudentById(studentId);
      return getVisaChecklist(id, studentId, student.preferredCountries);
    }, "countries");
  }
);

/** PATCH /api/students/:studentId/visa — toggle one step. */
visaRouter.patch(
  "/students/:studentId/visa",
  requireAuth,
  async (req: Request, res: Response) => {
    const params = paramsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.issues[0]?.message });
      return;
    }
    const parsed = setStepSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }
    const id = counsellorId(req);
    const studentId = params.data.studentId;
    await handle(res, async () => {
      return setVisaStep(
        id,
        studentId,
        parsed.data.country,
        parsed.data.itemKey,
        parsed.data.done
      );
    }, "countries");
  }
);

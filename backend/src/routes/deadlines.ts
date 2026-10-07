import { Router, type Request, type Response } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/require-auth.js";
import { StudentNotFoundError } from "../recommendations/service.js";
import {
  createDeadline,
  DeadlineNotFoundError,
  deleteDeadline,
  listDeadlines,
  setDeadlineDone,
} from "../deadlines/service.js";

const idParams = z.object({
  deadlineId: z.string().uuid("deadlineId must be a UUID"),
});

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dueDate must be YYYY-MM-DD")
  .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()), {
    message: "dueDate must be a real calendar date",
  });

const createDeadlineSchema = z.object({
  title: z.string().trim().min(1).max(200),
  dueDate: dateString,
  studentId: z.string().uuid().nullable().optional(),
  note: z.string().trim().max(2000).nullable().optional(),
});

const doneSchema = z.object({
  done: z.boolean(),
});

export const deadlinesRouter: Router = Router();

function counsellorId(req: Request): string {
  const id = req.counsellor?.id;
  if (id == null) throw new Error("Authenticated counsellor missing");
  return id;
}

/** GET /api/deadlines — the counsellor's reminders, soonest first. */
deadlinesRouter.get("/deadlines", requireAuth, async (req: Request, res: Response) => {
  res.json({ deadlines: await listDeadlines(counsellorId(req)) });
});

/** POST /api/deadlines — add a reminder. Dates are counsellor-entered. */
deadlinesRouter.post("/deadlines", requireAuth, async (req: Request, res: Response) => {
  const parsed = createDeadlineSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }
  try {
    res.status(201).json({
      deadline: await createDeadline(counsellorId(req), {
        title: parsed.data.title,
        dueDate: parsed.data.dueDate,
        studentId: parsed.data.studentId ?? null,
        note: parsed.data.note ?? null,
      }),
    });
  } catch (error) {
    if (error instanceof StudentNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
});

/** PATCH /api/deadlines/:deadlineId — mark done / reopen. */
deadlinesRouter.patch(
  "/deadlines/:deadlineId",
  requireAuth,
  async (req: Request, res: Response) => {
    const params = idParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.issues[0]?.message });
      return;
    }
    const parsed = doneSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }
    try {
      res.json({
        deadline: await setDeadlineDone(
          counsellorId(req),
          params.data.deadlineId,
          parsed.data.done
        ),
      });
    } catch (error) {
      if (error instanceof DeadlineNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      throw error;
    }
  }
);

/** DELETE /api/deadlines/:deadlineId — remove a reminder. */
deadlinesRouter.delete(
  "/deadlines/:deadlineId",
  requireAuth,
  async (req: Request, res: Response) => {
    const params = idParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.issues[0]?.message });
      return;
    }
    try {
      await deleteDeadline(counsellorId(req), params.data.deadlineId);
      res.status(204).end();
    } catch (error) {
      if (error instanceof DeadlineNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      throw error;
    }
  }
);

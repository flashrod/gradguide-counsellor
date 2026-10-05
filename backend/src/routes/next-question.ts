import { Router, type Request, type Response } from "express";
import { z } from "zod";

import {
  getNextBestQuestion,
  StudentNotFoundError,
} from "../recommendations/service.js";

const paramsSchema = z.object({
  studentId: z.string().uuid("studentId must be a UUID"),
});

export const nextQuestionRouter: Router = Router();

/**
 * GET /api/students/:studentId/next-question
 * Deterministic prioritization over existing recommendation output.
 * Returns either the top question or { status: "complete" } — never a
 * fabricated question.
 */
nextQuestionRouter.get(
  "/students/:studentId/next-question",
  async (req: Request, res: Response) => {
    const parsed = paramsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }
    try {
      res.json(await getNextBestQuestion(parsed.data.studentId));
    } catch (error) {
      if (error instanceof StudentNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      throw error;
    }
  }
);

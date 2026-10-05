import { Router, type Request, type Response } from "express";
import { z } from "zod";

import {
  getRecommendationsForStudent,
  StudentNotFoundError,
} from "../recommendations/service.js";

const paramsSchema = z.object({
  studentId: z.string().uuid("studentId must be a UUID"),
});

export const recommendationsRouter: Router = Router();

/**
 * GET /api/students/:studentId/recommendations
 * Runs the deterministic recommendation engine for one student over all
 * courses in the catalogue. No LLM involved — same inputs, same ranking.
 */
recommendationsRouter.get(
  "/students/:studentId/recommendations",
  async (req: Request, res: Response) => {
    const parsed = paramsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }
    try {
      const { student, recommendations } = await getRecommendationsForStudent(
        parsed.data.studentId
      );
      res.json({
        studentId: student.id,
        studentName: student.name,
        count: recommendations.length,
        recommendations,
      });
    } catch (error) {
      if (error instanceof StudentNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      throw error;
    }
  }
);

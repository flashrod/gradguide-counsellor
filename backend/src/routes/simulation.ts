import { Router, type Request, type Response } from "express";
import { z } from "zod";

import {
  simulateRecommendationsForStudent,
  StudentNotFoundError,
} from "../recommendations/service.js";
import { simulationOverridesSchema } from "../recommendations/simulation.js";

const paramsSchema = z.object({
  studentId: z.string().uuid("studentId must be a UUID"),
});

const bodySchema = z.object({
  overrides: simulationOverridesSchema,
});

export const simulationRouter: Router = Router();

/**
 * POST /api/students/:id/recommendations/simulate
 * What-If scenarios over a temporary in-memory profile copy.
 * Read-only: never mutates the stored student record.
 */
simulationRouter.post(
  "/students/:studentId/recommendations/simulate",
  async (req: Request, res: Response) => {
    const params = paramsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.issues[0]?.message });
      return;
    }
    const body = bodySchema.safeParse(req.body);
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
      res.json(
        await simulateRecommendationsForStudent(
          params.data.studentId,
          body.data.overrides
        )
      );
    } catch (error) {
      if (error instanceof StudentNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      throw error;
    }
  }
);

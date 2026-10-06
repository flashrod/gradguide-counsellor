import { Router, type Request, type Response } from "express";
import { z } from "zod";

import {
  catalogueFacets,
  CourseNotFoundError,
  getCourseDetails,
  listCatalogue,
} from "../courses/details.js";

const paramsSchema = z.object({
  courseId: z.string().uuid("courseId must be a UUID"),
});

const listQuerySchema = z.object({
  country: z.string().max(100).optional(),
  field: z.string().max(100).optional(),
  degree: z.string().max(50).optional(),
  intake: z.string().max(50).optional(),
  search: z.string().max(200).optional(),
  currency: z.string().length(3).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export const coursesRouter: Router = Router();

/**
 * GET /api/courses
 * Filtered catalogue listing for the Courses explorer. Display data
 * only — no scoring.
 */
coursesRouter.get("/courses", async (req: Request, res: Response) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid catalogue filters" });
    return;
  }
  res.json(await listCatalogue(parsed.data));
});

/**
 * GET /api/courses/meta
 * Distinct filter values for the catalogue explorer.
 */
coursesRouter.get("/courses/meta", async (_req: Request, res: Response) => {
  res.json(await catalogueFacets());
});

/**
 * GET /api/courses/:courseId
 * Display-only details for the comparison view. No computation —
 * scores and eligibility come from the recommendations response.
 */
coursesRouter.get("/courses/:courseId", async (req: Request, res: Response) => {
  const parsed = paramsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }
  try {
    res.json({ course: await getCourseDetails(parsed.data.courseId) });
  } catch (error) {
    if (error instanceof CourseNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
});

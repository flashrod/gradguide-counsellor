import { Router, type Request, type Response } from "express";
import { z } from "zod";

import {
  CourseNotFoundError,
  getCourseDetails,
} from "../courses/details.js";

const paramsSchema = z.object({
  courseId: z.string().uuid("courseId must be a UUID"),
});

export const coursesRouter: Router = Router();

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

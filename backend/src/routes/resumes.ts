import { Router, type NextFunction, type Request, type Response } from "express";
import multer, { MulterError } from "multer";
import { z } from "zod";

import { requireAuth } from "../middleware/require-auth.js";
import { StudentNotFoundError } from "../recommendations/service.js";
import {
  confirmResume,
  getResume,
  InvalidResumeError,
  MAX_RESUME_BYTES,
  ResumeNotFoundError,
  uploadResume,
} from "../resume/service.js";

export const resumesRouter: Router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_BYTES, files: 1, fields: 5 },
});

const uploadBodySchema = z.object({
  studentId: z.string().uuid().optional(),
});

const idParamsSchema = z.object({
  id: z.string().uuid("id must be a UUID"),
});

/**
 * POST /api/resumes/upload (multipart, field "resume").
 * Authenticated counsellor only. The PDF is processed in memory and never
 * stored; only metadata, extracted text, and the validated structure
 * persist — scoped to the uploading counsellor.
 */
resumesRouter.post(
  "/resumes/upload",
  requireAuth,
  upload.single("resume"),
  async (req: Request, res: Response) => {
    const parsed = uploadBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (file == null || file.size === 0) {
      res.status(400).json({ error: "Attach a PDF resume as the 'resume' field." });
      return;
    }
    try {
      const detail = await uploadResume(req.counsellor?.id ?? "", {
        fileName: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer,
        studentId: parsed.data.studentId,
      });
      res.status(detail.status === "failed" ? 422 : 201).json({ resume: detail });
    } catch (error) {
      if (error instanceof InvalidResumeError) {
        res.status(400).json({ error: error.message });
        return;
      }
      if (error instanceof StudentNotFoundError) {
        res.status(404).json({ error: error.message });
        return;
      }
      throw error;
    }
  }
);

/**
 * GET /api/resumes/:id — counsellor-owned extraction + candidates.
 * Foreign rows read as 404 so existence never leaks.
 */
resumesRouter.get("/resumes/:id", requireAuth, async (req: Request, res: Response) => {
  const parsed = idParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }
  try {
    res.json({ resume: await getResume(req.counsellor?.id ?? "", parsed.data.id) });
  } catch (error) {
    if (error instanceof ResumeNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    throw error;
  }
});

/**
 * POST /api/resumes/:id/confirm — apply only explicitly confirmed fields
 * to a new or existing student profile. The resume never auto-applies;
 * absent values stay untouched (unknown).
 */
resumesRouter.post("/resumes/:id/confirm", requireAuth, async (req: Request, res: Response) => {
  const parsed = idParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message });
    return;
  }
  try {
    const result = await confirmResume(req.counsellor?.id ?? "", parsed.data.id, req.body);
    res.json(result);
  } catch (error) {
    if (error instanceof ResumeNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }
    if (error instanceof InvalidResumeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }
});

// Multer failures (size, shape) become 400s instead of HTML error pages.
resumesRouter.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof MulterError) {
      res.status(400).json({
        error: error.code === "LIMIT_FILE_SIZE" ? "Resume must be under 5 MB." : "Could not read the uploaded resume.",
      });
      return;
    }
    throw error;
  }
);

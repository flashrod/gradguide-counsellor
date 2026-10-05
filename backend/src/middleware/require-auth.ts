import type { NextFunction, Request, Response } from "express";

import { auth } from "../auth.js";

export interface AuthenticatedCounsellor {
  id: string;
  email: string;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  namespace Express {
    interface Request {
      counsellor?: AuthenticatedCounsellor;
    }
  }
}

/**
 * Backend authentication gate (Milestone 11). Resolves the counsellor from
 * the better-auth session cookie — never from request bodies. Ownership
 * checks happen against `req.counsellor` in the session service/routes.
 * Unknown sessions and foreign sessions both yield 404 downstream so
 * existence is never leaked.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const session = await auth.api.getSession({
      headers: new Headers({ cookie: req.headers.cookie ?? "" }),
    });
    if (session?.user == null) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.counsellor = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
    next();
  } catch {
    res.status(401).json({ error: "Authentication required" });
  }
}

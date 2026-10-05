import { cookies } from "next/headers";

export interface CurrentCounsellor {
  id: string;
  email: string;
  name: string;
}

/**
 * Resolve the current counsellor server-side by forwarding cookies to the
 * backend session endpoint. Returns null when unauthenticated.
 */
export async function getCurrentCounsellor(): Promise<CurrentCounsellor | null> {
  const backendUrl =
    process.env["BACKEND_API_URL"] ?? "http://localhost:4000";
  const cookieHeader = (await cookies())
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  if (cookieHeader === "") return null;
  try {
    const response = await fetch(`${backendUrl}/api/auth/get-session`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const session = (await response.json()) as {
      user?: { id: string; email: string; name: string } | null;
    };
    if (session?.user == null) return null;
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    };
  } catch {
    return null;
  }
}

import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/workspace", "/sessions", "/live", "/deadlines", "/visa"];

/**
 * Route protection (Milestone 11). Verifies the backend session by
 * forwarding the request cookies; unauthenticated visits redirect to
 * /login. The backend re-verifies on every API call — this gate is UX,
 * not the authorization boundary. One retry covers transient backend
 * hiccups (e.g. database cold starts) so a slow first byte does not
 * bounce a signed-in counsellor back to the login form.
 */
async function fetchSession(backendUrl: string, cookie: string) {
  const response = await fetch(`${backendUrl}/api/auth/get-session`, {
    headers: { cookie },
  });
  if (!response.ok) throw new Error(`session check failed: ${response.status}`);
  const session = (await response.json()) as { user?: unknown };
  if (session?.user == null) throw new Error("unauthenticated");
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const protectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!protectedRoute) return NextResponse.next();

  const backendUrl =
    process.env["BACKEND_API_URL"] ?? "http://localhost:4000";
  const cookie = request.headers.get("cookie") ?? "";
  try {
    await fetchSession(backendUrl, cookie);
  } catch {
    try {
      await fetchSession(backendUrl, cookie);
    } catch {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/workspace/:path*", "/sessions/:path*", "/live/:path*", "/deadlines/:path*", "/visa/:path*"],
};

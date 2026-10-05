import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/workspace", "/sessions"];

/**
 * Route protection (Milestone 11). Verifies the backend session by
 * forwarding the request cookies; unauthenticated visits redirect to
 * /login. The backend re-verifies on every API call — this gate is UX,
 * not the authorization boundary.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const protectedRoute = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!protectedRoute) return NextResponse.next();

  const backendUrl =
    process.env["BACKEND_API_URL"] ?? "http://localhost:4000";
  try {
    const response = await fetch(`${backendUrl}/api/auth/get-session`, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    if (!response.ok) throw new Error("unauthenticated");
    const session = (await response.json()) as { user?: unknown };
    if (session?.user == null) throw new Error("unauthenticated");
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/workspace/:path*", "/sessions/:path*"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("zpath_auth")?.value;
  const { pathname } = request.nextUrl;

  const isProtectedRoute =
    pathname.startsWith("/profile") ||
    pathname.startsWith("/dashboard") ||
    pathname === "/advisor" ||
    pathname.startsWith("/advisor/") ||
    pathname === "/unimap" ||
    pathname.startsWith("/unimap/");

  if (isProtectedRoute) {
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

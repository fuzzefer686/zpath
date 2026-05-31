import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("zpath_auth")?.value;
  const { pathname } = request.nextUrl;

  // Protect private routes (/profile and /dashboard)
  if (pathname.startsWith("/profile") || pathname.startsWith("/dashboard")) {
    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.searchParams.set("auth", "required");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

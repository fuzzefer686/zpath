import { NextResponse, type NextRequest } from "next/server";

const hiddenPagePrefixes = ["/majorly", "/unimap", "/news"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    hiddenPagePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/advisor";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/majorly/:path*", "/unimap/:path*", "/news/:path*"],
};

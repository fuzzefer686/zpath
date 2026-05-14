import { NextResponse, type NextRequest } from "next/server";

const hiddenCatalogPrefixes = ["/majorly", "/unimap"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    hiddenCatalogPrefixes.some(
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
  matcher: ["/majorly/:path*", "/unimap/:path*"],
};

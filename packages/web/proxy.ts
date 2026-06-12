import { NextResponse, type NextRequest } from "next/server";
import { cookieName, fallbackLng, isSupportedLanguage } from "./i18n/settings";

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)", { source: "/" }],
};

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const language = request.cookies.get(cookieName)?.value;

  if (!language || !isSupportedLanguage(language)) {
    response.cookies.set(cookieName, fallbackLng, {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return response;
}

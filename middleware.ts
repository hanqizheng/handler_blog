import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

import { LOCALES } from "@/constants/i18n";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

const ADMIN_SESSION_COOKIE = "admin-session";

const normalizePathname = (pathname: string) => {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];
  if (LOCALES.includes(maybeLocale as (typeof LOCALES)[number])) {
    return {
      locale: maybeLocale,
      pathname: `/${segments.slice(2).join("/")}`,
    };
  }
  return { locale: null, pathname };
};

const base64UrlToUint8Array = (input: string) => {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4;
  const normalized =
    padding === 0 ? padded : padded + "=".repeat(4 - padding);
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const textEncoder = new TextEncoder();

const verifyAdminToken = async (token: string) => {
  const secret = process.env.ADMIN_AUTH_SECRET?.trim();
  if (!secret) {
    return null;
  }

  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const data = textEncoder.encode(`${header}.${payload}`);
  const signatureBytes = base64UrlToUint8Array(signature);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    data,
  );
  if (!valid) {
    return null;
  }

  const payloadBytes = base64UrlToUint8Array(payload);
  const decoded = JSON.parse(
    new TextDecoder().decode(payloadBytes),
  ) as { sub?: number; email?: string; exp?: number };
  if (!decoded?.sub || !decoded?.email || !decoded?.exp) {
    return null;
  }
  if (decoded.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }
  return decoded;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const normalized = normalizePathname(pathname);

  const isAdminPage = normalized.pathname.startsWith("/admin");
  const isAdminApi = normalized.pathname.startsWith("/api/admin");
  if (!isAdminPage && !isAdminApi) {
    return intlMiddleware(request);
  }

  const publicAdminPages = ["/admin/login", "/admin/signup"];
  const publicAdminApis = [
    "/api/admin/auth/login",
    "/api/admin/auth/signup",
  ];

  if (
    (isAdminPage && publicAdminPages.includes(normalized.pathname)) ||
    (isAdminApi && publicAdminApis.includes(normalized.pathname))
  ) {
    return intlMiddleware(request);
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = token ? await verifyAdminToken(token) : null;
  if (!session) {
    if (isAdminApi) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      );
    }

    const redirectUrl = request.nextUrl.clone();
    const prefix = normalized.locale ? `/${normalized.locale}` : "";
    redirectUrl.pathname = `${prefix}/admin/login`;
    return NextResponse.redirect(redirectUrl);
  }

  const response = intlMiddleware(request);
  if (isAdminPage) {
    response.headers.set("Cache-Control", "no-store");
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/api/admin/:path*",
  ],
};

import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "admin-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

interface AdminSessionPayload {
  sub: number;
  email: string;
  iat: number;
  exp: number;
}

const getAuthSecret = () => {
  const secret = process.env.ADMIN_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("ADMIN_AUTH_SECRET 未配置");
  }
  return secret;
};

const base64UrlEncode = (input: Buffer) =>
  input
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const base64UrlDecode = (input: string) => {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = padded.length % 4;
  const normalized =
    padding === 0 ? padded : padded + "=".repeat(4 - padding);
  return Buffer.from(normalized, "base64");
};

const signHS256 = (value: string, secret: string) =>
  createHmac("sha256", secret).update(value).digest();

const encodeJwt = (payload: AdminSessionPayload, secret: string) => {
  const header = base64UrlEncode(
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }), "utf8"),
  );
  const body = base64UrlEncode(Buffer.from(JSON.stringify(payload), "utf8"));
  const signature = base64UrlEncode(signHS256(`${header}.${body}`, secret));
  return `${header}.${body}.${signature}`;
};

const decodeJwt = (token: string, secret: string): AdminSessionPayload | null => {
  const [header, body, signature] = token.split(".");
  if (!header || !body || !signature) return null;

  const expected = signHS256(`${header}.${body}`, secret);
  const actual = base64UrlDecode(signature);
  if (
    expected.length !== actual.length ||
    !timingSafeEqual(expected, actual)
  ) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(body).toString("utf8")) as
    | AdminSessionPayload
    | undefined;
  if (!payload?.sub || !payload.exp || !payload.email) return null;
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  return payload;
};

export const createAdminSessionToken = (options: {
  userId: number;
  email: string;
}) => {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    sub: options.userId,
    email: options.email,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  return encodeJwt(payload, getAuthSecret());
};

export const verifyAdminSessionToken = (token: string | undefined | null) => {
  if (!token) return null;
  try {
    return decodeJwt(token, getAuthSecret());
  } catch {
    return null;
  }
};

export const getAdminSession = async () => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
};

export const buildAdminSessionCookie = (token: string) => {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.FORCE_SECURE_COOKIES === "true") {
    parts.push("Secure");
  }
  return parts.join("; ");
};

export const buildAdminSessionClearCookie = () => {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.FORCE_SECURE_COOKIES === "true") {
    parts.push("Secure");
  }
  return parts.join("; ");
};

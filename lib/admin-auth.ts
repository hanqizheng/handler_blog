import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "admin-session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export type AdminActorType = "owner" | "dev";

interface AdminSessionPayload {
  sub: number;
  email: string;
  iat: number;
  exp: number;
  actorType: AdminActorType;
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

const isDevelopmentRuntime = () => process.env.NODE_ENV === "development";

const normalizeActorType = (value: unknown): AdminActorType =>
  value === "dev" ? "dev" : "owner";

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
    | Partial<AdminSessionPayload>
    | undefined;
  if (
    typeof payload?.sub !== "number" ||
    !Number.isInteger(payload.sub) ||
    typeof payload.email !== "string" ||
    !payload.email ||
    typeof payload.iat !== "number" ||
    !Number.isFinite(payload.iat) ||
    typeof payload.exp !== "number" ||
    !Number.isFinite(payload.exp)
  ) {
    return null;
  }
  if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
  const actorType = normalizeActorType(payload.actorType);
  if (actorType === "dev" && !isDevelopmentRuntime()) {
    return null;
  }
  return {
    sub: payload.sub,
    email: payload.email,
    iat: payload.iat,
    exp: payload.exp,
    actorType,
  };
};

export const createAdminSessionToken = (options: {
  userId: number;
  email: string;
  actorType?: AdminActorType;
}) => {
  const now = Math.floor(Date.now() / 1000);
  const actorType = options.actorType ?? "owner";
  if (actorType === "dev" && !isDevelopmentRuntime()) {
    throw new Error("dev admin session is only allowed in development");
  }
  const payload: AdminSessionPayload = {
    sub: options.userId,
    email: options.email,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
    actorType,
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

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "comment_device_id";
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const MAX_DEVICE_ID_LENGTH = 64;

const getDeviceSecret = () => {
  const secret =
    process.env.COMMENT_DEVICE_SECRET?.trim() ||
    process.env.ADMIN_AUTH_SECRET?.trim() ||
    process.env.COMMENT_IP_SALT?.trim();
  if (!secret) {
    throw new Error("COMMENT_DEVICE_SECRET 未配置");
  }
  return secret;
};

const base64UrlEncode = (input: Buffer) =>
  input
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

const signValue = (value: string, secret: string) =>
  base64UrlEncode(createHmac("sha256", secret).update(value).digest());

export const createCommentDeviceId = () => randomBytes(16).toString("hex");

export const signCommentDeviceId = (deviceId: string) => {
  if (!deviceId || deviceId.length > MAX_DEVICE_ID_LENGTH) {
    return null;
  }
  const signature = signValue(deviceId, getDeviceSecret());
  return `${deviceId}.${signature}`;
};

export const parseCommentDeviceToken = (token: string | null | undefined) => {
  if (!token) {
    return null;
  }
  const [deviceId, signature] = token.split(".");
  if (!deviceId || !signature) {
    return null;
  }
  if (deviceId.length > MAX_DEVICE_ID_LENGTH) {
    return null;
  }
  const expected = signValue(deviceId, getDeviceSecret());
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== actualBuffer.length ||
    !timingSafeEqual(expectedBuffer, actualBuffer)
  ) {
    return null;
  }
  return deviceId;
};

export const buildCommentDeviceCookie = (token: string) => {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    `Max-Age=${COOKIE_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.FORCE_SECURE_COOKIES === "true") {
    parts.push("Secure");
  }
  return parts.join("; ");
};

export const buildCommentDeviceClearCookie = () => {
  const parts = [
    `${COOKIE_NAME}=`,
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

export const COMMENT_DEVICE_COOKIE_NAME = COOKIE_NAME;

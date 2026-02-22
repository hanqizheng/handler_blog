import { createHash, randomBytes } from "node:crypto";

const DEFAULT_INVITATION_EXPIRES_MINUTES = 15;

const parsePositiveInt = (value: string | undefined) => {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

export const getInvitationExpiresMinutes = () => {
  const parsed = parsePositiveInt(
    process.env.ADMIN_INVITATION_EXPIRES_MINUTES?.trim(),
  );
  return parsed ?? DEFAULT_INVITATION_EXPIRES_MINUTES;
};

export const generateInvitationToken = () => randomBytes(32).toString("hex");

export const hashInvitationToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const buildInvitationPath = (token: string) =>
  `/admin/accept-invitation?token=${encodeURIComponent(token)}`;

export const buildInvitationUrl = (token: string) => {
  const path = buildInvitationPath(token);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (!siteUrl) {
    return path;
  }
  return `${siteUrl}${path}`;
};

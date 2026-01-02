import crypto from "crypto";

import { generateUploadTokenWithSDK, getServerQiniuConfig } from "@/lib/qiniu";

export const runtime = "nodejs";

const resolveDisplayDomain = (input: string | undefined) => {
  if (!input) return undefined;
  const trimmed = input.trim().replace(/\/+$/g, "");
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export async function POST(request: Request) {
  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const body = payload as { key?: unknown };
  const key =
    typeof body?.key === "string" ? body.key.trim().replace(/^\/+/, "") : "";

  if (!key) {
    return Response.json(
      { ok: false, error: "key is required" },
      { status: 400 },
    );
  }

  let qiniuConfig: ReturnType<typeof getServerQiniuConfig>;

  try {
    qiniuConfig = getServerQiniuConfig();
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "配置缺失",
      },
      { status: 500 },
    );
  }

  const displayDomain = resolveDisplayDomain(qiniuConfig.displayDomain);

  const expiresInSeconds = 3600;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const { token, scope } = generateUploadTokenWithSDK(qiniuConfig, {
    key,
    expiresInSeconds,
  });
  const deadline = nowSeconds + expiresInSeconds;
  const policy = { scope, deadline };

  if (process.env.QINIU_DEBUG === "true") {
    const tokenHash = crypto.createHash("sha1").update(token).digest("hex");
    console.info("[qiniu] upload-token", {
      bucket: qiniuConfig.bucket,
      key,
      uploadDomain: qiniuConfig.uploadDomain,
      displayDomain,
      policy,
      deadline,
      tokenHash,
    });
  }

  return Response.json({
    ok: true,
    token,
    key,
    uploadDomain: qiniuConfig.uploadDomain,
    displayDomain,
    expiresAt: deadline,
    issuedAt: nowSeconds,
  });
}

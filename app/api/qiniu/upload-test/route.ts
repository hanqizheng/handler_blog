import { generateUploadTokenWithSDK, getServerQiniuConfig } from "@/lib/qiniu";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const keyParam = requestUrl.searchParams.get("key");
  const key =
    typeof keyParam === "string" && keyParam.trim()
      ? keyParam.trim().replace(/^\/+/, "")
      : `debug/${Date.now()}-upload-test.txt`;

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

  const expiresInSeconds = 3600;
  const { token } = generateUploadTokenWithSDK(
    qiniuConfig,
    { key, expiresInSeconds },
  );
  const deadline = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const formData = new FormData();
  formData.append("token", token);
  formData.append("key", key);
  formData.append("file", new Blob(["upload-test"], { type: "text/plain" }), "upload-test.txt");

  const response = await fetch(qiniuConfig.uploadDomain, {
    method: "POST",
    body: formData,
  });

  const text = await response.text();
  if (!response.ok) {
    return Response.json(
      {
        ok: false,
        status: response.status,
        error: text || "上传失败",
        key,
        bucket: qiniuConfig.bucket,
        uploadDomain: qiniuConfig.uploadDomain,
        deadline,
      },
      { status: response.status },
    );
  }

  let payload: unknown = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  return Response.json({
    ok: true,
    key,
    bucket: qiniuConfig.bucket,
    uploadDomain: qiniuConfig.uploadDomain,
    deadline,
    response: payload,
  });
}

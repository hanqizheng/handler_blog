import { getAdminSession } from "@/lib/admin-auth";
import {
  createBucketManager,
  extractQiniuObjectKey,
  getServerQiniuConfig,
} from "@/lib/qiniu";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const body = payload as { key?: unknown };
  const rawKey =
    typeof body?.key === "string" ? body.key.trim().replace(/^\/+/, "") : "";

  if (!rawKey) {
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

  const key = extractQiniuObjectKey(rawKey, qiniuConfig.displayDomain);
  if (!key) {
    return Response.json(
      { ok: false, error: "无法解析文件路径" },
      { status: 400 },
    );
  }

  const bucketManager = createBucketManager(qiniuConfig);

  try {
    const { resp } = await bucketManager.delete(qiniuConfig.bucket, key);
    const statusCode = resp.statusCode ?? 500;
    const responseData = (resp as { data?: { error?: string } }).data;
    if (statusCode !== 200 && statusCode !== 612) {
      return Response.json(
        { ok: false, error: responseData?.error || "删除失败" },
        { status: statusCode },
      );
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "删除失败",
      },
      { status: 500 },
    );
  }
}

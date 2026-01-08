import { createBucketManager, getServerQiniuConfig } from "@/lib/qiniu";

export const runtime = "nodejs";

export async function GET() {
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

  const bucketManager = createBucketManager(qiniuConfig);

  try {
    const { data, resp } = await bucketManager.listBucket();
    const statusCode = resp.statusCode ?? 500;
    const responseData = (resp as { data?: { error?: string } }).data;
    if (statusCode < 200 || statusCode >= 300) {
      return Response.json(
        {
          ok: false,
          status: statusCode,
          error: responseData?.error || "验证失败",
        },
        { status: statusCode },
      );
    }

    return Response.json({ ok: true, buckets: data });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "验证失败",
      },
      { status: 500 },
    );
  }
}

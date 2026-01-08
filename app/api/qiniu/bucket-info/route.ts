import { createBucketManager, getServerQiniuConfig } from "@/lib/qiniu";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  let qiniuConfig: ReturnType<typeof getServerQiniuConfig>;
  let bucket: string;

  try {
    qiniuConfig = getServerQiniuConfig();
    bucket = requestUrl.searchParams.get("bucket")?.trim() || qiniuConfig.bucket;
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "配置缺失",
      },
      { status: 500 },
    );
  }

  try {
    const bucketManager = createBucketManager(qiniuConfig);
    const { data, resp } = await bucketManager.getBucketInfo(bucket);
    const statusCode = resp.statusCode ?? 500;
    const responseData = (resp as { data?: { error?: string } }).data;
    if (statusCode < 200 || statusCode >= 300) {
      return Response.json(
        {
          ok: false,
          status: statusCode,
          error: responseData?.error || "查询失败",
        },
        { status: statusCode },
      );
    }

    return Response.json({ ok: true, bucket, info: data });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "查询失败",
      },
      { status: 500 },
    );
  }
}

import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { photoAlbumPhotos, photoAlbums, qiniuDeleteTasks } from "@/db/schema";
import { getAdminSession } from "@/lib/admin-auth";
import {
  createBucketManager,
  extractQiniuObjectKey,
  getServerQiniuConfig,
} from "@/lib/qiniu";

export const runtime = "nodejs";

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

type CleanupCandidate = {
  resourceType: "album_cover" | "album_photo";
  resourceId: number | null;
  objectKey: string;
};

type CleanupFailedCandidate = CleanupCandidate & {
  error: string;
  attempted: boolean;
};

type QiniuDeleteTaskInsert = typeof qiniuDeleteTasks.$inferInsert;

const normalizeObjectKey = (value: string) =>
  value.trim().replace(/^\/+/, "");

const getCleanupCandidates = (input: {
  albumId: number;
  coverUrl: string | null;
  photos: Array<{ id: number; imageUrl: string; imageKey: string }>;
  displayDomain?: string;
}) => {
  const seen = new Set<string>();
  const tasks: CleanupCandidate[] = [];

  const pushCandidate = (candidate: CleanupCandidate) => {
    const key = normalizeObjectKey(candidate.objectKey);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    tasks.push({ ...candidate, objectKey: key });
  };

  const coverKey = extractQiniuObjectKey(
    input.coverUrl ?? "",
    input.displayDomain,
  );
  if (coverKey) {
    pushCandidate({
      resourceType: "album_cover",
      resourceId: input.albumId,
      objectKey: coverKey,
    });
  }

  for (const photo of input.photos) {
    const keyFromDb = normalizeObjectKey(photo.imageKey);
    const parsedKey = extractQiniuObjectKey(photo.imageUrl, input.displayDomain);
    const key = keyFromDb || parsedKey;
    if (!key) continue;
    pushCandidate({
      resourceType: "album_photo",
      resourceId: photo.id,
      objectKey: key,
    });
  }

  return tasks;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  const [album] = await db
    .select()
    .from(photoAlbums)
    .where(eq(photoAlbums.id, id))
    .limit(1);
  if (!album) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const photos = await db
    .select()
    .from(photoAlbumPhotos)
    .where(eq(photoAlbumPhotos.albumId, id))
    .orderBy(asc(photoAlbumPhotos.createdAt));

  return NextResponse.json({ ok: true, album, photos });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  const [album] = await db
    .select({ id: photoAlbums.id, coverUrl: photoAlbums.coverUrl })
    .from(photoAlbums)
    .where(eq(photoAlbums.id, id))
    .limit(1);

  if (!album) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const photos = await db
    .select({
      id: photoAlbumPhotos.id,
      imageUrl: photoAlbumPhotos.imageUrl,
      imageKey: photoAlbumPhotos.imageKey,
    })
    .from(photoAlbumPhotos)
    .where(eq(photoAlbumPhotos.albumId, id));

  let deletedFileCount = 0;
  const failedCleanupTasks: CleanupFailedCandidate[] = [];
  let displayDomain: string | undefined;
  let bucketManager: ReturnType<typeof createBucketManager> | null = null;
  let bucketName = "";
  let initCleanupError = "";

  try {
    const qiniuConfig = getServerQiniuConfig();
    displayDomain = qiniuConfig.displayDomain;
    bucketName = qiniuConfig.bucket;
    bucketManager = createBucketManager(qiniuConfig);
  } catch (error) {
    displayDomain = process.env.QINIU_DISPLAY_DOMAIN?.trim() || undefined;
    initCleanupError =
      error instanceof Error ? error.message : "Qiniu cleanup init failed";
  }

  const cleanupCandidates = getCleanupCandidates({
    albumId: album.id,
    coverUrl: album.coverUrl,
    photos,
    displayDomain,
  });

  if (!bucketManager || !bucketName) {
    for (const candidate of cleanupCandidates) {
      failedCleanupTasks.push({
        ...candidate,
        error: initCleanupError || "Qiniu cleanup init failed",
        attempted: false,
      });
    }
  } else {
    for (const candidate of cleanupCandidates) {
      try {
        const { resp } = await bucketManager.delete(bucketName, candidate.objectKey);
        const statusCode = resp.statusCode ?? 500;
        const responseData = (resp as { data?: { error?: string } }).data;
        if (statusCode !== 200 && statusCode !== 612) {
          failedCleanupTasks.push({
            ...candidate,
            error: responseData?.error || `delete failed (${statusCode})`,
            attempted: true,
          });
          continue;
        }
        deletedFileCount += 1;
      } catch (error) {
        failedCleanupTasks.push({
          ...candidate,
          error: error instanceof Error ? error.message : "delete failed",
          attempted: true,
        });
      }
    }
  }

  await db.transaction(async (tx) => {
    if (failedCleanupTasks.length > 0) {
      const queuedTasks: QiniuDeleteTaskInsert[] = failedCleanupTasks.map(
        (item) => {
          const status: QiniuDeleteTaskInsert["status"] = item.attempted
            ? "failed"
            : "pending";
          return {
            resourceType: item.resourceType,
            resourceId: item.resourceId,
            objectKey: item.objectKey,
            status,
            attempts: item.attempted ? 1 : 0,
            lastError: item.error,
          };
        },
      );

      await tx.insert(qiniuDeleteTasks).values(queuedTasks);
    }

    await tx.delete(photoAlbums).where(eq(photoAlbums.id, id));
  });

  return NextResponse.json({
    ok: true,
    deletedFileCount,
    queuedRetryCount: failedCleanupTasks.length,
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ ok: false, error: "invalid id" }, { status: 400 });
  }

  let payload: unknown = null;
  try {
    payload = await request.json();
  } catch {
    payload = null;
  }

  const data = payload as { coverUrl?: unknown };
  const coverUrl =
    typeof data?.coverUrl === "string" ? data.coverUrl.trim() : "";

  await db
    .update(photoAlbums)
    .set({ coverUrl: coverUrl || null })
    .where(eq(photoAlbums.id, id));

  return NextResponse.json({ ok: true });
}

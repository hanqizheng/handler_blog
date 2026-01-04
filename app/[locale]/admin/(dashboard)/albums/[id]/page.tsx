import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { photoAlbumPhotos, photoAlbums } from "@/db/schema";

import { AlbumPhotoManager } from "./_components/AlbumPhotoManager";

export default async function AdminAlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const albumId = Number(rawId);
  if (!Number.isInteger(albumId) || albumId <= 0) {
    notFound();
  }

  const [album] = await db
    .select()
    .from(photoAlbums)
    .where(eq(photoAlbums.id, albumId))
    .limit(1);
  if (!album) {
    notFound();
  }

  const photos = await db
    .select()
    .from(photoAlbumPhotos)
    .where(eq(photoAlbumPhotos.albumId, albumId))
    .orderBy(photoAlbumPhotos.createdAt);

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{album.name}</h1>
        <p className="text-sm text-slate-500">
          上传目录：photo_album/{album.slug}
        </p>
      </div>
      <AlbumPhotoManager albumId={album.id} albumSlug={album.slug} photos={photos} />
    </section>
  );
}

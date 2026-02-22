import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { db } from "@/db";
import { photoAlbumPhotos, photoAlbums } from "@/db/schema";
import { ImagePreviewGallery } from "@/components/image-preview";
import { Link } from "@/i18n/navigation";

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export default async function AlbumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("site.albumDetail");
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return (
      <main>
        <p>{t("notFound")}</p>
        <Link href="/albums">{t("backToAlbums")}</Link>
      </main>
    );
  }

  const [album] = await db
    .select()
    .from(photoAlbums)
    .where(eq(photoAlbums.id, id))
    .limit(1);

  if (!album) {
    return (
      <main>
        <p>{t("notFound")}</p>
        <Link href="/albums">{t("backToAlbums")}</Link>
      </main>
    );
  }

  const photos = await db
    .select()
    .from(photoAlbumPhotos)
    .where(eq(photoAlbumPhotos.albumId, album.id))
    .orderBy(asc(photoAlbumPhotos.createdAt));

  const images = photos.map((photo) => ({
    src: photo.imageUrl,
    alt: album.name,
  }));

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{album.name}</h1>
        {album.description ? (
          <p className="text-sm text-slate-600">{album.description}</p>
        ) : null}
      </div>
      <section className="mt-8">
        {photos.length === 0 ? (
          <p>{t("emptyPhotos")}</p>
        ) : (
          <ImagePreviewGallery images={images} />
        )}
      </section>
      <p className="mt-8">
        <Link href="/albums">{t("backToAlbums")}</Link>
      </p>
    </main>
  );
}

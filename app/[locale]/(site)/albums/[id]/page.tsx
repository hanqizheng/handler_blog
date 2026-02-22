import { asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { db } from "@/db";
import { photoAlbumPhotos, photoAlbums } from "@/db/schema";
import { ImagePreviewGallery } from "@/components/image-preview";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata, createTextExcerpt, resolveLocale } from "@/lib/seo";

type AlbumDetailParams = {
  locale: string;
  id: string;
};

type AlbumDetailPageProps = {
  params: Promise<AlbumDetailParams>;
};

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

async function getAlbumItem(id: number) {
  const [album] = await db
    .select()
    .from(photoAlbums)
    .where(eq(photoAlbums.id, id))
    .limit(1);

  return album ?? null;
}

export async function generateMetadata({
  params,
}: AlbumDetailPageProps): Promise<Metadata> {
  const { locale: rawLocale, id: rawId } = await params;
  const locale = resolveLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "site.albumDetail" });
  const id = parseId(rawId);

  if (!id) {
    return buildPageMetadata({
      locale,
      pathname: `/albums/${rawId}`,
      title: t("notFound"),
      description: t("notFound"),
      noIndex: true,
    });
  }

  const album = await getAlbumItem(id);
  if (!album) {
    return buildPageMetadata({
      locale,
      pathname: `/albums/${id}`,
      title: t("notFound"),
      description: t("notFound"),
      noIndex: true,
    });
  }

  const description =
    createTextExcerpt(album.description ?? "") ||
    (locale === "zh-CN" ? `${album.name} 相册` : `${album.name} album`);

  return buildPageMetadata({
    locale,
    pathname: `/albums/${id}`,
    title: album.name,
    description,
    image: album.coverUrl || undefined,
  });
}

export default async function AlbumDetailPage({ params }: AlbumDetailPageProps) {
  const t = await getTranslations("site.albumDetail");
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    notFound();
  }

  const album = await getAlbumItem(id);
  if (!album) {
    notFound();
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

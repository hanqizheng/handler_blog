import { desc, eq, asc } from "drizzle-orm";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/db";
import { albumCategories, photoAlbums } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { QiniuImage } from "@/components/qiniu-image";
import { buildPageMetadata, resolveLocale } from "@/lib/seo";
import { formatDateYmd } from "@/utils/date";

import { AlbumCategoryFilter } from "./_components/AlbumCategoryFilter";

type AlbumsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({
  params,
}: AlbumsPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "site.albums" });

  return buildPageMetadata({
    locale,
    pathname: "/albums",
    title: t("title"),
    description: t("description"),
  });
}

export default async function AlbumsPage({ searchParams }: AlbumsPageProps) {
  const t = await getTranslations("site.albums");
  const resolvedSearchParams = await searchParams;
  const categorySlug =
    typeof resolvedSearchParams.category === "string"
      ? resolvedSearchParams.category
      : "";

  const [categories, allItems] = await Promise.all([
    db
      .select({
        id: albumCategories.id,
        name: albumCategories.name,
        slug: albumCategories.slug,
      })
      .from(albumCategories)
      .where(eq(albumCategories.isActive, 1))
      .orderBy(asc(albumCategories.sortOrder), desc(albumCategories.id)),
    db
      .select({
        id: photoAlbums.id,
        name: photoAlbums.name,
        slug: photoAlbums.slug,
        description: photoAlbums.description,
        coverUrl: photoAlbums.coverUrl,
        categoryId: photoAlbums.categoryId,
        categoryName: albumCategories.name,
        categorySlug: albumCategories.slug,
        createdAt: photoAlbums.createdAt,
      })
      .from(photoAlbums)
      .leftJoin(albumCategories, eq(photoAlbums.categoryId, albumCategories.id))
      .orderBy(desc(photoAlbums.createdAt), desc(photoAlbums.id)),
  ]);

  const items = categorySlug
    ? allItems.filter((item) => item.categorySlug === categorySlug)
    : allItems;

  return (
    <main className="w-full">
      <section className="bg-slate-50 py-16 md:py-24">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="space-y-3">
            <p className="text-xs tracking-[0.3em] text-slate-500 uppercase">
              {t("eyebrow")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              {t("title")}
            </h1>
            <p className="max-w-xl text-base text-slate-600">
              {t("description")}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-12 md:py-16">
        <div className="mx-auto w-full max-w-6xl px-6">
          <AlbumCategoryFilter
            categories={categories}
            allLabel={t("allCategories")}
          />
          {items.length === 0 ? (
            <p className="mt-6 text-sm text-slate-600">{t("empty")}</p>
          ) : (
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/albums/${item.id}`}
                    className="group block overflow-hidden bg-slate-50 transition hover:bg-slate-100"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden">
                      {item.coverUrl ? (
                        <QiniuImage
                          src={item.coverUrl}
                          alt={item.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
                          {t("noCover")}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 p-5">
                      <p className="text-lg font-semibold text-slate-900 transition-colors group-hover:text-slate-600">
                        {item.name}
                      </p>
                      {item.description ? (
                        <p className="line-clamp-2 text-sm text-slate-600">
                          {item.description}
                        </p>
                      ) : null}
                      <div className="flex items-center gap-2 pt-1">
                        {item.categoryName ? (
                          <span className="bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
                            {item.categoryName}
                          </span>
                        ) : null}
                        <span className="text-xs text-slate-500">
                          {formatDateYmd(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

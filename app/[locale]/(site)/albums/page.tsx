import { desc } from "drizzle-orm";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { db } from "@/db";
import { photoAlbums } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { QiniuImage } from "@/components/qiniu-image";
import { buildPageMetadata, resolveLocale } from "@/lib/seo";

type AlbumsPageProps = {
  params: Promise<{ locale: string }>;
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

export default async function AlbumsPage() {
  const t = await getTranslations("site.albums");
  const items = await db
    .select()
    .from(photoAlbums)
    .orderBy(desc(photoAlbums.createdAt), desc(photoAlbums.id));

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">{t("empty")}</p>
      ) : (
        <ul className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/albums/${item.id}`}
                className="block overflow-hidden rounded-lg border border-slate-200 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {item.coverUrl ? (
                  <QiniuImage
                    src={item.coverUrl}
                    alt={item.name}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-56 w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
                    {t("noCover")}
                  </div>
                )}
                <div className="space-y-1 p-5">
                  <p className="text-lg font-semibold">{item.name}</p>
                  {item.description ? (
                    <p className="text-sm text-slate-600">{item.description}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

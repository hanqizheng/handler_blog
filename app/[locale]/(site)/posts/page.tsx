import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { QiniuImage } from "@/components/qiniu-image";
import { db } from "@/db";
import { postCategories, posts } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata, resolveLocale } from "@/lib/seo";
import { formatDateYmd } from "@/utils/date";

type PostsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PostsPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "site.posts" });

  return buildPageMetadata({
    locale,
    pathname: "/posts",
    title: t("title"),
    description: t("description"),
  });
}

export default async function PostsPage() {
  const t = await getTranslations("site.posts");
  const items = await db
    .select({
      id: posts.id,
      title: posts.title,
      coverImageUrl: posts.coverImageUrl,
      createdAt: posts.createdAt,
      categoryName: postCategories.name,
    })
    .from(posts)
    .leftJoin(postCategories, eq(posts.categoryId, postCategories.id))
    .orderBy(desc(posts.id));

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
          {items.length === 0 ? (
            <p className="text-sm text-slate-600">{t("empty")}</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/posts/${item.id}?from=${encodeURIComponent("/posts")}`}
                  className="group flex flex-col gap-5 py-8 first:pt-0 last:pb-0 sm:flex-row sm:gap-8"
                >
                  <div className="aspect-video w-full shrink-0 overflow-hidden bg-slate-100 sm:w-72">
                    {item.coverImageUrl ? (
                      <QiniuImage
                        src={item.coverImageUrl}
                        alt={item.title}
                        variant="card"
                        sizes="(min-width: 640px) 18rem, 100vw"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                        {t("noCover")}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {item.categoryName ? (
                        <>
                          <span className="bg-slate-100 px-2 py-0.5 text-slate-600">
                            {item.categoryName}
                          </span>
                          <span className="text-slate-300">|</span>
                        </>
                      ) : null}
                      <span>{formatDateYmd(item.createdAt)}</span>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-slate-900 transition-colors group-hover:text-slate-600 md:text-xl">
                      {item.title}
                    </h2>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

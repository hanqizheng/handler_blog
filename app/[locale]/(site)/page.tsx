import { asc, desc, eq } from "drizzle-orm";

import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { banners, posts, products } from "@/db/schema";
import { QiniuImage } from "@/components/qiniu-image";

export default async function HomePage() {
  const latestPosts = await db
    .select()
    .from(posts)
    .orderBy(desc(posts.id))
    .limit(3);
  const bannerItems = await db
    .select()
    .from(banners)
    .where(eq(banners.isActive, 1))
    .orderBy(asc(banners.sortOrder), desc(banners.id));
  const productItems = await db
    .select()
    .from(products)
    .where(eq(products.isActive, 1))
    .orderBy(asc(products.sortOrder), desc(products.id));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">首页 Banner</h1>
        {bannerItems.length === 0 ? (
          <p>暂无 Banner</p>
        ) : (
          <div className="space-y-4">
            {bannerItems.map((banner) => (
              <div key={banner.id}>
                {banner.linkUrl ? (
                  <a href={banner.linkUrl}>
                    <QiniuImage
                      src={banner.imageUrl}
                      alt="banner"
                      className="h-48 w-full rounded object-cover"
                    />
                  </a>
                ) : (
                  <QiniuImage
                    src={banner.imageUrl}
                    alt="banner"
                    className="h-48 w-full rounded object-cover"
                  />
                )}
                {banner.mainTitle || banner.subTitle ? (
                  <div className="mt-2 space-y-1">
                    {banner.mainTitle ? (
                      <h3 className="text-lg font-semibold">
                        {banner.mainTitle}
                      </h3>
                    ) : null}
                    {banner.subTitle ? (
                      <p className="text-sm text-slate-600">
                        {banner.subTitle}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="mt-12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">最新博文</h2>
          <Link href="/posts" className="text-sm text-slate-600">
            查看更多
          </Link>
        </div>
        {latestPosts.length === 0 ? (
          <p>暂无文章</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {latestPosts.map((item) => (
              <Link
                key={item.id}
                href={`/posts/${item.id}`}
                className="rounded-lg border border-slate-200 p-4 transition hover:border-slate-300"
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="mt-12 space-y-4">
        <h2 className="text-2xl font-semibold">产品介绍</h2>
        {productItems.length === 0 ? (
          <p>暂无产品信息</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {productItems.map((product) => (
              <div
                key={product.id}
                className="rounded-lg border border-slate-200 p-4"
              >
                {product.logoUrl ? (
                  <QiniuImage
                    src={product.logoUrl}
                    alt={product.name}
                    className="h-12 w-12"
                  />
                ) : null}
                <div className="mt-3 space-y-1">
                  <h3 className="text-base font-semibold">{product.name}</h3>
                  {product.description ? (
                    <p className="text-sm text-slate-600">
                      {product.description}
                    </p>
                  ) : null}
                  {product.linkUrl ? (
                    <a
                      href={product.linkUrl}
                      className="text-sm text-slate-600"
                    >
                      了解更多
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

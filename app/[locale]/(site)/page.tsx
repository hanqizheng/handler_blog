import { asc, desc, eq } from "drizzle-orm";

import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { banners, posts } from "@/db/schema";
import { QiniuImage } from "@/components/qiniu-image";

export default async function HomePage() {
  const items = await db.select().from(posts).orderBy(desc(posts.id)).limit(20);
  const bannerItems = await db
    .select()
    .from(banners)
    .where(eq(banners.isActive, 1))
    .orderBy(asc(banners.sortOrder), desc(banners.id));

  return (
    <main>
      <section>
        <h1>首页 Banner</h1>
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
      <section>
        <h1>最新文章</h1>
        <p>
          <Link href="/admin">进入后台</Link>
        </p>
      </section>
      <section>
        {items.length === 0 ? (
          <p>暂无文章</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <Link href={`/posts/${item.id}`}>{item.title}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

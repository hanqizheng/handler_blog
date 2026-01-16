import { desc } from "drizzle-orm";

import { QiniuImage } from "@/components/qiniu-image";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { Link } from "@/i18n/navigation";

export default async function PostsPage() {
  const items = await db.select().from(posts).orderBy(desc(posts.id));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="space-y-3">
        <p className="text-xs tracking-[0.3em] text-slate-500 uppercase">
          Posts
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          文章列表
        </h1>
        <p className="text-sm text-slate-500">
          按时间排序，记录每一次灵感与沉淀。
        </p>
      </div>
      {items.length === 0 ? (
        <p className="mt-8 text-sm text-slate-600">暂无文章</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/posts/${item.id}`}
                className="group flex w-full items-center gap-4"
              >
                <div className="h-20 w-32 shrink-0 overflow-hidden bg-slate-200">
                  {item.coverImageUrl ? (
                    <QiniuImage
                      src={item.coverImageUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-slate-500">
                      暂无封面
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-lg font-bold text-slate-900 transition-colors group-hover:text-slate-600">
                    {item.title}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

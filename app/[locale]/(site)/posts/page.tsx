import { desc } from "drizzle-orm";

import { db } from "@/db";
import { posts } from "@/db/schema";
import { Link } from "@/i18n/navigation";

export default async function PostsPage() {
  const items = await db.select().from(posts).orderBy(desc(posts.id));

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">文章列表</h1>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">暂无文章</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/posts/${item.id}`}>{item.title}</Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

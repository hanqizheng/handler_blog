import { desc } from "drizzle-orm";

import { db } from "@/db";
import { posts } from "@/db/schema";
import { Link } from "@/i18n/navigation";

export default async function PostsPage() {
  const items = await db.select().from(posts).orderBy(desc(posts.id));

  return (
    <main>
      <h1>文章列表</h1>
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
    </main>
  );
}

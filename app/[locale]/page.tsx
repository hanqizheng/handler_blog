import { desc } from "drizzle-orm";

import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { posts } from "@/db/schema";

export default async function HomePage() {
  const items = await db.select().from(posts).orderBy(desc(posts.id)).limit(20);

  return (
    <main>
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

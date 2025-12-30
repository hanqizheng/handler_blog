import { eq } from "drizzle-orm";

import { db } from "@/db";
import { posts } from "@/db/schema";
import { Link } from "@/i18n/navigation";

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return (
      <main>
        <p>文章不存在</p>
        <Link href="/">返回首页</Link>
      </main>
    );
  }

  const [item] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

  if (!item) {
    return (
      <main>
        <p>文章不存在</p>
        <Link href="/">返回首页</Link>
      </main>
    );
  }

  return (
    <main>
      <h1>{item.title}</h1>
      <pre>{item.content}</pre>
      <p>
        <Link href="/">返回首页</Link>
      </p>
    </main>
  );
}

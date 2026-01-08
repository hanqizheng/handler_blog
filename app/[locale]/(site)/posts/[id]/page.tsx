import { eq } from "drizzle-orm";

import { db } from "@/db";
import { posts } from "@/db/schema";
import { CommentSection } from "@/components/comment-section";
import { Link } from "@/i18n/navigation";
import { MarkdownRenderer } from "@/components/markdown-renderer";

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
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">
        {item.title}
      </h1>
      <MarkdownRenderer content={item.content} />
      <CommentSection postId={item.id} />
      <p>
        <Link href="/">返回首页</Link>
      </p>
    </main>
  );
}

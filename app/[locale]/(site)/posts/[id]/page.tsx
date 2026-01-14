import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { commentCaptchaSettings, posts } from "@/db/schema";
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
  const [captchaSetting] = await db
    .select({ isEnabled: commentCaptchaSettings.isEnabled })
    .from(commentCaptchaSettings)
    .orderBy(desc(commentCaptchaSettings.id))
    .limit(1);
  const captchaEnabled = (captchaSetting?.isEnabled ?? 0) === 1;

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
      <div className="space-y-3">
        <Link href="/posts" className="text-xs text-slate-500">
          返回文章列表
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {item.title}
        </h1>
        <p className="text-sm text-slate-500">
          {new Date(item.createdAt).toLocaleDateString()}
        </p>
      </div>
      <article className="mt-10">
        <MarkdownRenderer content={item.content} className="text-[15px]" />
      </article>
      <CommentSection postId={item.id} captchaEnabled={captchaEnabled} />
      <p className="mt-10 text-sm text-slate-600">
        <Link href="/">返回首页</Link>
      </p>
    </main>
  );
}

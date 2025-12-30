import { eq } from "drizzle-orm";

import { db } from "@/db";
import { posts } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

import { PostEditorForm } from "../../_components/PostEditorForm";

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export default async function AdminEditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <p>文章不存在</p>
        <Button asChild variant="ghost">
          <Link href="/admin/posts">返回文章列表</Link>
        </Button>
      </main>
    );
  }

  const [item] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

  if (!item) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
        <p>文章不存在</p>
        <Button asChild variant="ghost">
          <Link href="/admin/posts">返回文章列表</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-10">
      <PostEditorForm
        mode="edit"
        postId={item.id}
        initialTitle={item.title}
        initialContent={item.content}
      />
      <Button asChild variant="ghost">
        <Link href="/admin/posts">返回文章列表</Link>
      </Button>
    </main>
  );
}

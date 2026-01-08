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
      <section className="flex w-full flex-1 flex-col gap-6">
        <p>文章不存在</p>
        <Button asChild variant="ghost">
          <Link href="/admin/posts">返回文章列表</Link>
        </Button>
      </section>
    );
  }

  const [item] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);

  if (!item) {
    return (
      <section className="flex w-full flex-1 flex-col gap-6">
        <p>文章不存在</p>
        <Button asChild variant="ghost">
          <Link href="/admin/posts">返回文章列表</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <PostEditorForm
        mode="edit"
        postId={item.id}
        initialTitle={item.title}
        initialContent={item.content}
        initialAssetFolder={item.assetFolder}
      />
      <Button asChild variant="ghost">
        <Link href="/admin/posts">返回文章列表</Link>
      </Button>
    </section>
  );
}

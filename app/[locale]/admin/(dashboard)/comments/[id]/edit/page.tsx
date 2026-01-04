import { eq } from "drizzle-orm";

import { db } from "@/db";
import { comments } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

import { CommentEditorForm } from "../../_components/CommentEditorForm";

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export default async function AdminEditCommentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return (
      <section className="mx-auto max-w-4xl space-y-6">
        <p>评论不存在</p>
        <Button asChild variant="ghost">
          <Link href="/admin/comments">返回评论列表</Link>
        </Button>
      </section>
    );
  }

  const [item] = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      content: comments.content,
      status: comments.status,
    })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);

  if (!item) {
    return (
      <section className="mx-auto max-w-4xl space-y-6">
        <p>评论不存在</p>
        <Button asChild variant="ghost">
          <Link href="/admin/comments">返回评论列表</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <CommentEditorForm
        mode="edit"
        commentId={item.id}
        postId={item.postId}
        initialContent={item.content}
        initialStatus={item.status}
      />
      <Button asChild variant="ghost">
        <Link href="/admin/comments">返回评论列表</Link>
      </Button>
    </section>
  );
}

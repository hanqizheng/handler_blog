import { eq } from "drizzle-orm";

import { db } from "@/db";
import { comments } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { CommentEditorForm } from "../../_components/CommentEditorForm";

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export default async function AdminReplyCommentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return (
      <section className="flex w-full flex-1 flex-col gap-6">
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
      parentId: comments.parentId,
      content: comments.content,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);

  if (!item) {
    return (
      <section className="flex w-full flex-1 flex-col gap-6">
        <p>评论不存在</p>
        <Button asChild variant="ghost">
          <Link href="/admin/comments">返回评论列表</Link>
        </Button>
      </section>
    );
  }

  if (item.parentId) {
    return (
      <section className="flex w-full flex-1 flex-col gap-6">
        <p>暂不支持回复二级评论</p>
        <Button asChild variant="ghost">
          <Link href="/admin/comments">返回评论列表</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>回复对象</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p>{item.content}</p>
          <small>{new Date(item.createdAt).toLocaleString()}</small>
        </CardContent>
      </Card>
      <CommentEditorForm
        mode="reply"
        postId={item.postId}
        parentId={item.id}
      />
      <Button asChild variant="ghost">
        <Link href="/admin/comments">返回评论列表</Link>
      </Button>
    </section>
  );
}

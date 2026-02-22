import { desc, eq } from "drizzle-orm";

import {
  parseDrawerState,
  type AdminSearchParams,
} from "@/app/[locale]/admin/_components/admin-drawer-query";
import { db } from "@/db";
import { comments, posts } from "@/db/schema";

import { CommentManager } from "./_components/CommentManager";

const COMMENT_DRAWER_MODES = ["edit", "reply"] as const;

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { mode: drawerMode, id } = parseDrawerState(
    resolvedSearchParams,
    COMMENT_DRAWER_MODES,
  );

  const items = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      content: comments.content,
      status: comments.status,
      createdAt: comments.createdAt,
      postTitle: posts.title,
    })
    .from(comments)
    .leftJoin(posts, eq(comments.postId, posts.id))
    .orderBy(desc(comments.createdAt), desc(comments.id));

  const editableComment =
    drawerMode === "edit" && id
      ? ((
          await db
            .select({
              id: comments.id,
              postId: comments.postId,
              content: comments.content,
              status: comments.status,
            })
            .from(comments)
            .where(eq(comments.id, id))
            .limit(1)
        )[0] ?? null)
      : null;

  const replyTargetComment =
    drawerMode === "reply" && id
      ? ((
          await db
            .select({
              id: comments.id,
              postId: comments.postId,
              parentId: comments.parentId,
              content: comments.content,
              createdAt: comments.createdAt,
            })
            .from(comments)
            .where(eq(comments.id, id))
            .limit(1)
        )[0] ?? null)
      : null;

  return (
    <CommentManager
      items={items}
      drawerMode={drawerMode}
      editableComment={editableComment}
      replyTargetComment={replyTargetComment}
    />
  );
}

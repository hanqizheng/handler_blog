import { desc, eq, isNotNull } from "drizzle-orm";

import {
  parseDrawerState,
  type AdminSearchParams,
} from "@/app/[locale]/admin/_components/admin-drawer-query";
import { db } from "@/db";
import { comments, photoAlbums, posts } from "@/db/schema";

import { CommentTabManager } from "./_components/CommentTabManager";

const COMMENT_DRAWER_MODES = ["edit", "reply"] as const;

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const tab = resolvedSearchParams.tab === "album" ? "album" : "post";
  const { mode: drawerMode, id } = parseDrawerState(
    resolvedSearchParams,
    COMMENT_DRAWER_MODES,
  );

  const commentFields = {
    id: comments.id,
    postId: comments.postId,
    albumId: comments.albumId,
    parentId: comments.parentId,
    content: comments.content,
    status: comments.status,
    createdAt: comments.createdAt,
    postTitle: posts.title,
    albumName: photoAlbums.name,
  };

  const orderBy = [desc(comments.createdAt), desc(comments.id)] as const;

  const [postItems, albumItems] = await Promise.all([
    db
      .select(commentFields)
      .from(comments)
      .leftJoin(posts, eq(comments.postId, posts.id))
      .leftJoin(photoAlbums, eq(comments.albumId, photoAlbums.id))
      .where(isNotNull(comments.postId))
      .orderBy(...orderBy),
    db
      .select(commentFields)
      .from(comments)
      .leftJoin(posts, eq(comments.postId, posts.id))
      .leftJoin(photoAlbums, eq(comments.albumId, photoAlbums.id))
      .where(isNotNull(comments.albumId))
      .orderBy(...orderBy),
  ]);

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
              albumId: comments.albumId,
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
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">评论管理</h1>
      </div>
      <CommentTabManager
        activeTab={tab}
        postItems={postItems}
        albumItems={albumItems}
        drawerMode={drawerMode}
        editableComment={editableComment}
        replyTargetComment={replyTargetComment}
      />
    </section>
  );
}

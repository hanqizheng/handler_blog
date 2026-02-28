import { asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

import { db } from "@/db";
import { postCategories, posts } from "@/db/schema";

import { PostEditorPageShell } from "../../_components/PostEditorPageShell";

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
    notFound();
  }

  const [post, categories] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        content: posts.content,
        assetFolder: posts.assetFolder,
        coverImageUrl: posts.coverImageUrl,
        categoryId: posts.categoryId,
      })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: postCategories.id,
        name: postCategories.name,
        isActive: postCategories.isActive,
        sortOrder: postCategories.sortOrder,
      })
      .from(postCategories)
      .orderBy(asc(postCategories.sortOrder), desc(postCategories.id)),
  ]);

  if (!post) {
    notFound();
  }

  return (
    <PostEditorPageShell
      mode="edit"
      title="编辑文章"
      description="更新文章内容与封面"
      postId={post.id}
      initialTitle={post.title}
      initialContent={post.content}
      initialAssetFolder={post.assetFolder}
      initialCoverImageUrl={post.coverImageUrl}
      initialCategoryId={post.categoryId}
      categories={categories}
    />
  );
}

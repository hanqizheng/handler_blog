import { asc, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { postCategories, posts } from "@/db/schema";

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
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <Link
          href="/admin/posts"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回文章列表
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">编辑文章</h1>
        <p className="text-sm text-slate-500">更新文章内容与封面</p>
      </div>
      <PostEditorForm
        mode="edit"
        postId={post.id}
        initialTitle={post.title}
        initialContent={post.content}
        initialAssetFolder={post.assetFolder}
        initialCoverImageUrl={post.coverImageUrl}
        initialCategoryId={post.categoryId}
        categories={categories}
      />
    </section>
  );
}

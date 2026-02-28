import { asc, desc } from "drizzle-orm";

import { db } from "@/db";
import { postCategories } from "@/db/schema";

import { PostEditorPageShell } from "../_components/PostEditorPageShell";

export default async function AdminNewPostPage() {
  const categories = await db
    .select({
      id: postCategories.id,
      name: postCategories.name,
      isActive: postCategories.isActive,
      sortOrder: postCategories.sortOrder,
    })
    .from(postCategories)
    .orderBy(asc(postCategories.sortOrder), desc(postCategories.id));

  return (
    <PostEditorPageShell
      mode="create"
      title="新建文章"
      description="创建新的博客文章"
      categories={categories}
    />
  );
}

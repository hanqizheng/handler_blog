import { asc, desc, eq } from "drizzle-orm";

import {
  parseDrawerState,
  type AdminSearchParams,
} from "@/app/[locale]/admin/_components/admin-drawer-query";
import { db } from "@/db";
import { postCategories, posts } from "@/db/schema";

import { PostManager } from "./_components/PostManager";

const POST_DRAWER_MODES = ["create", "edit"] as const;

export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { mode: drawerMode, id } = parseDrawerState(
    resolvedSearchParams,
    POST_DRAWER_MODES,
  );

  const items = await db
    .select({
      id: posts.id,
      title: posts.title,
      categoryName: postCategories.name,
    })
    .from(posts)
    .leftJoin(postCategories, eq(posts.categoryId, postCategories.id))
    .orderBy(desc(posts.id));

  const categories = await db
    .select({
      id: postCategories.id,
      name: postCategories.name,
      isActive: postCategories.isActive,
      sortOrder: postCategories.sortOrder,
    })
    .from(postCategories)
    .orderBy(asc(postCategories.sortOrder), desc(postCategories.id));

  const editingPost =
    drawerMode === "edit" && id
      ? ((
          await db
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
        )[0] ?? null)
      : null;

  return (
    <PostManager
      items={items}
      categories={categories}
      drawerMode={drawerMode}
      editingPost={editingPost}
    />
  );
}

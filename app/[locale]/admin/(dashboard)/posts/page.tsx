import { desc, eq } from "drizzle-orm";

import {
  parseDrawerState,
  type AdminSearchParams,
} from "@/app/[locale]/admin/_components/admin-drawer-query";
import { db } from "@/db";
import { posts } from "@/db/schema";

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
    .select({ id: posts.id, title: posts.title })
    .from(posts)
    .orderBy(desc(posts.id));

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
            })
            .from(posts)
            .where(eq(posts.id, id))
            .limit(1)
        )[0] ?? null)
      : null;

  return (
    <PostManager
      items={items}
      drawerMode={drawerMode}
      editingPost={editingPost}
    />
  );
}

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { postCategories, posts } from "@/db/schema";

import { PostManager } from "./_components/PostManager";

export default async function AdminPostsPage() {
  const items = await db
    .select({
      id: posts.id,
      title: posts.title,
      categoryName: postCategories.name,
    })
    .from(posts)
    .leftJoin(postCategories, eq(posts.categoryId, postCategories.id))
    .orderBy(desc(posts.id));

  return <PostManager items={items} />;
}

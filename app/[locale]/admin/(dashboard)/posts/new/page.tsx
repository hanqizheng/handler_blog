import { asc, desc } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { postCategories } from "@/db/schema";

import { PostEditorForm } from "../_components/PostEditorForm";

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
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <Link
          href="/admin/posts"
          className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          返回文章列表
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">新建文章</h1>
        <p className="text-sm text-slate-500">创建新的博客文章</p>
      </div>
      <PostEditorForm mode="create" categories={categories} />
    </section>
  );
}

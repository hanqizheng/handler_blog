import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { SiteBackLink } from "@/components/site-back-link";
import { db } from "@/db";
import { commentCaptchaSettings, postCategories, posts } from "@/db/schema";
import { CommentSection } from "@/components/comment-section";
import { Link } from "@/i18n/navigation";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { formatDateYmd } from "@/utils/date";

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = await getTranslations("site.postDetail");
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <p className="text-base font-medium text-slate-900">{t("notFound")}</p>
        <SiteBackLink
          fallbackHref="/posts"
          label={t("backToPosts")}
          className="mt-5"
        />
      </main>
    );
  }

  const [item] = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      createdAt: posts.createdAt,
      categoryName: postCategories.name,
    })
    .from(posts)
    .leftJoin(postCategories, eq(posts.categoryId, postCategories.id))
    .where(eq(posts.id, id))
    .limit(1);
  const [captchaSetting] = await db
    .select({ isEnabled: commentCaptchaSettings.isEnabled })
    .from(commentCaptchaSettings)
    .orderBy(desc(commentCaptchaSettings.id))
    .limit(1);
  const captchaEnabled = (captchaSetting?.isEnabled ?? 0) === 1;

  if (!item) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <p className="text-base font-medium text-slate-900">{t("notFound")}</p>
        <SiteBackLink
          fallbackHref="/posts"
          label={t("backToPosts")}
          className="mt-5"
        />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="space-y-3">
        <SiteBackLink
          fallbackHref="/posts"
          label={t("backToPrevious")}
          className="shadow-sm"
        />
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {item.title}
        </h1>
        {item.categoryName ? (
          <span className="inline-flex bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
            {item.categoryName}
          </span>
        ) : null}
        <p className="text-sm text-slate-500">
          {formatDateYmd(item.createdAt)}
        </p>
      </div>
      <article className="mt-10">
        <MarkdownRenderer content={item.content} className="text-[15px]" />
      </article>
      <CommentSection postId={item.id} captchaEnabled={captchaEnabled} />
      <p className="mt-10 text-sm text-slate-600">
        <Link href="/" className="hover:text-slate-800">
          {t("backHome")}
        </Link>
      </p>
    </main>
  );
}

import { desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { CommentSection } from "@/components/comment-section";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { SiteBackLink } from "@/components/site-back-link";
import { db } from "@/db";
import { commentCaptchaSettings, postCategories, posts } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { buildPageMetadata, createTextExcerpt, resolveLocale } from "@/lib/seo";
import { formatDateYmd } from "@/utils/date";

type PostDetailParams = {
  locale: string;
  id: string;
};

type PostDetailPageProps = {
  params: Promise<PostDetailParams>;
};

function parseId(rawId: string) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }
  return id;
}

async function getPostItem(id: number) {
  const [item] = await db
    .select({
      id: posts.id,
      title: posts.title,
      content: posts.content,
      coverImageUrl: posts.coverImageUrl,
      createdAt: posts.createdAt,
      categoryName: postCategories.name,
    })
    .from(posts)
    .leftJoin(postCategories, eq(posts.categoryId, postCategories.id))
    .where(eq(posts.id, id))
    .limit(1);

  return item ?? null;
}

export async function generateMetadata({
  params,
}: PostDetailPageProps): Promise<Metadata> {
  const { locale: rawLocale, id: rawId } = await params;
  const locale = resolveLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "site.postDetail" });
  const id = parseId(rawId);

  if (!id) {
    return buildPageMetadata({
      locale,
      pathname: `/posts/${rawId}`,
      title: t("notFound"),
      description: t("notFound"),
      noIndex: true,
    });
  }

  const item = await getPostItem(id);
  if (!item) {
    return buildPageMetadata({
      locale,
      pathname: `/posts/${id}`,
      title: t("notFound"),
      description: t("notFound"),
      noIndex: true,
    });
  }

  return buildPageMetadata({
    locale,
    pathname: `/posts/${id}`,
    title: item.title,
    description: createTextExcerpt(item.content) || item.title,
    image: item.coverImageUrl || undefined,
    type: "article",
  });
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
  const t = await getTranslations("site.postDetail");
  const { id: rawId } = await params;
  const id = parseId(rawId);

  if (!id) {
    notFound();
  }

  const item = await getPostItem(id);
  if (!item) {
    notFound();
  }

  const [captchaSetting] = await db
    .select({ isEnabled: commentCaptchaSettings.isEnabled })
    .from(commentCaptchaSettings)
    .orderBy(desc(commentCaptchaSettings.id))
    .limit(1);
  const captchaEnabled = (captchaSetting?.isEnabled ?? 0) === 1;

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

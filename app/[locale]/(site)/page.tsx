import { asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { banners, posts, products } from "@/db/schema";
import { QiniuImage } from "@/components/qiniu-image";
import {
  buildPageMetadata,
  getSiteName,
  resolveLocale,
  SITE_NAME,
} from "@/lib/seo";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "site.home" });

  return buildPageMetadata({
    locale,
    pathname: "/",
    title: SITE_NAME,
    description: t("heroDescription"),
    absoluteTitle: true,
  });
}

export default async function HomePage() {
  const t = await getTranslations("site.home");
  const siteName = getSiteName();
  const latestPosts = await db
    .select()
    .from(posts)
    .orderBy(desc(posts.id))
    .limit(3);
  const bannerItems = await db
    .select()
    .from(banners)
    .where(eq(banners.isActive, 1))
    .orderBy(asc(banners.sortOrder), desc(banners.id));
  const productItems = await db
    .select()
    .from(products)
    .where(eq(products.isActive, 1))
    .orderBy(asc(products.sortOrder), desc(products.id));
  const hasMultipleBanners = bannerItems.length > 1;
  const bannerStepSeconds = 7;
  const bannerDuration = Math.max(1, bannerItems.length) * bannerStepSeconds;

  return (
    <main className="w-full">
      <section className="relative h-[calc(100dvh-4rem)] min-h-[calc(100dvh-4rem)] w-full overflow-hidden bg-[#0b0b0f]">
        {bannerItems.length === 0 ? (
          <div className="absolute inset-0 bg-[linear-gradient(120deg,#0b0b0f,#111827)]">
            <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/55 to-black/80" />
            <div className="relative z-10 flex h-full items-end px-6 pb-16 md:pb-24">
              <div
                className="mx-auto w-full max-w-6xl space-y-4 text-left text-white"
                style={{
                  fontFamily:
                    "SF Pro Display, SF Pro Text, -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif",
                }}
              >
                <p className="text-xs tracking-[0.35em] text-white/70 uppercase">
                  {siteName}
                </p>
                <h1 className="text-4xl leading-tight font-semibold md:text-6xl">
                  {t("heroTitle")}
                </h1>
                <p className="max-w-2xl text-lg font-medium text-white/85 md:text-2xl">
                  {t("heroDescription")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0">
            {bannerItems.map((banner, index) => {
              const slideStyle = hasMultipleBanners
                ? {
                    animationDelay: `${index * bannerStepSeconds}s`,
                    animationDuration: `${bannerDuration}s`,
                  }
                : undefined;
              const textStyle = hasMultipleBanners
                ? {
                    animationDelay: `${index * bannerStepSeconds}s`,
                    animationDuration: `${bannerDuration}s`,
                  }
                : undefined;

              const slideTitle = banner.mainTitle ?? siteName;
              const slideSubtitle =
                banner.subTitle ?? t("bannerFallbackSubtitle");

              return banner.linkUrl ? (
                <a
                  key={banner.id}
                  href={banner.linkUrl}
                  className={`absolute inset-0 block ${
                    hasMultipleBanners
                      ? "banner-slide opacity-0"
                      : "opacity-100"
                  }`}
                  style={slideStyle}
                >
                  <QiniuImage
                    src={banner.imageUrl}
                    alt={slideTitle}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/55 to-black/80" />
                  <div
                    className={`relative z-10 flex h-full items-end px-6 pb-16 md:pb-24 ${
                      hasMultipleBanners ? "banner-text" : ""
                    }`}
                    style={textStyle}
                  >
                    <div
                      className="mx-auto w-full max-w-6xl space-y-4 text-left text-white"
                      style={{
                        fontFamily:
                          "SF Pro Display, SF Pro Text, -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif",
                      }}
                    >
                      <p className="text-xs tracking-[0.35em] text-white/70 uppercase">
                        {t("bannerTag")}
                      </p>
                      <h1 className="text-4xl leading-tight font-semibold md:text-6xl">
                        {slideTitle}
                      </h1>
                      <p className="max-w-2xl text-lg font-medium text-white/85 md:text-2xl">
                        {slideSubtitle}
                      </p>
                    </div>
                  </div>
                </a>
              ) : (
                <div
                  key={banner.id}
                  className={`absolute inset-0 ${
                    hasMultipleBanners
                      ? "banner-slide opacity-0"
                      : "opacity-100"
                  }`}
                  style={slideStyle}
                >
                  <QiniuImage
                    src={banner.imageUrl}
                    alt={slideTitle}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/55 to-black/80" />
                  <div
                    className={`relative z-10 flex h-full items-end px-6 pb-16 md:pb-24 ${
                      hasMultipleBanners ? "banner-text" : ""
                    }`}
                    style={textStyle}
                  >
                    <div
                      className="mx-auto w-full max-w-6xl space-y-4 text-left text-white"
                      style={{
                        fontFamily:
                          "SF Pro Display, SF Pro Text, -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif",
                      }}
                    >
                      <p className="text-xs tracking-[0.35em] text-white/70 uppercase">
                        {t("bannerTag")}
                      </p>
                      <h1 className="text-4xl leading-tight font-semibold md:text-6xl">
                        {slideTitle}
                      </h1>
                      <p className="max-w-2xl text-lg font-medium text-white/85 md:text-2xl">
                        {slideSubtitle}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-10 flex items-center justify-center gap-2">
          {bannerItems.map((banner, index) => (
            <span
              key={banner.id}
              className={`h-1 w-6 rounded-full bg-white/50 ${
                hasMultipleBanners ? "banner-indicator" : "opacity-80"
              }`}
              style={
                hasMultipleBanners
                  ? {
                      animationDelay: `${index * bannerStepSeconds}s`,
                      animationDuration: `${bannerDuration}s`,
                    }
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      <section className="relative min-h-[80vh] w-full overflow-hidden bg-white py-28 md:py-36">
        <div className="float-slow absolute top-6 -left-20 h-64 w-64 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="float-fast absolute top-20 right-0 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="relative mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs tracking-[0.3em] text-slate-500 uppercase">
                {t("latestTag")}
              </p>
              <h2 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                {t("latestTitle")}
              </h2>
              <p className="max-w-xl text-base text-slate-600 md:text-lg">
                {t("latestDescription")}
              </p>
            </div>
            <Link
              href="/posts"
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              {t("viewMore")}
            </Link>
          </div>
          {latestPosts.length === 0 ? (
            <p className="mt-10 text-slate-500">{t("emptyPosts")}</p>
          ) : (
            <div className="mt-12 grid gap-10 md:grid-cols-2">
              {latestPosts.map((item, index) => (
                <Link
                  key={item.id}
                  href={`/posts/${item.id}?from=${encodeURIComponent("/")}`}
                  className="group rise-in block bg-white"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-200">
                    {item.coverImageUrl ? (
                      <QiniuImage
                        src={item.coverImageUrl}
                        alt={item.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
                        {t("noCover")}
                      </div>
                    )}
                    <div className="post-glow pointer-events-none absolute bottom-0 left-0 h-28 w-28 bg-[radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.32),transparent_65%)] opacity-0 transition duration-500 group-hover:opacity-100" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-slate-900 md:text-xl">
                    {item.title}
                  </h3>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="relative w-full overflow-hidden bg-white py-20">
        <div className="float-slow absolute top-10 -right-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="float-fast absolute bottom-10 left-8 h-56 w-56 rounded-full bg-rose-200/40 blur-3xl" />
        <div className="relative mx-auto w-full max-w-6xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs tracking-[0.3em] text-slate-500 uppercase">
                {t("productsTag")}
              </p>
              <h2 className="text-3xl font-semibold text-slate-900 md:text-4xl">
                {t("productsTitle")}
              </h2>
              <p className="max-w-xl text-base text-slate-600 md:text-lg">
                {t("productsDescription")}
              </p>
            </div>
          </div>
          {productItems.length === 0 ? (
            <p className="mt-10 text-slate-500">{t("emptyProducts")}</p>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {productItems.map((product) => (
                <div
                  key={product.id}
                  className="group relative flex min-h-80 flex-col overflow-hidden bg-white p-8 transition duration-300 hover:-translate-y-1"
                >
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(59,130,246,0.08),transparent_60%)] opacity-0 transition duration-300 group-hover:opacity-100" />
                  <div className="relative z-10 flex items-center gap-3">
                    {product.logoUrl ? (
                      <QiniuImage
                        src={product.logoUrl}
                        alt={product.name}
                        className="h-16 w-16 object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 items-center justify-center bg-slate-100 text-base font-semibold text-slate-400">
                        {product.name.slice(0, 1)}
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">
                        {product.name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {t("productFeatured")}
                      </p>
                    </div>
                  </div>
                  <div className="relative z-10 mt-4 flex flex-1 flex-col">
                    {product.description ? (
                      <p className="text-sm text-slate-600">
                        {product.description}
                      </p>
                    ) : (
                      <p className="text-sm text-slate-400">
                        {t("productNoDescription")}
                      </p>
                    )}
                    {product.linkUrl ? (
                      <a
                        href={product.linkUrl}
                        className="mt-auto inline-flex items-center pt-6 text-sm font-medium text-slate-700 transition hover:text-slate-900"
                      >
                        {t("productLearnMore")}
                      </a>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <style>{`
        .banner-slide {
          animation-name: bannerFade;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .banner-text {
          animation-name: bannerText;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .banner-indicator {
          animation-name: bannerIndicator;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          opacity: 0.35;
        }

        .float-slow {
          animation: floatSlow 12s ease-in-out infinite;
        }

        .float-fast {
          animation: floatFast 10s ease-in-out infinite;
        }

        .rise-in {
          animation: rise 700ms ease-out both;
        }

        .post-glow {
          animation: postGlow 6s ease-in-out infinite;
        }

        @keyframes bannerFade {
          0% {
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          32% {
            opacity: 1;
          }
          48% {
            opacity: 0;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes bannerText {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          12% {
            opacity: 1;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
            transform: translateY(0);
          }
          40% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 0;
            transform: translateY(12px);
          }
        }

        @keyframes bannerIndicator {
          0% {
            opacity: 0.35;
            width: 24px;
          }
          10% {
            opacity: 0.95;
            width: 42px;
          }
          25% {
            opacity: 0.95;
            width: 42px;
          }
          35% {
            opacity: 0.35;
            width: 24px;
          }
          100% {
            opacity: 0.35;
            width: 24px;
          }
        }

        @keyframes floatSlow {
          0% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(-20px, 18px, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes floatFast {
          0% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(18px, -16px, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes rise {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes postGlow {
          0% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(14px, -10px, 0) scale(1.08);
          }
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .banner-slide,
          .banner-text,
          .banner-indicator,
          .float-slow,
          .float-fast,
          .rise-in,
          .post-glow {
            animation: none !important;
          }
        }
      `}</style>
    </main>
  );
}

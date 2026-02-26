import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { getLatestSiteProfile } from "@/lib/site-config";
import { buildPageMetadata, resolveLocale } from "@/lib/seo";

export const dynamic = "force-dynamic";

type AboutPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = resolveLocale(rawLocale);
  const t = await getTranslations({ locale, namespace: "site.about" });

  return buildPageMetadata({
    locale,
    pathname: "/about",
    title: t("title"),
    description: t("description"),
  });
}

export default async function AboutPage() {
  const t = await getTranslations("site.about");
  const footerT = await getTranslations("site.footer");
  const profile = await getLatestSiteProfile();
  const displayName = profile?.displayName?.trim() ?? "";
  const roleTitle = profile?.roleTitle?.trim() ?? "";
  const bio = profile?.bio?.trim() ?? "";
  const phone = profile?.phone?.trim() ?? "";
  const email = profile?.email?.trim() ?? "";
  const bioParagraphs = bio
    .split(/\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const hasProfile = Boolean(displayName || roleTitle || bioParagraphs.length);

  return (
    <main
      className="relative overflow-hidden"
      style={{
        fontFamily:
          '"Source Han Sans SC","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif',
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-15%] h-64 w-64 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute -bottom-35 left-[-10%] h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.06),transparent_55%)]" />
      </div>
      <div className="relative mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-center gap-3 text-[0.7rem] tracking-[0.3em] text-slate-500 uppercase">
          <span className="h-px w-10 bg-slate-300" />
          <span>{t("eyebrow")}</span>
        </div>
        <h1
          className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl"
          style={{
            fontFamily:
              '"Source Han Serif SC","Noto Serif SC","Songti SC",serif',
          }}
        >
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          {t("description")}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          {t("description2")}
        </p>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          {t("description3")}
        </p>

        <div className="mt-10 flex w-full flex-col gap-10">
          {hasProfile ? (
            <section className="animate-in fade-in-0 slide-in-from-bottom-6 duration-700">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <p className="text-xs tracking-[0.35em] text-slate-500 uppercase">
                      {t("profileTitle")}
                    </p>
                    {displayName ? (
                      <h2
                        className="mt-3 text-2xl font-semibold text-slate-900"
                        style={{
                          fontFamily:
                            '"Source Han Serif SC","Noto Serif SC","Songti SC",serif',
                        }}
                      >
                        {displayName}
                      </h2>
                    ) : null}
                    {roleTitle ? (
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {roleTitle}
                      </p>
                    ) : null}
                  </div>
                  <div className="hidden h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-sm font-semibold text-amber-700 sm:flex">
                    {t("profileBadge")}
                  </div>
                </div>
                {bioParagraphs.length ? (
                  <div className="mt-6 space-y-3 text-sm leading-relaxed text-slate-600">
                    {bioParagraphs.map((paragraph, index) => (
                      <p key={`${index}-${paragraph}`}>{paragraph}</p>
                    ))}
                  </div>
                ) : null}
                {phone || email ? (
                  <div className="mt-6 space-y-2 text-sm text-slate-600">
                    {phone ? (
                      <a
                        className="block hover:text-slate-900"
                        href={`tel:${phone}`}
                      >
                        {footerT("phoneLabel")}: {phone}
                      </a>
                    ) : null}
                    {email ? (
                      <a
                        className="block hover:text-slate-900"
                        href={`mailto:${email}`}
                      >
                        {footerT("emailLabel")}: {email}
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </section>
          ) : (
            <section className="animate-in fade-in-0 slide-in-from-bottom-6 duration-700">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
                <p className="text-sm text-slate-600">{t("emptyProfile")}</p>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";

import { LOCALES } from "@/constants/i18n";
import { siteNavItems } from "@/constants/site";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/i18n";

const localeLabelKeys: Record<Locale, "locale.zh-CN" | "locale.en"> = {
  "zh-CN": "locale.zh-CN",
  en: "locale.en",
};

export function SiteNavigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const t = useTranslations("site.nav");
  const tCommon = useTranslations("site.common");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLocaleChange = (targetLocale: Locale) => {
    if (targetLocale === locale) {
      return;
    }

    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    router.replace(href as Parameters<typeof router.replace>[0], {
      locale: targetLocale,
    });
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors ${
        isScrolled ? "bg-white shadow-sm" : "bg-white/50"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <img
            src="/brand/logo.svg"
            alt={tCommon("logoAlt")}
            className="h-10 w-auto"
          />
        </Link>
        <nav
          className={`flex items-center gap-4 text-xs font-semibold sm:gap-6 sm:text-sm ${
            isScrolled ? "text-slate-900" : "text-slate-900"
          }`}
        >
          {siteNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-slate-950"
            >
              {t(item.labelKey)}
            </Link>
          ))}
          <div className="ml-2 flex items-center border border-slate-300 bg-slate-50">
            {LOCALES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => handleLocaleChange(item)}
                aria-pressed={locale === item}
                className={cn(
                  "border-l border-slate-200 px-2 py-1 text-[10px] leading-none transition-colors first:border-l-0",
                  locale === item
                    ? "bg-slate-200 font-semibold text-slate-800"
                    : "font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                )}
              >
                {t(localeLabelKeys[item])}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}

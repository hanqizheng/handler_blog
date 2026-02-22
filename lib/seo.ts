import type { Metadata } from "next";

import { DEFAULT_LOCALE, LOCALES } from "@/constants/i18n";
import type { Locale } from "@/types/i18n";
import { isLocale } from "@/utils/isLocale";

const FALLBACK_SITE_URL = "http://localhost:3000";
const FALLBACK_SITE_NAME = "Site";
const FALLBACK_SITE_DESCRIPTION_ZH = "在这里填写你的网站简介。";
const FALLBACK_SITE_DESCRIPTION_EN = "Describe your website here.";

function readEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export function getSiteName() {
  return readEnv("NEXT_PUBLIC_SITE_NAME") ?? FALLBACK_SITE_NAME;
}

export function getSiteDefaultDescription(locale?: string | Locale) {
  if (locale === "zh-CN") {
    return (
      readEnv("NEXT_PUBLIC_SITE_DESCRIPTION_ZH") ?? FALLBACK_SITE_DESCRIPTION_ZH
    );
  }

  return (
    readEnv("NEXT_PUBLIC_SITE_DESCRIPTION_EN") ?? FALLBACK_SITE_DESCRIPTION_EN
  );
}

export const SITE_NAME = getSiteName();
export const SITE_DEFAULT_DESCRIPTION = getSiteDefaultDescription();

function trimTrailingSlash(input: string) {
  return input.replace(/\/+$/, "");
}

export function getSiteUrl() {
  const raw = readEnv("NEXT_PUBLIC_SITE_URL");
  if (!raw) {
    return FALLBACK_SITE_URL;
  }

  try {
    const parsed = new URL(raw);
    return trimTrailingSlash(parsed.toString());
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export function normalizePathname(pathname: string) {
  const value = pathname.trim();
  if (!value || value === "/") {
    return "/";
  }

  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

export function resolveLocale(value: string): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getLocalizedPath(locale: Locale, pathname: string) {
  const normalizedPathname = normalizePathname(pathname);

  if (locale === DEFAULT_LOCALE) {
    return normalizedPathname;
  }

  if (normalizedPathname === "/") {
    return `/${locale}`;
  }

  return `/${locale}${normalizedPathname}`;
}

export function getLanguageAlternates(pathname: string): Record<string, string> {
  const alternates = Object.fromEntries(
    LOCALES.map((locale) => [locale, getLocalizedPath(locale, pathname)]),
  ) as Record<string, string>;
  alternates["x-default"] = getLocalizedPath(DEFAULT_LOCALE, pathname);
  return alternates;
}

export function toAbsoluteUrl(pathname: string) {
  const normalizedPathname = normalizePathname(pathname);
  return new URL(normalizedPathname, `${getSiteUrl()}/`).toString();
}

type BuildPageMetadataInput = {
  locale: Locale;
  pathname: string;
  title: string;
  description: string;
  absoluteTitle?: boolean;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

export function buildPageMetadata({
  locale,
  pathname,
  title,
  description,
  absoluteTitle = false,
  image,
  type = "website",
  noIndex = false,
}: BuildPageMetadataInput): Metadata {
  const canonicalPath = getLocalizedPath(locale, pathname);
  const languageAlternates = getLanguageAlternates(pathname);
  const openGraphImages = image ? [image] : undefined;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: languageAlternates,
    },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type,
      siteName: SITE_NAME,
      title,
      description,
      url: canonicalPath,
      images: openGraphImages,
      locale,
      alternateLocale: LOCALES.filter((value) => value !== locale),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: openGraphImages,
    },
  };
}

export function createTextExcerpt(input: string, maxLength = 160) {
  const plainText = input
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, " $1 ")
    .replace(/[#>*_~`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) {
    return "";
  }

  if (plainText.length <= maxLength) {
    return plainText;
  }

  return `${plainText.slice(0, maxLength - 3).trimEnd()}...`;
}

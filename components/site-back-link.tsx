"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { LOCALES } from "@/constants/i18n";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface SiteBackLinkProps {
  fallbackHref: string;
  label: string;
  className?: string;
  fromParamKey?: string;
}

const DEFAULT_FROM_PARAM_KEY = "from";

function stripLocalePrefix(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}`) {
      return "/";
    }

    const localePrefix = `/${locale}/`;
    if (pathname.startsWith(localePrefix)) {
      return pathname.slice(localePrefix.length - 1);
    }
  }

  return pathname || "/";
}

function sanitizeInternalPath(rawPath: string | null): string | null {
  if (!rawPath) {
    return null;
  }

  if (!rawPath.startsWith("/") || rawPath.startsWith("//")) {
    return null;
  }

  const [pathname, query = ""] = rawPath.split("?");
  const normalizedPathname = stripLocalePrefix(pathname);
  return query ? `${normalizedPathname}?${query}` : normalizedPathname;
}

function getSameOriginReferrerPath(): string | null {
  if (typeof window === "undefined" || !document.referrer) {
    return null;
  }

  try {
    const referrer = new URL(document.referrer);
    if (referrer.origin !== window.location.origin) {
      return null;
    }

    const normalizedPathname = stripLocalePrefix(referrer.pathname);
    return `${normalizedPathname}${referrer.search}`;
  } catch {
    return null;
  }
}

export function SiteBackLink({
  fallbackHref,
  label,
  className,
  fromParamKey = DEFAULT_FROM_PARAM_KEY,
}: SiteBackLinkProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromParam = searchParams.get(fromParamKey);
  const fromTarget = useMemo(
    () => sanitizeInternalPath(fromParam),
    [fromParam],
  );
  const [target, setTarget] = useState(fallbackHref);

  useEffect(() => {
    if (fromTarget) {
      setTarget(fromTarget);
      return;
    }

    const referrerPath = getSameOriginReferrerPath();
    setTarget(referrerPath ?? fallbackHref);
  }, [fallbackHref, fromTarget]);

  const handleClick = () => {
    router.push(target as Parameters<typeof router.push>[0]);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800",
        className,
      )}
    >
      {label}
    </button>
  );
}

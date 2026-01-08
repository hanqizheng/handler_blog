import { LOCALES } from "@/constants/i18n";

export function normalizeAdminPathname(pathname: string) {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (LOCALES.includes(maybeLocale as (typeof LOCALES)[number])) {
    const remainder = segments.slice(2).join("/");
    return `/${remainder}`;
  }

  return pathname;
}

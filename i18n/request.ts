import { getRequestConfig } from "next-intl/server";

import { DEFAULT_LOCALE } from "@/constants/i18n";
import { isLocale } from "@/utils/isLocale";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const resolvedLocale = locale && isLocale(locale) ? locale : DEFAULT_LOCALE;

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});

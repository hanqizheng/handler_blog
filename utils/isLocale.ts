import { LOCALES } from "@/constants/i18n";

export function isLocale(value: string): value is (typeof LOCALES)[number] {
  return (LOCALES as readonly string[]).includes(value);
}

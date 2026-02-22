import { getTranslations } from "next-intl/server";
import { LinkIcon } from "lucide-react";

import { QiniuImage } from "@/components/qiniu-image";
import { getSiteName } from "@/lib/seo";
import { getFooterFriendLinks, getSiteContactConfig } from "@/lib/site-config";

export async function SiteFooter() {
  const t = await getTranslations("site.footer");
  const siteName = getSiteName();
  const currentYear = new Date().getFullYear();
  const [contact, footerLinks] = await Promise.all([
    getSiteContactConfig(),
    getFooterFriendLinks(),
  ]);

  return (
    <footer className="bg-white py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr_1fr]">
          <div className="space-y-4">
            <img alt={siteName} className="h-10 w-auto" src="/brand/logo.svg" />
            <p className="max-w-xs text-sm leading-relaxed text-slate-600">
              {t("tagline")}
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-slate-900">{t("contactTitle")}</p>
            <div className="flex flex-col gap-2 text-sm text-slate-700">
              <a
                className="transition hover:text-slate-900"
                href={`tel:${contact.phone}`}
              >
                {t("phoneLabel")}: {contact.phone}
              </a>
              <a
                className="transition hover:text-slate-900"
                href={`mailto:${contact.email}`}
              >
                {t("emailLabel")}: {contact.email}
              </a>
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-slate-900">{t("friendLinks")}</p>
            {footerLinks.length === 0 ? (
              <p className="text-sm text-slate-500">{t("emptyFriendLinks")}</p>
            ) : (
              <div className="grid gap-2">
                {footerLinks.map((link) => (
                  <a
                    key={link.id}
                    className="inline-flex w-fit items-center gap-2 py-1 text-sm text-slate-700 transition hover:text-slate-900"
                    href={link.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.iconUrl ? (
                      <QiniuImage
                        src={link.iconUrl}
                        alt={link.name}
                        className="h-4 w-4 object-cover"
                      />
                    ) : (
                      <LinkIcon className="h-4 w-4 text-slate-400" />
                    )}
                    <span>{link.name}</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          {t("copyright", { year: currentYear, siteName })}
        </p>
      </div>
    </footer>
  );
}

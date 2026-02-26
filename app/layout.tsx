import { headers } from "next/headers";
import type { Metadata } from "next";

import { getSiteUrl, SITE_DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

import "./globals.css";

const defaultLocale = "zh-CN";
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DEFAULT_DESCRIPTION,
  icons: {
    icon: "/brand/logo.svg",
    shortcut: "/brand/logo.svg",
    apple: "/brand/logo.svg",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DEFAULT_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DEFAULT_DESCRIPTION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const locale = requestHeaders.get("x-next-intl-locale") ?? defaultLocale;

  return (
    <html lang={locale}>
      <body>
        <div className="min-h-dvh bg-[rgb(var(--color-bg))] text-[rgb(var(--color-fg))]">
          {children}
        </div>
      </body>
    </html>
  );
}

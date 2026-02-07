import { headers } from "next/headers";
import type { Metadata } from "next";

import "./globals.css";

const defaultLocale = "zh-CN";

export const metadata: Metadata = {
  icons: {
    icon: "/brand/logo.svg",
    shortcut: "/brand/logo.svg",
    apple: "/brand/logo.svg",
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

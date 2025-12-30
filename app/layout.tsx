import { headers } from "next/headers";

import "./globals.css";

const defaultLocale = "zh-CN";

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
          <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
            <div className="text-5xl font-bold">handler_blog</div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

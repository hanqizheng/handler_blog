import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    return [
      { source: "/", destination: "/zh-CN" },
      { source: "/posts/:path*", destination: "/zh-CN/posts/:path*" },
      { source: "/admin", destination: "/zh-CN/admin" },
      { source: "/admin/:path*", destination: "/zh-CN/admin/:path*" },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);

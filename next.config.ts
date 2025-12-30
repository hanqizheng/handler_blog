import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const config = withNextIntl(nextConfig);

const normalizeTurboAliases = (baseConfig: NextConfig): NextConfig => {
  const turboAliases = baseConfig.experimental?.turbo?.resolveAlias;
  if (!turboAliases) {
    return baseConfig;
  }

  const { experimental, ...rest } = baseConfig;
  const { turbo, ...restExperimental } = experimental ?? {};

  return {
    ...rest,
    // Move next-intl's legacy experimental.turbo.resolveAlias to turbopack.resolveAlias.
    turbopack: {
      ...baseConfig.turbopack,
      resolveAlias: {
        ...(baseConfig.turbopack?.resolveAlias ?? {}),
        ...turboAliases,
      },
    },
    experimental: Object.keys(restExperimental).length
      ? restExperimental
      : undefined,
  };
};

export default normalizeTurboAliases(config);

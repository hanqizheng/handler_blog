const DEFAULT_PROXY_DOMAIN = "/qiniu";

const PUBLIC_PROXY_DOMAIN =
  process.env.NEXT_PUBLIC_QINIU_DISPLAY_DOMAIN || DEFAULT_PROXY_DOMAIN;

const PUBLIC_SOURCE_DOMAIN =
  process.env.NEXT_PUBLIC_QINIU_SOURCE_DOMAIN || "";

const normalizeBase = (url: string) => url.replace(/\/+$/g, "");

const normalizePathSegment = (path: string) =>
  path.replace(/^\/+/, "").replace(/\/+$/g, "");

const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);
const isLocalBlobUrl = (url: string) => /^blob:|^data:/i.test(url);

const getProxyBase = () => {
  if (!PUBLIC_PROXY_DOMAIN) return DEFAULT_PROXY_DOMAIN;
  return normalizeBase(PUBLIC_PROXY_DOMAIN);
};

const getSourceBase = () => {
  if (!PUBLIC_SOURCE_DOMAIN) return "";
  const trimmed = normalizeBase(PUBLIC_SOURCE_DOMAIN);
  return isAbsoluteUrl(trimmed) ? trimmed : "";
};

const getKnownQiniuHosts = () => {
  const hosts = new Set<string>();

  if (PUBLIC_SOURCE_DOMAIN && isAbsoluteUrl(PUBLIC_SOURCE_DOMAIN)) {
    try {
      hosts.add(new URL(PUBLIC_SOURCE_DOMAIN).hostname);
    } catch {
      // ignore invalid URL
    }
  }

  if (PUBLIC_PROXY_DOMAIN && isAbsoluteUrl(PUBLIC_PROXY_DOMAIN)) {
    try {
      hosts.add(new URL(PUBLIC_PROXY_DOMAIN).hostname);
    } catch {
      // ignore invalid URL
    }
  }

  return hosts;
};

const isQiniuHost = (hostname: string, knownHosts: Set<string>) => {
  if (knownHosts.has(hostname)) return true;
  return (
    hostname.endsWith("clouddn.com") ||
    hostname.endsWith("qiniucdn.com") ||
    hostname.endsWith("qnssl.com")
  );
};

const mapToProxyUrl = (url: URL, proxyBase: string) => {
  const path = normalizePathSegment(url.pathname);
  const base = normalizeBase(proxyBase);
  const target = `${base}/${path}`;
  return url.search ? `${target}${url.search}` : target;
};

export const getImageUrl = (input: string | undefined | null): string => {
  if (!input) return "";
  if (isLocalBlobUrl(input)) return input;

  const proxyBase = getProxyBase();
  const sourceBase = getSourceBase();
  const knownHosts = getKnownQiniuHosts();
  const proxyPath =
    proxyBase.startsWith("/") && !isAbsoluteUrl(proxyBase)
      ? proxyBase
      : DEFAULT_PROXY_DOMAIN;

  if (isAbsoluteUrl(input)) {
    try {
      if (input.startsWith(proxyBase)) {
        return input;
      }
      const url = new URL(input);
      if (sourceBase) {
        return input;
      }
      if (isQiniuHost(url.hostname, knownHosts)) {
        return mapToProxyUrl(url, proxyBase);
      }
    } catch {
      return input;
    }

    return input;
  }

  if (input.startsWith("/")) {
    if (input === proxyPath || input.startsWith(`${proxyPath}/`)) {
      if (sourceBase) {
        const normalized = normalizePathSegment(input.slice(proxyPath.length));
        return normalized ? `${sourceBase}/${normalized}` : sourceBase;
      }
      return input;
    }
  }

  const normalized = normalizePathSegment(input);
  if (sourceBase) {
    return `${sourceBase}/${normalized}`;
  }
  return `${proxyBase}/${normalized}`;
};

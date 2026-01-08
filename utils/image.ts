const DEFAULT_PROXY_DOMAIN = "/qiniu";

const PUBLIC_PROXY_DOMAIN =
  process.env.NEXT_PUBLIC_QINIU_DISPLAY_DOMAIN || DEFAULT_PROXY_DOMAIN;

const PUBLIC_SOURCE_DOMAIN = process.env.NEXT_PUBLIC_QINIU_SOURCE_DOMAIN || "";

const normalizeBase = (url: string) => url.replace(/\/+$/g, "");

const normalizePathSegment = (path: string) =>
  path.replace(/^\/+/, "").replace(/\/+$/g, "");

const isAbsoluteUrl = (url: string) => /^https?:\/\//i.test(url);
const isLocalBlobUrl = (url: string) => /^blob:|^data:/i.test(url);

const getProxyBase = () => {
  if (!PUBLIC_PROXY_DOMAIN) return DEFAULT_PROXY_DOMAIN;
  const normalized = normalizeBase(PUBLIC_PROXY_DOMAIN);
  if (!normalized) return DEFAULT_PROXY_DOMAIN;
  if (isAbsoluteUrl(normalized) || normalized.startsWith("/")) {
    return normalized;
  }
  return `/${normalized}`;
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

const stripBasePath = (path: string, base?: string) => {
  if (!base) return path;
  let basePath = base;
  if (isAbsoluteUrl(base)) {
    try {
      basePath = new URL(base).pathname;
    } catch {
      basePath = base;
    }
  }
  const normalizedBase = normalizePathSegment(basePath);
  if (!normalizedBase) return path;
  if (path === normalizedBase) return "";
  if (path.startsWith(`${normalizedBase}/`)) {
    return path.slice(normalizedBase.length + 1);
  }
  return path;
};

export const normalizeImageKey = (input: string | undefined | null): string => {
  if (!input) return "";
  if (isLocalBlobUrl(input)) return input;

  const trimmed = input.trim();
  if (!trimmed) return "";

  let path = "";
  if (isAbsoluteUrl(trimmed)) {
    try {
      path = normalizePathSegment(new URL(trimmed).pathname);
    } catch {
      return trimmed.replace(/^\/+/, "");
    }
  } else {
    path = normalizePathSegment(trimmed);
  }

  const proxyBase = getProxyBase();
  const withoutProxy = stripBasePath(path, proxyBase);
  const withoutSource = stripBasePath(withoutProxy, PUBLIC_SOURCE_DOMAIN);
  return stripBasePath(withoutSource, PUBLIC_PROXY_DOMAIN);
};

export const getImageUrl = (input: string | undefined | null): string => {
  if (!input) return "";
  if (isLocalBlobUrl(input)) return input;

  const proxyBase = getProxyBase();
  const knownHosts = getKnownQiniuHosts();
  const proxyPath =
    proxyBase.startsWith("/") && !isAbsoluteUrl(proxyBase)
      ? proxyBase
      : DEFAULT_PROXY_DOMAIN;
  const resolvedProxyBase =
    proxyBase.startsWith("/") && !isAbsoluteUrl(proxyBase)
      ? proxyPath
      : proxyBase;

  if (isAbsoluteUrl(input)) {
    try {
      if (input.startsWith(proxyBase)) {
        return input;
      }
      const url = new URL(input);
      if (!isQiniuHost(url.hostname, knownHosts)) {
        return mapToProxyUrl(url, resolvedProxyBase);
      }
      return mapToProxyUrl(url, resolvedProxyBase);
    } catch {
      return input;
    }
  }

  if (input.startsWith("/")) {
    if (input === proxyPath || input.startsWith(`${proxyPath}/`)) {
      return input;
    }
    const normalized = normalizePathSegment(input);
    return normalized
      ? `${resolvedProxyBase}/${normalized}`
      : resolvedProxyBase;
  }

  const normalized = normalizePathSegment(input);
  return `${resolvedProxyBase}/${normalized}`;
};

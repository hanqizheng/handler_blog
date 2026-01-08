import { createBucketManager, getServerQiniuConfig } from "@/lib/qiniu";

export const runtime = "nodejs";

const SOURCE_DOMAIN_CACHE_TTL_MS = 5 * 60 * 1000;
let cachedSourceDomains: { domains: string[]; expiresAt: number } | null = null;

const getEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} 未配置`);
  }
  return value;
};

const buildTargetUrl = (base: string, path: string, search: string) => {
  const trimmedBase = base.replace(/\/+$/g, "");
  const trimmedPath = path.replace(/^\/+/g, "");
  const url = new URL(`${trimmedBase}/${trimmedPath}`);
  url.search = search;
  return url.toString();
};

const buildForwardHeaders = (request: Request) => {
  const headers = new Headers();
  const passthroughKeys = [
    "range",
    "if-none-match",
    "if-modified-since",
    "accept",
  ];

  passthroughKeys.forEach((key) => {
    const value = request.headers.get(key);
    if (value) {
      headers.set(key, value);
    }
  });

  return headers;
};

const buildResponseHeaders = (sourceHeaders: Headers) => {
  const headers = new Headers();
  const passthroughKeys = [
    "content-type",
    "etag",
    "cache-control",
    "last-modified",
    "accept-ranges",
    "content-range",
  ];

  passthroughKeys.forEach((key) => {
    const value = sourceHeaders.get(key);
    if (value) {
      headers.set(key, value);
    }
  });

  return headers;
};

const normalizeSourceDomain = (domain: string) => {
  const trimmed = domain.trim().replace(/\/+$/g, "");
  if (/^https?:\/\//.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const getSourceDomain = () => {
  const sourceDomain = normalizeSourceDomain(getEnv("QINIU_SOURCE_DOMAIN"));
  try {
    new URL(sourceDomain);
  } catch {
    throw new Error("QINIU_SOURCE_DOMAIN 需要是完整 URL");
  }
  return sourceDomain;
};

const extractDomainCandidates = (data: unknown): string[] => {
  if (Array.isArray(data)) {
    return data
      .map((item) =>
        typeof item === "string"
          ? item
          : typeof item === "object" &&
              item &&
              "domain" in item &&
              typeof item.domain === "string"
            ? item.domain
            : "",
      )
      .filter(Boolean);
  }

  if (data && typeof data === "object" && "domains" in data) {
    const domains = (data as { domains?: unknown }).domains;
    if (Array.isArray(domains)) {
      return domains
        .map((item) =>
          typeof item === "string"
            ? item
            : typeof item === "object" &&
                item &&
                "domain" in item &&
                typeof item.domain === "string"
              ? item.domain
              : "",
        )
        .filter(Boolean);
    }
  }

  return [];
};

const getFallbackSourceDomain = async () => {
  const now = Date.now();
  if (cachedSourceDomains && cachedSourceDomains.expiresAt > now) {
    return cachedSourceDomains.domains[0] ?? null;
  }

  let qiniuConfig: ReturnType<typeof getServerQiniuConfig>;
  try {
    qiniuConfig = getServerQiniuConfig();
  } catch {
    return null;
  }

  const bucketManager = createBucketManager(qiniuConfig);

  try {
    const { data, resp } = await bucketManager.listBucketDomains(
      qiniuConfig.bucket,
    );
    if (!resp || resp.statusCode !== 200) {
      return null;
    }

    const domains = extractDomainCandidates(data)
      .map((domain) => normalizeSourceDomain(domain))
      .filter(Boolean);

    if (!domains.length) {
      return null;
    }

    cachedSourceDomains = {
      domains,
      expiresAt: now + SOURCE_DOMAIN_CACHE_TTL_MS,
    };

    return domains[0];
  } catch {
    return null;
  }
};

const shouldRetryWithFallback = (error: unknown) => {
  if (
    error instanceof Error &&
    error.cause &&
    typeof error.cause === "object"
  ) {
    const { code } = error.cause as { code?: string };
    return code === "ENOTFOUND";
  }
  return false;
};

const buildUpstreamErrorResponse = (error: unknown) => {
  if (
    error instanceof Error &&
    error.cause &&
    typeof error.cause === "object"
  ) {
    const { code, hostname } = error.cause as {
      code?: string;
      hostname?: string;
    };
    if (code || hostname) {
      return Response.json(
        {
          ok: false,
          error: "upstream fetch failed",
          details: { code, hostname },
        },
        { status: 502 },
      );
    }
  }

  return Response.json(
    { ok: false, error: "upstream fetch failed" },
    { status: 502 },
  );
};

type RouteContext = { params: Promise<{ path?: string[] | string }> };

const getRawPathFromRequest = (request: Request) => {
  const { pathname } = new URL(request.url);
  if (pathname === "/qiniu") return "";
  if (pathname.startsWith("/qiniu/")) {
    return pathname.slice("/qiniu/".length);
  }
  return pathname.replace(/^\/+/, "");
};

const hasPercentEncodedPath = (path: string) => /%[0-9a-f]{2}/i.test(path);

const escapePercentEncodedPath = (path: string) =>
  path.replace(/%([0-9a-f]{2})/gi, "%25$1");

const buildUpstreamRequest = (
  request: Request,
  method: "GET" | "HEAD",
  domain: string,
  path: string,
  search: string,
) =>
  fetch(buildTargetUrl(domain, path, search), {
    method,
    headers: buildForwardHeaders(request),
  });

const retryWithEscapedPercent = async (options: {
  response: Response;
  request: Request;
  method: "GET" | "HEAD";
  domain: string;
  path: string;
  search: string;
}) => {
  const { response, request, method, domain, path, search } = options;
  if (response.status !== 404 || !hasPercentEncodedPath(path)) {
    return response;
  }

  const escapedPath = escapePercentEncodedPath(path);
  if (escapedPath === path) {
    return response;
  }

  try {
    return await buildUpstreamRequest(
      request,
      method,
      domain,
      escapedPath,
      search,
    );
  } catch {
    return response;
  }
};

const handleProxyRequest = async (request: Request, method: "GET" | "HEAD") => {
  const path = getRawPathFromRequest(request);

  if (!path) {
    return Response.json(
      { ok: false, error: "path is required" },
      { status: 400 },
    );
  }

  let sourceDomain: string;
  try {
    sourceDomain = getSourceDomain();
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "配置缺失",
      },
      { status: 500 },
    );
  }

  const requestUrl = new URL(request.url);
  const search = requestUrl.search;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await buildUpstreamRequest(
      request,
      method,
      sourceDomain,
      path,
      search,
    );
    upstreamResponse = await retryWithEscapedPercent({
      response: upstreamResponse,
      request,
      method,
      domain: sourceDomain,
      path,
      search,
    });
  } catch (error) {
    if (shouldRetryWithFallback(error)) {
      const fallbackDomain = await getFallbackSourceDomain();
      if (fallbackDomain && fallbackDomain !== sourceDomain) {
        try {
          upstreamResponse = await buildUpstreamRequest(
            request,
            method,
            fallbackDomain,
            path,
            search,
          );
          upstreamResponse = await retryWithEscapedPercent({
            response: upstreamResponse,
            request,
            method,
            domain: fallbackDomain,
            path,
            search,
          });
        } catch {
          return buildUpstreamErrorResponse(error);
        }
      } else {
        return buildUpstreamErrorResponse(error);
      }
    } else {
      return buildUpstreamErrorResponse(error);
    }
  }

  const headers = buildResponseHeaders(upstreamResponse.headers);

  return new Response(method === "HEAD" ? null : upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
};

export async function GET(request: Request, _context: RouteContext) {
  return handleProxyRequest(request, "GET");
}

export async function HEAD(request: Request, _context: RouteContext) {
  return handleProxyRequest(request, "HEAD");
}

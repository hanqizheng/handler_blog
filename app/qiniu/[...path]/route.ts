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
  if (error instanceof Error && error.cause && typeof error.cause === "object") {
    const { code } = error.cause as { code?: string };
    return code === "ENOTFOUND";
  }
  return false;
};

const buildUpstreamErrorResponse = (error: unknown) => {
  if (error instanceof Error && error.cause && typeof error.cause === "object") {
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

export async function GET(request: Request, context: RouteContext) {
  const { path: rawPath } = await context.params;
  const path = Array.isArray(rawPath) ? rawPath.join("/") : rawPath ?? "";

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
  const targetUrl = buildTargetUrl(sourceDomain, path, requestUrl.search);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl, {
      method: "GET",
      headers: buildForwardHeaders(request),
    });
  } catch (error) {
    if (shouldRetryWithFallback(error)) {
      const fallbackDomain = await getFallbackSourceDomain();
      if (fallbackDomain && fallbackDomain !== sourceDomain) {
        const fallbackUrl = buildTargetUrl(
          fallbackDomain,
          path,
          requestUrl.search,
        );
        try {
          upstreamResponse = await fetch(fallbackUrl, {
            method: "GET",
            headers: buildForwardHeaders(request),
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

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

export async function HEAD(request: Request, context: RouteContext) {
  const { path: rawPath } = await context.params;
  const path = Array.isArray(rawPath) ? rawPath.join("/") : rawPath ?? "";

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
  const targetUrl = buildTargetUrl(sourceDomain, path, requestUrl.search);

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(targetUrl, {
      method: "HEAD",
      headers: buildForwardHeaders(request),
    });
  } catch (error) {
    if (shouldRetryWithFallback(error)) {
      const fallbackDomain = await getFallbackSourceDomain();
      if (fallbackDomain && fallbackDomain !== sourceDomain) {
        const fallbackUrl = buildTargetUrl(
          fallbackDomain,
          path,
          requestUrl.search,
        );
        try {
          upstreamResponse = await fetch(fallbackUrl, {
            method: "HEAD",
            headers: buildForwardHeaders(request),
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

  return new Response(null, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers,
  });
}

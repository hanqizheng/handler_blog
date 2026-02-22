import * as qiniu from "qiniu";

export type QiniuRegion = "z0" | "z1" | "z2" | "na0" | "as0" | "cn-east-2";

export interface ServerQiniuConfig {
  accessKey: string;
  secretKey: string;
  bucket: string;
  region?: string;
  uploadDomain: string;
  displayDomain?: string;
  sourceDomain?: string;
}

export interface UploadTokenOptions {
  key?: string;
  expiresInSeconds?: number;
  insertOnly?: boolean;
}

const REGION_ZONE_MAP: Record<QiniuRegion, qiniu.conf.Zone> = {
  z0: qiniu.zone.Zone_z0,
  z1: qiniu.zone.Zone_z1,
  z2: qiniu.zone.Zone_z2,
  na0: qiniu.zone.Zone_na0,
  as0: qiniu.zone.Zone_as0,
  "cn-east-2": qiniu.zone.Zone_cn_east_2,
};

const normalizeUploadDomain = (domain: string) => {
  const trimmed = domain.trim().replace(/\/+$/g, "");
  if (/^https?:\/\//.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const normalizePath = (value: string) => value.replace(/^\/+/, "");

const stripDisplayPrefix = (path: string, base?: string) => {
  if (!base) return path;
  const normalizedBase = base.replace(/^\/+|\/+$/g, "");
  if (normalizedBase && path.startsWith(`${normalizedBase}/`)) {
    return path.slice(normalizedBase.length + 1);
  }
  return path;
};

export const extractQiniuObjectKey = (input: string, displayDomain?: string) => {
  if (!input) return "";

  if (!/^https?:\/\//.test(input)) {
    const rawPath = normalizePath(input);
    if (!displayDomain) {
      return rawPath;
    }
    try {
      const baseUrl = new URL(displayDomain);
      return stripDisplayPrefix(
        rawPath,
        baseUrl.pathname.replace(/^\/+|\/+$/g, ""),
      );
    } catch {
      return stripDisplayPrefix(rawPath, displayDomain);
    }
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return normalizePath(input);
  }

  const path = normalizePath(url.pathname);
  if (!displayDomain) return path;

  try {
    const baseUrl = new URL(displayDomain);
    return stripDisplayPrefix(path, baseUrl.pathname);
  } catch {
    return stripDisplayPrefix(path, displayDomain);
  }
};

const resolveZone = (region?: string) => {
  if (!region) return undefined;
  const zone = REGION_ZONE_MAP[region as QiniuRegion];
  if (!zone) {
    throw new Error("QINIU_REGION 未识别");
  }
  return zone;
};

const getEnv = (key: string) => {
  const value = process.env[key];
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${key} 未配置`);
  }
  return trimmed;
};

export const resolveUploadDomain = (options: {
  region?: string;
  uploadDomain?: string;
}) => {
  if (options.uploadDomain) {
    return normalizeUploadDomain(options.uploadDomain);
  }

  const zone = resolveZone(options.region);
  const host = zone?.srcUpHosts?.[0] ?? zone?.cdnUpHosts?.[0];
  if (!host) {
    throw new Error("QINIU_UPLOAD_DOMAIN 未配置");
  }

  return normalizeUploadDomain(host);
};

export const getServerQiniuConfig = (): ServerQiniuConfig => {
  const accessKey = getEnv("QINIU_ACCESS_KEY");
  const secretKey = getEnv("QINIU_SECRET_KEY");
  const bucket = getEnv("QINIU_BUCKET");
  const region = process.env.QINIU_REGION?.trim();
  const displayDomain = process.env.QINIU_DISPLAY_DOMAIN?.trim();
  const sourceDomain = process.env.QINIU_SOURCE_DOMAIN?.trim();
  const uploadDomain = resolveUploadDomain({
    region,
    uploadDomain: process.env.QINIU_UPLOAD_DOMAIN?.trim(),
  });

  return {
    accessKey,
    secretKey,
    bucket,
    region,
    uploadDomain,
    displayDomain,
    sourceDomain,
  };
};

export const createQiniuMac = (config: ServerQiniuConfig) =>
  new qiniu.auth.digest.Mac(config.accessKey, config.secretKey);

export const createQiniuConfig = (region?: string) => {
  const qiniuConfig = new qiniu.conf.Config();
  const zone = resolveZone(region);
  if (zone) {
    qiniuConfig.zone = zone;
  }
  qiniuConfig.useHttpsDomain = true;
  return qiniuConfig;
};

export const createBucketManager = (config: ServerQiniuConfig) => {
  const mac = createQiniuMac(config);
  const qiniuConfig = createQiniuConfig(config.region);
  return new qiniu.rs.BucketManager(mac, qiniuConfig);
};

export const generateUploadTokenWithSDK = (
  config: ServerQiniuConfig,
  options: UploadTokenOptions = {},
) => {
  const { key, expiresInSeconds = 3600, insertOnly } = options;
  const scope = key ? `${config.bucket}:${key}` : config.bucket;
  const putPolicy = new qiniu.rs.PutPolicy({
    scope,
    expires: expiresInSeconds,
    ...(typeof insertOnly === "boolean" ? { insertOnly: insertOnly ? 1 : 0 } : {}),
  });
  const mac = createQiniuMac(config);
  const token = putPolicy.uploadToken(mac);

  return { token, scope };
};

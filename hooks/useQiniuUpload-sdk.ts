"use client";

import { useCallback } from "react";

import imageCompression from "browser-image-compression";

import { normalizeImageKey } from "@/utils/image";

export const DEFAULT_MAX_FILE_SIZE = 400 * 1024;

export enum UploadStatus {
  IDLE = "idle",
  UPLOADING = "uploading",
  SUCCESS = "success",
  FAILED = "failed",
}

export interface UploadProgress {
  status: UploadStatus;
  progress: number;
  error?: string;
}

export interface UseQiniuUploadOptions {
  maxFileSize?: number;
  maxFileSizeByType?: Record<string, number>;
  allowedTypes?: string[];
  pathPrefix?: string;
}

export interface UploadResult {
  key: string;
  url: string;
}

const FILE_TYPE_EXT_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg"]);

const normalizePathPrefix = (prefix: string | undefined) =>
  prefix ? prefix.replace(/^\/+|\/+$/g, "") : "";

const getProjectPrefix = () =>
  normalizePathPrefix(
    process.env.NEXT_PUBLIC_QINIU_PROJECT_PREFIX ??
      process.env.QINIU_PROJECT_PREFIX ??
      "",
  );

const sanitizeToken = (value: string) =>
  value.replace(/[^\x20-\x7e]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-");

const sanitizeFileName = (fileName: string) => {
  const lastDot = fileName.lastIndexOf(".");
  const rawBase = lastDot > 0 ? fileName.slice(0, lastDot) : fileName;
  const rawExt = lastDot > 0 ? fileName.slice(lastDot + 1) : "";
  const safeBase = sanitizeToken(rawBase).replace(/^-+|-+$/g, "");
  const safeExt = sanitizeToken(rawExt).replace(/^-+|-+$/g, "");
  return {
    base: safeBase || "upload",
    ext: safeExt,
  };
};

export const resolveFileSizeLimit = (
  fileType: string,
  limits: Record<string, number> | undefined,
  fallback: number,
) => {
  if (limits) {
    for (const [typePattern, sizeLimit] of Object.entries(limits)) {
      if (!typePattern) continue;

      if (typePattern.endsWith("/*")) {
        if (fileType.startsWith(typePattern.slice(0, -1))) {
          return sizeLimit;
        }
      } else if (fileType === typePattern) {
        return sizeLimit;
      }
    }
  }

  return fallback;
};

export const isTypeAllowed = (file: File, allowedTypes?: string[]) => {
  if (!allowedTypes || allowedTypes.length === 0) return true;

  const fileType = file.type;
  if (fileType) {
    return allowedTypes.some((allowed) => {
      if (!allowed) return false;
      if (allowed.endsWith("/*")) {
        return fileType.startsWith(allowed.slice(0, -1));
      }
      return fileType === allowed;
    });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!extension) return false;

  if (
    allowedTypes.includes("image/*") &&
    IMAGE_EXTENSIONS.has(extension.toLowerCase())
  ) {
    return true;
  }

  return allowedTypes.some((allowed) => allowed.endsWith(`/${extension}`));
};

const buildFullPrefix = (pathPrefix?: string) => {
  const projectPrefix = getProjectPrefix();
  const normalizedPrefix = normalizePathPrefix(pathPrefix);
  if (projectPrefix && normalizedPrefix) {
    return `${projectPrefix}/${normalizedPrefix}`;
  }
  return projectPrefix || normalizedPrefix;
};

const buildObjectKey = (file: File, pathPrefix?: string) => {
  const prefix = buildFullPrefix(pathPrefix);
  const { base, ext } = sanitizeFileName(file.name);
  const fallbackExt = FILE_TYPE_EXT_MAP[file.type] ?? "";
  const finalExt = ext || fallbackExt;
  const fileName = finalExt ? `${base}.${finalExt}` : base;

  const randomId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const keyName = `${randomId}-${fileName}`;
  return prefix ? `${prefix}/${keyName}` : keyName;
};

const buildPublicUrl = (displayDomain: string, key: string) => {
  const base = displayDomain.replace(/\/+$/g, "");
  const cleanKey = key.replace(/^\/+/g, "");
  return `${base}/${cleanKey}`;
};

const normalizeUploadDomain = (domain: string) => {
  const trimmed = domain.trim().replace(/\/+$/g, "");
  if (/^https?:\/\//.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const isDebugEnabled = () =>
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_QINIU_DEBUG === "true";

const COMPRESSIBLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function compressImageIfNeeded(
  file: File,
  maxSizeBytes: number,
): Promise<File> {
  if (file.size <= maxSizeBytes) {
    return file;
  }

  if (!COMPRESSIBLE_TYPES.has(file.type)) {
    return file;
  }

  const compressed = await imageCompression(file, {
    maxSizeMB: maxSizeBytes / (1024 * 1024),
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: file.type,
  });

  return new File([compressed], file.name, { type: file.type });
}

const fetchUploadToken = async (key: string) => {
  const response = await fetch("/api/qiniu/upload-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });

  const data = (await response.json().catch(() => null)) as {
    ok?: boolean;
    token?: string;
    uploadDomain?: string;
    displayDomain?: string;
    key?: string;
    expiresAt?: string;
    issuedAt?: string;
    timeSource?: string;
    timeSkewSeconds?: number;
    timeError?: string;
    error?: string;
  } | null;

  if (!response.ok || !data?.ok || !data.token || !data.uploadDomain) {
    const message = data?.error || "获取上传凭证失败";
    if (isDebugEnabled()) {
      console.info("[qiniu] upload-token failed", {
        key,
        status: response.status,
        error: data?.error,
      });
    }
    throw new Error(message);
  }

  if (isDebugEnabled()) {
    console.info("[qiniu] upload-token success", {
      key: data.key ?? key,
      uploadDomain: data.uploadDomain,
      expiresAt: data.expiresAt,
      issuedAt: data.issuedAt,
      timeSource: data.timeSource,
      timeSkewSeconds: data.timeSkewSeconds,
      timeError: data.timeError,
    });
  }

  return {
    token: data.token,
    uploadDomain: normalizeUploadDomain(data.uploadDomain),
    displayDomain: data.displayDomain ?? "",
    key: data.key ?? key,
  };
};

const uploadWithProgress = (
  uploadUrl: string,
  file: File,
  token: string,
  key: string,
  onProgress?: (progress: UploadProgress) => void,
) =>
  new Promise<{ key: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress?.({ status: UploadStatus.UPLOADING, progress: percent });
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        let message = "上传失败";
        const responseText = xhr.responseText;
        if (isDebugEnabled()) {
          console.info("[qiniu] upload failed", {
            status: xhr.status,
            key,
            responseText: responseText?.slice(0, 300),
          });
        }
        if (responseText) {
          try {
            const parsed = JSON.parse(responseText) as { error?: string };
            if (parsed?.error) {
              message = parsed.error;
            }
          } catch {
            message = responseText.slice(0, 200);
          }
        }
        reject(new Error(message));
        return;
      }

      let responseData: { key?: string } | null = null;
      try {
        responseData = JSON.parse(xhr.responseText) as { key?: string };
      } catch {
        responseData = null;
      }

      resolve({ key: responseData?.key ?? key });
    };

    xhr.onerror = () => {
      if (isDebugEnabled()) {
        console.info("[qiniu] upload error", { key });
      }
      reject(new Error("上传失败"));
    };

    const formData = new FormData();
    formData.append("token", token);
    formData.append("key", key);
    formData.append("file", file);

    onProgress?.({ status: UploadStatus.UPLOADING, progress: 0 });
    xhr.send(formData);
  });

export const useQiniuUpload = (options: UseQiniuUploadOptions = {}) => {
  const {
    maxFileSize = DEFAULT_MAX_FILE_SIZE,
    maxFileSizeByType,
    allowedTypes,
    pathPrefix,
  } = options;

  const uploadFile = useCallback(
    async (
      file: File,
      onProgress?: (progress: UploadProgress) => void,
    ): Promise<UploadResult> => {
      if (!isTypeAllowed(file, allowedTypes)) {
        throw new Error("文件类型不支持");
      }

      const sizeLimit = resolveFileSizeLimit(
        file.type,
        maxFileSizeByType,
        maxFileSize,
      );

      // Auto-compress oversized images instead of rejecting them
      const fileToUpload = await compressImageIfNeeded(file, sizeLimit);

      if (fileToUpload.size > sizeLimit) {
        throw new Error("文件大小超过限制");
      }

      const key = buildObjectKey(fileToUpload, pathPrefix);
      const {
        token,
        uploadDomain,
        displayDomain,
        key: resolvedKey,
      } = await fetchUploadToken(key);

      const uploadResult = await uploadWithProgress(
        uploadDomain,
        fileToUpload,
        token,
        resolvedKey,
        onProgress,
      );

      onProgress?.({ status: UploadStatus.SUCCESS, progress: 100 });

      const url = displayDomain
        ? buildPublicUrl(displayDomain, uploadResult.key)
        : uploadResult.key;
      const normalizedUrl = normalizeImageKey(url);

      return { key: uploadResult.key, url: normalizedUrl };
    },
    [allowedTypes, maxFileSize, maxFileSizeByType, pathPrefix],
  );

  const deleteFile = useCallback(async (keyOrUrl: string) => {
    const response = await fetch("/api/qiniu/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: keyOrUrl }),
    });

    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "删除失败");
    }
  }, []);

  return { uploadFile, deleteFile };
};

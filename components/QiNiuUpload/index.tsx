"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Accept, type FileRejection, useDropzone } from "react-dropzone";

import { toast } from "@/lib/toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

import {
  DEFAULT_MAX_FILE_SIZE,
  type UploadProgress,
  UploadStatus,
  useQiniuUpload,
} from "../../hooks/useQiniuUpload-sdk";

const formatSizeInKb = (bytes: number) => {
  const size = bytes / 1024;
  return Number.isInteger(size) ? size.toFixed(0) : size.toFixed(1);
};

const formatFileSize = (bytes: number) => {
  const sizeInMb = bytes / (1024 * 1024);
  if (sizeInMb >= 1) {
    return `${Number.isInteger(sizeInMb) ? sizeInMb.toFixed(0) : sizeInMb.toFixed(1)}MB`;
  }
  return `${formatSizeInKb(bytes)}KB`;
};

const formatFileTypeLabel = (type: string) => {
  if (type.startsWith("image/")) return "图片";
  if (type.startsWith("video/")) return "视频";
  if (type === "application/pdf") return "PDF";
  if (type.startsWith("text/")) return "文本";
  if (type.endsWith("/*")) return type.replace("/*", "");
  return type;
};

const resolveFileSizeLimit = (
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

export interface QiniuUploadProps {
  value?: string[];
  onChange?: (urls: string[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  maxFileSizeByType?: Record<string, number>;
  allowedTypes?: string[];
  pathPrefix?: string;
  disabled?: boolean;
  className?: string;
  accept?: Record<string, string[]>;
}

const DEFAULT_ALLOWED_TYPES = ["image/*", "application/pdf", "text/*"] as const;
const DEFAULT_ACCEPT: Accept = {
  "image/*": [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"],
  "application/pdf": [".pdf"],
  "text/*": [".txt", ".md"],
};

const buildAcceptFromAllowedTypes = (types?: string[]): Accept | undefined => {
  if (!types || types.length === 0) return undefined;
  return types.reduce<Accept>((acc, type) => {
    if (type) {
      acc[type] = acc[type] || [];
    }
    return acc;
  }, {});
};

interface FileUploadState {
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export function QiniuUpload({
  value = [],
  onChange,
  maxFiles = 5,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxFileSizeByType,
  allowedTypes = [...DEFAULT_ALLOWED_TYPES],
  pathPrefix = "",
  disabled = false,
  className,
  accept,
}: QiniuUploadProps) {
  const [fileStates, setFileStates] = useState<FileUploadState[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const resolvedMaxFileSize = maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
  const effectiveMaxFileSizeByType = useMemo(() => {
    if (maxFileSizeByType) return maxFileSizeByType;

    const allImage =
      allowedTypes &&
      allowedTypes.length > 0 &&
      allowedTypes.every((type) => type.startsWith("image/"));
    const allowsImage = allowedTypes?.some((type) => type.startsWith("image/"));
    const allowsNonImage = allowedTypes?.some(
      (type) => !type.startsWith("image/"),
    );

    // 只允许图片时，默认限制 400KB
    if (allImage) {
      return { "image/*": DEFAULT_MAX_FILE_SIZE };
    }

    // 同时允许图片和其他类型时，图片走默认 400KB，其他类型使用整体限制
    if (
      allowsImage &&
      allowsNonImage &&
      resolvedMaxFileSize > DEFAULT_MAX_FILE_SIZE
    ) {
      const map: Record<string, number> = { "image/*": DEFAULT_MAX_FILE_SIZE };
      allowedTypes
        ?.filter((type) => !type.startsWith("image/"))
        .forEach((type) => {
          map[type] = resolvedMaxFileSize;
        });
      return map;
    }

    return undefined;
  }, [allowedTypes, maxFileSizeByType, resolvedMaxFileSize]);

  const getFileSizeLimit = useCallback(
    (fileType: string) =>
      resolveFileSizeLimit(
        fileType,
        effectiveMaxFileSizeByType ?? maxFileSizeByType,
        resolvedMaxFileSize,
      ),
    [effectiveMaxFileSizeByType, maxFileSizeByType, resolvedMaxFileSize],
  );

  const sizeHintText = useMemo(() => {
    const limits = effectiveMaxFileSizeByType ?? maxFileSizeByType;
    if (limits && Object.keys(limits).length > 0) {
      const hints = Object.entries(limits).map(([type, size]) => {
        return `${formatFileTypeLabel(type)}最大 ${formatFileSize(size)}`;
      });
      return hints.join("，");
    }
    return `单个文件最大 ${formatFileSize(resolvedMaxFileSize)}`;
  }, [effectiveMaxFileSizeByType, maxFileSizeByType, resolvedMaxFileSize]);

  const { uploadFile, deleteFile } = useQiniuUpload({
    maxFileSize: resolvedMaxFileSize,
    maxFileSizeByType: effectiveMaxFileSizeByType ?? maxFileSizeByType,
    allowedTypes,
    pathPrefix,
  });

  // 处理文件上传
  const handleDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length) {
        fileRejections.forEach((rejection) => {
          rejection.errors.forEach((error) => {
            toast.error(`${rejection.file.name}: ${error.message}`);
          });
        });
      }

      if (disabled || isUploading) return;

      const currentValue = valueRef.current;
      const remainingSlots = Math.max(0, maxFiles - currentValue.length);
      const exceedsCapacity = acceptedFiles.length > remainingSlots;

      if (remainingSlots <= 0) {
        toast.error(`最多只能上传 ${maxFiles} 个文件`);
        return;
      }

      const filesToUpload = acceptedFiles.slice(0, remainingSlots);

      if (filesToUpload.length === 0) {
        if (exceedsCapacity) {
          toast.error(`最多只能上传 ${maxFiles} 个文件`);
        }
        return;
      }

      setIsUploading(true);

      // 初始化文件状态
      const initialStates: FileUploadState[] = filesToUpload.map((file) => ({
        file,
        status: UploadStatus.IDLE,
        progress: 0,
      }));

      setFileStates(initialStates);

      // 串行上传文件以避免并发问题
      const uploadResults: string[] = [];
      let workingValue = [...currentValue];

      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];

        try {
          const result = await uploadFile(file, (progress: UploadProgress) => {
            setFileStates((prev) => {
              const newStates = [...prev];
              if (newStates[i]) {
                newStates[i] = {
                  ...newStates[i],
                  status: progress.status,
                  progress: progress.progress,
                  error: progress.error,
                };
              }
              return newStates;
            });
          });

          uploadResults.push(result.url);
          workingValue = [...workingValue, result.url];
          toast.success(`文件 ${file.name} 上传成功`);
        } catch (error) {
          setFileStates((prev) => {
            const newStates = [...prev];
            if (newStates[i]) {
              newStates[i] = {
                ...newStates[i],
                status: UploadStatus.FAILED,
                progress: 0,
                error: error instanceof Error ? error.message : "上传失败",
              };
            }
            return newStates;
          });

          toast.error(
            `文件 ${file.name} 上传失败: ${error instanceof Error ? error.message : "未知错误"}`,
          );
        }
      }

      // 更新文件列表
      if (uploadResults.length > 0) {
        valueRef.current = workingValue;
        onChange?.(workingValue);
      }

      setIsUploading(false);

      // 清理文件状态
      setTimeout(() => {
        setFileStates([]);
      }, 3000);
    },
    [maxFiles, disabled, uploadFile, onChange, isUploading],
  );

  // 处理文件删除
  const handleDelete = useCallback(
    async (index: number) => {
      if (disabled || isUploading) return;

      const previousValue = valueRef.current;
      const fileUrl = previousValue[index];
      const nextValue = previousValue.filter((_, i) => i !== index);
      const hasChanged = nextValue.length !== previousValue.length;

      if (hasChanged) {
        valueRef.current = nextValue;
        onChange?.(nextValue);
      }

      if (!fileUrl) {
        if (!hasChanged) {
          toast.error("找不到需要删除的文件");
        }
        return;
      }

      try {
        await deleteFile(fileUrl);
        toast.success("文件删除成功");
      } catch (error) {
        if (hasChanged) {
          valueRef.current = previousValue;
          onChange?.(previousValue);
        }
        toast.error(
          `删除失败: ${error instanceof Error ? error.message : "未知错误"}`,
        );
      }
    },
    [disabled, deleteFile, onChange, isUploading],
  );

  // 设置dropzone
  const resolvedAccept =
    accept ?? buildAcceptFromAllowedTypes(allowedTypes) ?? DEFAULT_ACCEPT;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: resolvedAccept,
    validator: (file) => {
      const sizeLimit = getFileSizeLimit(file.type);
      if (file.size > sizeLimit) {
        return {
          code: "file-too-large",
          message: `文件大小不能超过 ${formatFileSize(sizeLimit)}`,
        };
      }
      return null;
    },
    disabled: disabled || isUploading || value.length >= maxFiles,
  });

  return (
    <div className={cn("space-y-4", className)}>
      {/* 上传区域 */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={cn(
              "cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors",
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25",
              disabled || isUploading || value.length >= maxFiles
                ? "cursor-not-allowed opacity-50"
                : "hover:border-primary hover:bg-primary/5",
            )}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <p className="text-muted-foreground">正在上传文件...</p>
            ) : isDragActive ? (
              <p className="text-primary">拖拽文件到此处上传...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  拖拽文件到此处，或点击选择文件
                </p>
                <p className="text-muted-foreground text-xs">
                  已上传 {value.length}/{maxFiles} 个文件，{sizeHintText}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 上传进度 */}
      {fileStates.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">上传进度</h4>
          {fileStates.map((fileState, index) => (
            <div
              key={index}
              className="bg-muted flex items-center gap-2 rounded p-2"
            >
              <div className="flex-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate">{fileState.file.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {fileState.status === UploadStatus.SUCCESS && "✓"}
                    {fileState.status === UploadStatus.FAILED && "✗"}
                    {fileState.status === UploadStatus.UPLOADING &&
                      `${fileState.progress}%`}
                  </span>
                </div>
                <Progress value={fileState.progress} className="mt-1" />
                {fileState.error && (
                  <p className="text-destructive mt-1 text-xs">
                    {fileState.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 已上传文件列表 */}
      {value.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">已上传文件</h4>
          <div className="grid grid-cols-1 gap-2">
            {value.map((fileUrl, index) => (
              <div
                key={index}
                className="bg-muted flex items-center justify-between rounded p-2"
              >
                <span className="truncate text-sm">{fileUrl}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(index)}
                  disabled={disabled || isUploading}
                  className="text-destructive hover:text-destructive"
                >
                  删除
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

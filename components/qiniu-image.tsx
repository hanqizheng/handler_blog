import type React from "react";

import { getImageUrl, type QiniuImageVariant } from "@/utils/image";

type QiniuImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src?: string | null;
  variant?: QiniuImageVariant;
  priority?: boolean;
};

export function QiniuImage({
  src,
  variant = "full",
  priority = false,
  loading,
  decoding,
  fetchPriority,
  ...props
}: QiniuImageProps) {
  if (!src) return null;
  const { alt = "", ...restProps } = props;
  const resolvedLoading = loading ?? (priority ? "eager" : "lazy");
  const resolvedDecoding = decoding ?? "async";
  const resolvedFetchPriority = fetchPriority ?? (priority ? "high" : "low");

   
  return (
    <img
      src={getImageUrl(src)}
      alt={alt}
      loading={resolvedLoading}
      decoding={resolvedDecoding}
      fetchPriority={resolvedFetchPriority}
      {...restProps}
    />
  );
}

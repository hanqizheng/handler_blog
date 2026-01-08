import type React from "react";

import { getImageUrl } from "@/utils/image";

type QiniuImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src?: string | null;
};

export function QiniuImage({ src, ...props }: QiniuImageProps) {
  if (!src) return null;
  return <img src={getImageUrl(src)} {...props} />;
}

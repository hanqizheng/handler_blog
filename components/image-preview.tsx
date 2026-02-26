"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  RefreshCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { QiniuImage } from "@/components/qiniu-image";
import { cn } from "@/lib/utils";
import { getImageUrl } from "@/utils/image";

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const SCALE_STEP = 0.25;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export type ImagePreviewItem = {
  src: string;
  alt?: string;
};

// ---------- ImageLightbox (reusable overlay) ----------

type ImageLightboxProps = {
  images: ImagePreviewItem[];
  activeIndex: number | null;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
};

export function ImageLightbox({
  images,
  activeIndex,
  onClose,
  onNext,
  onPrev,
}: ImageLightboxProps) {
  const [scale, setScale] = useState(MIN_SCALE);

  const currentImage =
    activeIndex !== null && activeIndex < images.length
      ? images[activeIndex]
      : null;
  const currentSrc = currentImage ? getImageUrl(currentImage.src) : "";

  // Reset zoom when navigating or opening
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setScale(MIN_SCALE), [activeIndex]);

  const zoomIn = useCallback(() => {
    setScale((current) =>
      clamp(Number((current + SCALE_STEP).toFixed(2)), MIN_SCALE, MAX_SCALE),
    );
  }, []);

  const zoomOut = useCallback(() => {
    setScale((current) =>
      clamp(Number((current - SCALE_STEP).toFixed(2)), MIN_SCALE, MAX_SCALE),
    );
  }, []);

  const resetZoom = useCallback(() => {
    setScale(MIN_SCALE);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!currentImage) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [currentImage]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!currentImage) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onPrev();
        return;
      }
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoomIn();
        return;
      }
      if (event.key === "-") {
        event.preventDefault();
        zoomOut();
        return;
      }
      if (event.key === "0" || event.key === "1") {
        event.preventDefault();
        resetZoom();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentImage, onClose, onNext, onPrev, resetZoom, zoomIn, zoomOut]);

  if (activeIndex === null || !currentImage) {
    return null;
  }

  const controlClassName =
    "rounded-full border border-white/20 bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 text-white"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="flex h-full flex-col">
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 text-xs backdrop-blur sm:text-sm"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex flex-wrap items-center gap-3 text-white">
            <span className="font-medium">
              {currentImage.alt || "图片预览"}
            </span>
            <span className="text-white/60">
              {activeIndex + 1} / {images.length}
            </span>
            <span className="text-white/60">
              缩放 {Math.round(scale * 100)}%
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onPrev}
              className={controlClassName}
              disabled={images.length <= 1}
              aria-label="上一张"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onNext}
              className={controlClassName}
              disabled={images.length <= 1}
              aria-label="下一张"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              className={controlClassName}
              disabled={scale <= MIN_SCALE}
              aria-label="缩小"
            >
              <ZoomOut className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={zoomIn}
              className={controlClassName}
              disabled={scale >= MAX_SCALE}
              aria-label="放大"
            >
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={resetZoom}
              className={controlClassName}
              aria-label="还原"
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
            </button>
            {currentSrc ? (
              <a
                href={currentSrc}
                target="_blank"
                rel="noreferrer"
                className={controlClassName}
                aria-label="新窗口打开"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className={controlClassName}
              aria-label="关闭"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-6">
          {currentSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentSrc}
              alt={currentImage.alt ?? ""}
              className="max-h-[80vh] max-w-[92vw] object-contain select-none"
              style={{ transform: `scale(${scale})` }}
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <div className="text-sm text-white/70">图片加载失败</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- ImagePreviewGallery (unchanged public API) ----------

type ImagePreviewGalleryProps = {
  images: ImagePreviewItem[];
  className?: string;
  itemClassName?: string;
  imageClassName?: string;
};

export function ImagePreviewGallery({
  images,
  className,
  itemClassName,
  imageClassName,
}: ImagePreviewGalleryProps) {
  const normalizedImages = useMemo(
    () =>
      images.filter((image): image is ImagePreviewItem =>
        Boolean(image && image.src && image.src.trim()),
      ),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const openAt = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const close = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || normalizedImages.length === 0) return current;
      return (current + 1) % normalizedImages.length;
    });
  }, [normalizedImages.length]);

  const goPrev = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || normalizedImages.length === 0) return current;
      return (current - 1 + normalizedImages.length) % normalizedImages.length;
    });
  }, [normalizedImages.length]);

  if (normalizedImages.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={cn("columns-1 gap-x-6 sm:columns-2 lg:columns-3", className)}
      >
        {normalizedImages.map((image, index) => (
          <button
            type="button"
            key={`${image.src}-${index}`}
            onClick={() => openAt(index)}
            className={cn(
              "group relative mb-6 w-full break-inside-avoid rounded-lg text-left",
              itemClassName,
            )}
            aria-label={`预览图片 ${index + 1}`}
          >
            <QiniuImage
              src={image.src}
              alt={image.alt ?? ""}
              className={cn(
                "h-auto w-full rounded-lg object-contain transition duration-300 group-hover:opacity-90",
                imageClassName,
              )}
              loading="lazy"
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-slate-900/0 text-white opacity-0 transition group-hover:bg-slate-900/20 group-hover:opacity-100">
              <ZoomIn className="h-5 w-5" aria-hidden="true" />
              <span className="sr-only">预览</span>
            </span>
          </button>
        ))}
      </div>

      <ImageLightbox
        images={normalizedImages}
        activeIndex={activeIndex}
        onClose={close}
        onNext={goNext}
        onPrev={goPrev}
      />
    </>
  );
}

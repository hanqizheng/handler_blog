"use client";

import React, { useCallback, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  ImageLightbox,
  type ImagePreviewItem,
} from "@/components/image-preview";
import { QiniuImage } from "@/components/qiniu-image";
import { VideoEmbed } from "@/components/video-embed";
import { remarkHighlight } from "@/utils/remark-highlight";
import { resolveVideoEmbed } from "@/utils/video";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

const IMAGE_RE = /!\[([^\]]*)]\(([^)]+)\)/g;

function extractImages(markdown: string): ImagePreviewItem[] {
  const items: ImagePreviewItem[] = [];
  let match: RegExpExecArray | null;
  while ((match = IMAGE_RE.exec(markdown)) !== null) {
    const alt = match[1];
    const src = match[2];
    if (src) {
      items.push({ src, alt: alt || undefined });
    }
  }
  return items;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const images = useMemo(() => extractImages(content), [content]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);
  const goNext = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || images.length === 0) return current;
      return (current + 1) % images.length;
    });
  }, [images.length]);
  const goPrev = useCallback(() => {
    setActiveIndex((current) => {
      if (current === null || images.length === 0) return current;
      return (current - 1 + images.length) % images.length;
    });
  }, [images.length]);

  const classes = ["markdown-theme", className].filter(Boolean).join(" ");

  return (
    <>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkHighlight]}
        className={classes}
        components={{
          p: ({ children, ...props }) => {
            const normalizedChildren = React.Children.toArray(children).filter(
              (child) =>
                !(typeof child === "string" && child.trim().length === 0),
            );

            if (normalizedChildren.length === 1) {
              const onlyChild = normalizedChildren[0];
              if (
                React.isValidElement<{ href?: string }>(onlyChild) &&
                onlyChild.type === "a" &&
                typeof onlyChild.props?.href === "string"
              ) {
                const embed = resolveVideoEmbed(onlyChild.props.href);
                if (embed) {
                  return <VideoEmbed embed={embed} />;
                }
              }
            }

            return <p {...props}>{children}</p>;
          },
          img: ({ src, alt, ...props }) => {
            const safeSrc = typeof src === "string" ? src : undefined;
            const imageIndex = safeSrc
              ? images.findIndex((img) => img.src === safeSrc)
              : -1;

            return (
              <QiniuImage
                src={safeSrc}
                alt={alt ?? ""}
                {...props}
                className="cursor-pointer"
                onClick={
                  imageIndex >= 0 ? () => setActiveIndex(imageIndex) : undefined
                }
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>

      <ImageLightbox
        images={images}
        activeIndex={activeIndex}
        onClose={close}
        onNext={goNext}
        onPrev={goPrev}
      />
    </>
  );
}

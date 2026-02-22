import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { VideoEmbed } from "@/components/video-embed";
import { remarkHighlight } from "@/utils/remark-highlight";
import { resolveVideoEmbed } from "@/utils/video";
import { QiniuImage } from "@/components/qiniu-image";

type MarkdownRendererProps = {
  content: string;
  className?: string;
};

export function MarkdownRenderer({
  content,
  className,
}: MarkdownRendererProps) {
  const classes = ["markdown-theme", className].filter(Boolean).join(" ");

  return (
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
          return <QiniuImage src={safeSrc} alt={alt ?? ""} {...props} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

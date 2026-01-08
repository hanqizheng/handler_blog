import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkHighlight } from "@/utils/remark-highlight";
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

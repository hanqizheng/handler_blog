import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { remarkHighlight } from "@/utils/remark-highlight";

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
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkHighlight]} className={classes}>
      {content}
    </ReactMarkdown>
  );
}

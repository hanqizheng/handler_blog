import React from "react";

import type { RenderElementProps, RenderLeafProps } from "slate-react";

import { getImageUrl } from "@/utils/image";

import type { MarkdownElement, MarkdownText } from "./type";

export const Element: React.FC<RenderElementProps> = ({
  attributes,
  children,
  element,
}) => {
  const currentElement = element as MarkdownElement;

  switch (currentElement.type) {
    case "heading-one":
      return (
        <h1 className="text-2xl font-semibold" {...attributes}>
          {children}
        </h1>
      );
    case "heading-two":
      return (
        <h2 className="text-xl font-semibold" {...attributes}>
          {children}
        </h2>
      );
    case "heading-three":
      return (
        <h3 className="text-lg font-semibold" {...attributes}>
          {children}
        </h3>
      );
    case "heading-four":
      return (
        <h4 className="text-base font-semibold" {...attributes}>
          {children}
        </h4>
      );
    case "heading-five":
      return (
        <h5 className="text-sm font-semibold" {...attributes}>
          {children}
        </h5>
      );
    case "heading-six":
      return (
        <h6 className="text-sm font-semibold" {...attributes}>
          {children}
        </h6>
      );
    case "bulleted-list":
      return (
        <ul className="list-disc space-y-1 pl-5" {...attributes}>
          {children}
        </ul>
      );
    case "numbered-list":
      return (
        <ol className="list-decimal space-y-1 pl-5" {...attributes}>
          {children}
        </ol>
      );
    case "list-item":
      return (
        <li className="pl-1" {...attributes}>
          {children}
        </li>
      );
    case "block-quote":
      return (
        <blockquote
          className="border-l-4 border-slate-200 pl-4 text-slate-600"
          {...attributes}
        >
          {children}
        </blockquote>
      );
    case "code-block":
      return (
        <pre
          className="rounded-md bg-slate-950/90 p-3 text-sm text-slate-100"
          {...attributes}
        >
          <code>{children}</code>
        </pre>
      );
    case "image":
      return (
        <div className="my-3" {...attributes}>
          <div contentEditable={false}>
            <img
              src={getImageUrl(currentElement.url)}
              alt={currentElement.alt ?? ""}
              className="max-w-full rounded-md border border-slate-200"
            />
          </div>
          {children}
        </div>
      );
    case "paragraph":
    default:
      return (
        <p className="leading-7" {...attributes}>
          {children}
        </p>
      );
  }
};

export const Leaf: React.FC<RenderLeafProps> = ({
  attributes,
  children,
  leaf,
}) => {
  const currentLeaf = leaf as MarkdownText;

  let content = children;

  if (currentLeaf.bold) {
    content = <strong>{content}</strong>;
  }

  if (currentLeaf.italic) {
    content = <em>{content}</em>;
  }

  if (currentLeaf.code) {
    content = (
      <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">
        {content}
      </code>
    );
  }

  if (currentLeaf.highlight) {
    content = <mark className="rounded bg-yellow-100 px-1">{content}</mark>;
  }

  return <span {...attributes}>{content}</span>;
};

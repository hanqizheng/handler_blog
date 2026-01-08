import type { Descendant, Element as SlateElement } from "slate";
import { Element, Text } from "slate";

import type { MarkdownElement, MarkdownText } from "./type";

const DEFAULT_VALUE: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  } as unknown as Descendant,
];

/**
 * Convert Slate nodes to Markdown string
 */
export const serializeToMarkdown = (nodes: Descendant[]): string => {
  return nodes.map((node) => serializeNode(node)).join("\n");
};

const serializeNode = (node: Descendant): string => {
  if (Text.isText(node)) {
    return serializeText(node as unknown as MarkdownText);
  }

  if (Element.isElement(node)) {
    return serializeElement(node as unknown as MarkdownElement);
  }

  return "";
};

const serializeText = (node: MarkdownText): string => {
  let text = node.text;

  if (node.code) {
    text = `\`${text}\``;
  }
  if (node.bold) {
    text = `**${text}**`;
  }
  if (node.italic) {
    text = `*${text}*`;
  }
  if (node.highlight) {
    text = `==${text}==`;
  }

  return text;
};

const serializeElement = (element: MarkdownElement): string => {
  const childrenText = element.children
    .map((child) => serializeNode(child))
    .join("");

  switch (element.type) {
    case "image":
      return `![${element.alt ?? ""}](${element.url ?? ""})`;
    case "heading-one":
      return `# ${childrenText}`;
    case "heading-two":
      return `## ${childrenText}`;
    case "heading-three":
      return `### ${childrenText}`;
    case "heading-four":
      return `#### ${childrenText}`;
    case "heading-five":
      return `##### ${childrenText}`;
    case "heading-six":
      return `###### ${childrenText}`;
    case "bulleted-list":
      return element.children.map((child) => serializeNode(child)).join("\n");
    case "numbered-list":
      return element.children
        .map((child, index) => {
          const itemText = serializeNode(child);
          // For numbered lists, replace the "- " with "N. "
          if (itemText.startsWith("- ")) {
            return `${index + 1}. ${itemText.slice(2)}`;
          }
          return `${index + 1}. ${itemText}`;
        })
        .join("\n");
    case "list-item":
      return `- ${childrenText}`;
    case "block-quote":
      return `> ${childrenText}`;
    case "code-block":
      return `\`\`\`\n${childrenText}\n\`\`\``;
    case "paragraph":
    default:
      return childrenText;
  }
};

/**
 * Parse Markdown string to Slate nodes
 */
export const deserializeFromMarkdown = (markdown?: string): Descendant[] => {
  if (!markdown || markdown.trim().length === 0) {
    return DEFAULT_VALUE;
  }

  const lines = markdown.split("\n");
  const nodes: MarkdownElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push({
        type: "code-block",
        children: [{ text: codeLines.join("\n") }] as unknown as Descendant[],
      });
      i++;
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const typeMap: Record<number, MarkdownElement["type"]> = {
        1: "heading-one",
        2: "heading-two",
        3: "heading-three",
        4: "heading-four",
        5: "heading-five",
        6: "heading-six",
      };
      nodes.push({
        type: typeMap[level] || "heading-one",
        children: parseInlineMarkdown(text) as unknown as Descendant[],
      });
      i++;
      continue;
    }

    // Image
    const imageMatch = trimmedLine.match(/^!\[(.*?)\]\((.+?)\)$/);
    if (imageMatch) {
      nodes.push({
        type: "image",
        url: imageMatch[2],
        alt: imageMatch[1],
        children: [{ text: "" }] as unknown as Descendant[],
      });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      nodes.push({
        type: "block-quote",
        children: parseInlineMarkdown(line.slice(2)) as unknown as Descendant[],
      });
      i++;
      continue;
    }

    // Numbered list
    const numberedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numberedMatch) {
      const listItems: MarkdownElement[] = [];
      while (i < lines.length) {
        const currentLine = lines[i];
        const itemMatch = currentLine.match(/^(\d+)\.\s+(.*)$/);
        if (!itemMatch) break;
        listItems.push({
          type: "list-item",
          children: parseInlineMarkdown(
            itemMatch[2],
          ) as unknown as Descendant[],
        });
        i++;
      }
      nodes.push({
        type: "numbered-list",
        children: listItems as unknown as Descendant[],
      });
      continue;
    }

    // Bulleted list
    if (line.match(/^[-*+]\s+/)) {
      const listItems: MarkdownElement[] = [];
      while (i < lines.length) {
        const currentLine = lines[i];
        const itemMatch = currentLine.match(/^[-*+]\s+(.*)$/);
        if (!itemMatch) break;
        listItems.push({
          type: "list-item",
          children: parseInlineMarkdown(
            itemMatch[1],
          ) as unknown as Descendant[],
        });
        i++;
      }
      nodes.push({
        type: "bulleted-list",
        children: listItems as unknown as Descendant[],
      });
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    nodes.push({
      type: "paragraph",
      children: parseInlineMarkdown(line) as unknown as Descendant[],
    });
    i++;
  }

  return nodes.length > 0 ? (nodes as unknown as Descendant[]) : DEFAULT_VALUE;
};

/**
 * Parse inline markdown (bold, italic, code)
 */
const parseInlineMarkdown = (text: string): MarkdownText[] => {
  if (!text) {
    return [{ text: "" }];
  }

  const result: MarkdownText[] = [];

  // Simple regex-based parsing for bold, italic, and code
  // Note: This is a simplified parser that handles basic cases
  let lastIndex = 0;
  const matches: Array<{
    start: number;
    end: number;
    text: string;
    marks: Partial<MarkdownText>;
  }> = [];

  // Find bold patterns first (they take precedence)
  let match;
  const boldRegex = /\*\*(.+?)\*\*/g;
  while ((match = boldRegex.exec(text)) !== null) {
    matches.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[1],
      marks: { bold: true },
    });
  }

  // Find italic patterns (that don't overlap with bold)
  const italicRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
  while ((match = italicRegex.exec(text)) !== null) {
    const overlaps = matches.some(
      (m) =>
        (match!.index >= m.start && match!.index < m.end) ||
        (match!.index + match![0].length > m.start &&
          match!.index + match![0].length <= m.end),
    );
    if (!overlaps) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        marks: { italic: true },
      });
    }
  }

  // Find code patterns
  const codeRegex = /`(.+?)`/g;
  while ((match = codeRegex.exec(text)) !== null) {
    const overlaps = matches.some(
      (m) =>
        (match!.index >= m.start && match!.index < m.end) ||
        (match!.index + match![0].length > m.start &&
          match!.index + match![0].length <= m.end),
    );
    if (!overlaps) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        marks: { code: true },
      });
    }
  }

  // Find highlight patterns ==text==
  const highlightRegex = /==(.+?)==/g;
  while ((match = highlightRegex.exec(text)) !== null) {
    const overlaps = matches.some(
      (m) =>
        (match!.index >= m.start && match!.index < m.end) ||
        (match!.index + match![0].length > m.start &&
          match!.index + match![0].length <= m.end),
    );
    if (!overlaps) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        text: match[1],
        marks: { highlight: true },
      });
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start);

  // Build result
  for (const m of matches) {
    // Add text before this match
    if (m.start > lastIndex) {
      result.push({ text: text.slice(lastIndex, m.start) });
    }
    // Add the matched text with marks
    result.push({ text: m.text, ...m.marks });
    lastIndex = m.end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    result.push({ text: text.slice(lastIndex) });
  }

  return result.length > 0 ? result : [{ text: "" }];
};

/**
 * Check if the editor value is empty
 */
export const isEditorEmpty = (nodes: Descendant[]): boolean => {
  if (nodes.length === 0) return true;
  if (nodes.length === 1) {
    const node = nodes[0];
    if (Element.isElement(node)) {
      const element = node as unknown as MarkdownElement;
      if (element.type === "paragraph" && element.children.length === 1) {
        const child = element.children[0];
        if (
          Text.isText(child as SlateElement) &&
          (child as unknown as MarkdownText).text === ""
        ) {
          return true;
        }
      }
    }
  }
  return false;
};

export { DEFAULT_VALUE as DEFAULT_SLATE_VALUE };

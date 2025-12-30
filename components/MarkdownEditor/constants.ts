import type {
  MarkdownBlockType,
  MarkdownTextMark,
  ToolbarItemConfig,
} from "./type";

export interface HeadingOption {
  key: MarkdownBlockType;
  label: string;
}

export const HEADING_OPTIONS: HeadingOption[] = [
  { key: "paragraph", label: "正文" },
  { key: "heading-one", label: "标题 1" },
  { key: "heading-two", label: "标题 2" },
  { key: "heading-three", label: "标题 3" },
  { key: "heading-four", label: "标题 4" },
];

export const DEFAULT_TOOLBAR_ITEMS: ToolbarItemConfig[] = [
  "undo",
  "redo",
  "divider",
  "heading",
  "divider",
  "bold",
  "italic",
  "highlight",
  "divider",
  "orderedList",
  "unorderedList",
  "blockquote",
];

export const LIST_TYPES: MarkdownBlockType[] = [
  "numbered-list",
  "bulleted-list",
];

export const HOTKEYS: Record<string, MarkdownTextMark> = {
  "mod+b": "bold",
  "mod+i": "italic",
  "mod+h": "highlight",
};

// Markdown shortcut patterns
export const MARKDOWN_SHORTCUTS: Record<string, MarkdownBlockType> = {
  "#": "heading-one",
  "##": "heading-two",
  "###": "heading-three",
  "####": "heading-four",
  "#####": "heading-five",
  "######": "heading-six",
  "*": "bulleted-list",
  "-": "bulleted-list",
  "+": "bulleted-list",
  ">": "block-quote",
  "```": "code-block",
};

// Numbered list pattern: 1. 2. etc.
export const NUMBERED_LIST_PATTERN = /^(\d+)\.\s*$/;

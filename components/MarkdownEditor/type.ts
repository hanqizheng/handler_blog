import type { CSSProperties, ReactNode } from "react";

import type { BaseEditor, Descendant } from "slate";
import type { HistoryEditor } from "slate-history";
import type { ReactEditor } from "slate-react";

/**
 * MarkdownEditor component properties
 *
 * A WYSIWYG markdown editor with real-time markdown shortcuts support.
 * Type `# ` to create a heading, `* ` or `- ` for bullet lists, etc.
 */
export interface MarkdownEditorProps {
  /**
   * Current markdown value (controlled mode)
   * Plain markdown string format
   */
  value?: string;

  /**
   * Default markdown value (uncontrolled mode)
   * Plain markdown string format
   */
  defaultValue?: string;

  /**
   * Callback fired when markdown content changes
   * @param value - Updated markdown string
   */
  onChange?: (value: string) => void;

  /**
   * Placeholder text shown when editor is empty
   * @default Translated from locale
   */
  placeholder?: string;

  /**
   * Whether the editor is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Custom class name for the container
   */
  className?: string;

  /**
   * Custom inline styles for the container
   */
  style?: CSSProperties;

  /**
   * Whether to enable read-only mode
   * @default false
   */
  readOnly?: boolean;

  /**
   * Toolbar items configuration
   * @default DEFAULT_TOOLBAR_ITEMS
   */
  toolbarItems?: ToolbarItemConfig[];

  /**
   * Image upload configuration
   */
  imageUpload?: {
    enabled?: boolean;
    pathPrefix?: string;
    maxFileSize?: number;
    maxFileSizeByType?: Record<string, number>;
    allowedTypes?: string[];
    deferUpload?: boolean;
  };
}

/**
 * Ref methods exposed by MarkdownEditor
 */
export interface MarkdownEditorRef {
  /**
   * Get current markdown content
   */
  getMarkdown: () => string;

  /**
   * Set markdown content programmatically
   */
  setMarkdown: (markdown: string) => void;

  /**
   * Focus the editor
   */
  focus: () => void;

  /**
   * Get pending images queued for upload
   */
  getPendingImages: () => Array<{ url: string; file: File }>;

  /**
   * Remove pending images by URL
   */
  removePendingImages: (urls: string[]) => void;
}

// Slate types for MarkdownEditor (local types, not module augmentation to avoid conflict with RichTextEditor)
export type MarkdownBlockType =
  | "paragraph"
  | "heading-one"
  | "heading-two"
  | "heading-three"
  | "heading-four"
  | "heading-five"
  | "heading-six"
  | "bulleted-list"
  | "numbered-list"
  | "list-item"
  | "block-quote"
  | "code-block"
  | "image";

export type MarkdownTextMark = "bold" | "italic" | "code" | "highlight";

export interface MarkdownText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
  highlight?: boolean;
}

export interface MarkdownElement {
  type: MarkdownBlockType;
  url?: string;
  alt?: string;
  children: Descendant[];
}

export type MarkdownEditorType = BaseEditor & ReactEditor & HistoryEditor;

// Toolbar types
export type BuiltinToolbarItem =
  | "undo"
  | "redo"
  | "heading"
  | "bold"
  | "italic"
  | "highlight"
  | "orderedList"
  | "unorderedList"
  | "blockquote"
  | "image";

export interface CustomToolbarItem {
  key: string;
  render: (context: ToolbarRenderContext) => ReactNode;
}

export type ToolbarItemConfig =
  | BuiltinToolbarItem
  | "divider"
  | CustomToolbarItem;

export interface ToolbarRenderContext {
  disabled?: boolean;
  onRequestImageUpload?: () => void;
}

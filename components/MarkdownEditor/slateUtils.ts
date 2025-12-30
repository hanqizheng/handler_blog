import {
  Editor,
  Point,
  Range,
  Element as SlateElement,
  Transforms,
} from "slate";
import type { Element, Node } from "slate";

import {
  LIST_TYPES,
  MARKDOWN_SHORTCUTS,
  NUMBERED_LIST_PATTERN,
} from "./constants";
import type {
  MarkdownBlockType,
  MarkdownElement,
  MarkdownTextMark,
} from "./type";

/**
 * Check if a node is a MarkdownElement
 */
export const isMarkdownElement = (node: Node): boolean =>
  SlateElement.isElement(node) &&
  Object.prototype.hasOwnProperty.call(node, "type");

/**
 * Check if a block type is currently active
 */
export const isBlockActive = (
  editor: Editor,
  format: MarkdownBlockType,
): boolean => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Editor.nodes(editor, {
    at: selection,
    match: (n) => {
      if (!SlateElement.isElement(n)) return false;
      const el = n as unknown as MarkdownElement;
      return el.type === format;
    },
  });

  return Boolean(match);
};

/**
 * Check if a text mark is currently active
 */
export const isMarkActive = (
  editor: Editor,
  format: MarkdownTextMark,
): boolean => {
  const marks = Editor.marks(editor) as Record<string, boolean> | null;
  return marks ? Boolean(marks[format]) : false;
};

/**
 * Toggle a text mark on/off
 */
export const toggleMark = (editor: Editor, format: MarkdownTextMark): void => {
  if (isMarkActive(editor, format)) {
    Editor.removeMark(editor, format);
  } else {
    Editor.addMark(editor, format, true);
  }
};

/**
 * Toggle a block type on/off
 */
export const toggleBlock = (
  editor: Editor,
  format: MarkdownBlockType,
): void => {
  const isActive = isBlockActive(editor, format);
  const isList = LIST_TYPES.includes(format);

  // Unwrap any existing list wrappers
  Transforms.unwrapNodes(editor, {
    match: (n) => {
      if (!SlateElement.isElement(n)) return false;
      const el = n as unknown as MarkdownElement;
      return LIST_TYPES.includes(el.type);
    },
    split: true,
  });

  // Determine the new type
  const newType: MarkdownBlockType = isActive
    ? "paragraph"
    : isList
      ? "list-item"
      : format;

  Transforms.setNodes(editor, { type: newType } as Partial<Element>, {
    match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
  });

  // If activating a list, wrap in list container
  if (!isActive && isList) {
    const block = {
      type: format,
      children: [],
    } as Element;
    Transforms.wrapNodes(editor, block, {
      match: (n) => {
        if (!SlateElement.isElement(n)) return false;
        const el = n as unknown as MarkdownElement;
        return el.type === "list-item";
      },
    });
  }
};

/**
 * Handle markdown shortcuts on space key
 * Returns true if a shortcut was applied
 */
export const handleMarkdownShortcuts = (editor: Editor): boolean => {
  const { selection } = editor;
  if (!selection || !Range.isCollapsed(selection)) return false;

  const { anchor } = selection;
  const block = Editor.above(editor, {
    match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
  });

  if (!block) return false;

  const [, path] = block;
  const start = Editor.start(editor, path);
  const range = { anchor, focus: start };
  const beforeText = Editor.string(editor, range);

  // Check for numbered list pattern (1. 2. etc.)
  if (NUMBERED_LIST_PATTERN.test(beforeText + " ")) {
    // Select and delete the shortcut text
    Transforms.select(editor, range);
    Transforms.delete(editor);

    // Apply numbered list
    const isList = isBlockActive(editor, "numbered-list");
    if (!isList) {
      Transforms.setNodes(editor, { type: "list-item" } as Partial<Element>, {
        match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      });
      const block = {
        type: "numbered-list" as MarkdownBlockType,
        children: [],
      } as Element;
      Transforms.wrapNodes(editor, block, {
        match: (n) => {
          if (!SlateElement.isElement(n)) return false;
          const el = n as unknown as MarkdownElement;
          return el.type === "list-item";
        },
      });
    }
    return true;
  }

  // Check for other markdown shortcuts
  const shortcutType = MARKDOWN_SHORTCUTS[beforeText];
  if (shortcutType) {
    // Select and delete the shortcut text
    Transforms.select(editor, range);
    Transforms.delete(editor);

    // Apply the block type
    const isList = LIST_TYPES.includes(shortcutType);

    if (isList) {
      const isListActive = isBlockActive(editor, shortcutType);
      if (!isListActive) {
        Transforms.setNodes(editor, { type: "list-item" } as Partial<Element>, {
          match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
        });
        const block = {
          type: shortcutType,
          children: [],
        } as Element;
        Transforms.wrapNodes(editor, block, {
          match: (n) => {
            if (!SlateElement.isElement(n)) return false;
            const el = n as unknown as MarkdownElement;
            return el.type === "list-item";
          },
        });
      }
    } else {
      Transforms.setNodes(editor, { type: shortcutType } as Partial<Element>, {
        match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
      });
    }

    return true;
  }

  return false;
};

/**
 * Handle backspace at the start of a block to reset it to paragraph
 */
export const handleBackspaceAtBlockStart = (editor: Editor): boolean => {
  const { selection } = editor;
  if (!selection || !Range.isCollapsed(selection)) return false;

  const match = Editor.above(editor, {
    match: (n) => SlateElement.isElement(n) && Editor.isBlock(editor, n),
  });

  if (!match) return false;

  const [block, path] = match;
  const start = Editor.start(editor, path);

  // Check if cursor is at the start of the block
  if (!Point.equals(selection.anchor, start)) return false;

  const element = block as unknown as MarkdownElement;

  // If it's a list item, unwrap from list
  if (element.type === "list-item") {
    Transforms.unwrapNodes(editor, {
      match: (n) => {
        if (!SlateElement.isElement(n)) return false;
        const el = n as unknown as MarkdownElement;
        return LIST_TYPES.includes(el.type);
      },
      split: true,
    });
    Transforms.setNodes(editor, { type: "paragraph" } as Partial<Element>);
    return true;
  }

  // If it's not a paragraph, convert to paragraph
  if (element.type !== "paragraph") {
    Transforms.setNodes(editor, { type: "paragraph" } as Partial<Element>);
    return true;
  }

  return false;
};

/**
 * Handle Enter key in lists to create new list items or exit list
 */
export const handleEnterInList = (editor: Editor): boolean => {
  const { selection } = editor;
  if (!selection || !Range.isCollapsed(selection)) return false;

  const match = Editor.above(editor, {
    match: (n) => {
      if (!SlateElement.isElement(n)) return false;
      const el = n as unknown as MarkdownElement;
      return el.type === "list-item";
    },
  });

  if (!match) return false;

  const [, path] = match;

  // Check if the list item is empty
  const text = Editor.string(editor, path);
  if (text === "") {
    // Exit the list
    Transforms.unwrapNodes(editor, {
      match: (n) => {
        if (!SlateElement.isElement(n)) return false;
        const el = n as unknown as MarkdownElement;
        return LIST_TYPES.includes(el.type);
      },
      split: true,
    });
    Transforms.setNodes(editor, { type: "paragraph" } as Partial<Element>);
    return true;
  }

  return false;
};

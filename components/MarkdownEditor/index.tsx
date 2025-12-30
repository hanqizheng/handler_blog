"use client";

import React, {
  type CSSProperties,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

import isHotkey from "is-hotkey";
import type { Descendant, Editor } from "slate";
import { Transforms, createEditor } from "slate";
import { withHistory } from "slate-history";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";

import { cn } from "@/lib/utils";

import { MarkdownToolbar } from "./Toolbar";
import { DEFAULT_TOOLBAR_ITEMS, HOTKEYS } from "./constants";
import { useControllableValue } from "./hooks/useControllableValue";
import { Element, Leaf } from "./renderers";
import {
  DEFAULT_SLATE_VALUE,
  deserializeFromMarkdown,
  isEditorEmpty,
  serializeToMarkdown,
} from "./serializer";
import {
  handleBackspaceAtBlockStart,
  handleEnterInList,
  handleMarkdownShortcuts,
  toggleMark,
} from "./slateUtils";
import type {
  MarkdownEditorProps,
  MarkdownEditorRef,
  MarkdownTextMark,
} from "./type";

const DEFAULT_EDITOR_MIN_HEIGHT = 320;

export const MarkdownEditor = React.forwardRef<
  MarkdownEditorRef,
  MarkdownEditorProps
>((props, ref) => {
  const {
    value,
    defaultValue,
    onChange,
    placeholder,
    disabled = false,
    readOnly = false,
    className,
    style,
    toolbarItems = DEFAULT_TOOLBAR_ITEMS,
  } = props;

  const editor = useMemo<Editor>(() => {
    return withHistory(withReact(createEditor()));
  }, []);

  const [markdownValue, setMarkdownValue] = useControllableValue<string>(
    value,
    defaultValue ?? "",
    onChange,
  );

  const [editorValue, setEditorValue] = useState<Descendant[]>(() =>
    deserializeFromMarkdown(markdownValue),
  );

  const lastSyncedMarkdownRef = useRef<string>(markdownValue);
  const [slateVersion, setSlateVersion] = useState(0);
  const editorMinHeightStyle = useMemo<CSSProperties>(
    () => ({ minHeight: DEFAULT_EDITOR_MIN_HEIGHT }),
    [],
  );

  const resolvedPlaceholder = placeholder ?? "开始编写 Markdown 内容";

  useEffect(() => {
    if (markdownValue === lastSyncedMarkdownRef.current) {
      return;
    }
    setEditorValue(deserializeFromMarkdown(markdownValue));
    lastSyncedMarkdownRef.current = markdownValue;
    setSlateVersion((prev) => prev + 1);
  }, [markdownValue]);

  const handleSlateChange = useCallback(
    (nextValue: Descendant[]) => {
      setEditorValue(nextValue);

      if (disabled || readOnly) {
        return;
      }

      const markdown = isEditorEmpty(nextValue)
        ? ""
        : serializeToMarkdown(nextValue);

      if (markdown === lastSyncedMarkdownRef.current) {
        return;
      }

      lastSyncedMarkdownRef.current = markdown;
      setMarkdownValue(markdown);
    },
    [disabled, readOnly, setMarkdownValue],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled || readOnly) {
        return;
      }

      if (event.key === " ") {
        if (handleMarkdownShortcuts(editor)) {
          event.preventDefault();
          return;
        }
      }

      if (event.key === "Enter" && !event.shiftKey) {
        if (handleEnterInList(editor)) {
          event.preventDefault();
          return;
        }
      }

      if (event.key === "Backspace") {
        if (handleBackspaceAtBlockStart(editor)) {
          event.preventDefault();
          return;
        }
      }

      for (const hotkey of Object.keys(HOTKEYS)) {
        if (isHotkey(hotkey, event.nativeEvent)) {
          event.preventDefault();
          toggleMark(editor, HOTKEYS[hotkey] as MarkdownTextMark);
          return;
        }
      }
    },
    [disabled, editor, readOnly],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      if (disabled || readOnly) {
        return;
      }

      const text = event.clipboardData.getData("text/plain");
      if (!text) {
        return;
      }

      const hasMarkdownPatterns =
        /^#{1,6}\s/.test(text) ||
        /^\d+\.\s/.test(text) ||
        /^[-*+]\s/.test(text) ||
        /^>\s/.test(text) ||
        /^```/.test(text) ||
        /\*\*[^*]+\*\*/.test(text) ||
        /(?<!\*)\*(?!\*)[^*]+(?<!\*)\*(?!\*)/.test(text) ||
        /`[^`]+`/.test(text) ||
        /==[^=]+==/.test(text);

      if (hasMarkdownPatterns) {
        event.preventDefault();

        const nodes = deserializeFromMarkdown(text);
        Transforms.insertFragment(editor, nodes);
      }
    },
    [disabled, editor, readOnly],
  );

  useImperativeHandle(
    ref,
    () => ({
      getMarkdown: () => {
        return isEditorEmpty(editorValue)
          ? ""
          : serializeToMarkdown(editorValue);
      },
      setMarkdown: (markdown: string) => {
        const newValue = deserializeFromMarkdown(markdown);
        setEditorValue(newValue);
        lastSyncedMarkdownRef.current = markdown;
        setMarkdownValue(markdown);
        setSlateVersion((prev) => prev + 1);
      },
      focus: () => {
        ReactEditor.focus(editor);
      },
    }),
    [editorValue, editor, setMarkdownValue],
  );

  const renderElement = useCallback(
    (props: Parameters<typeof Element>[0]) => <Element {...props} />,
    [],
  );

  const renderLeaf = useCallback(
    (props: Parameters<typeof Leaf>[0]) => <Leaf {...props} />,
    [],
  );

  const toolbarContext = useMemo(
    () => ({
      disabled: disabled || readOnly,
    }),
    [disabled, readOnly],
  );

  const slateValue = editorValue ?? DEFAULT_SLATE_VALUE;

  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-slate-200 bg-white p-4",
        (disabled || readOnly) && "opacity-70",
        className,
      )}
      style={style}
    >
      <Slate
        key={slateVersion}
        editor={editor}
        initialValue={slateValue}
        onChange={handleSlateChange}
      >
        {!readOnly && (
          <MarkdownToolbar items={toolbarItems} context={toolbarContext} />
        )}
        <Editable
          className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 focus:outline-none"
          style={editorMinHeightStyle}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder={resolvedPlaceholder}
          readOnly={disabled || readOnly}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
        />
      </Slate>
    </div>
  );
});

MarkdownEditor.displayName = "MarkdownEditor";

export default MarkdownEditor;

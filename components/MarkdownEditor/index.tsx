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
import type { Descendant, Range } from "slate";
import { Editor, Transforms, createEditor } from "slate";
import { withHistory } from "slate-history";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";

import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast";
import {
  DEFAULT_MAX_FILE_SIZE,
  compressImageIfNeeded,
  isTypeAllowed,
  resolveFileSizeLimit,
  useQiniuUpload,
} from "@/hooks/useQiniuUpload-sdk";

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
  MarkdownEditorType,
  MarkdownElement,
  MarkdownTextMark,
} from "./type";

const DEFAULT_EDITOR_MIN_HEIGHT = 320;
const DEFAULT_IMAGE_ALLOWED_TYPES = ["image/*"];

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
    imageUpload,
  } = props;

  const editor = useMemo<MarkdownEditorType>(() => {
    const baseEditor = withHistory(withReact(createEditor()));
    const { isVoid } = baseEditor;
    baseEditor.isVoid = (element) => {
      return element.type === "image" ? true : isVoid(element);
    };
    return baseEditor as MarkdownEditorType;
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
  const lastSelectionRef = useRef<Range | null>(null);
  const [slateVersion, setSlateVersion] = useState(0);
  const editorMinHeightStyle = useMemo<CSSProperties>(
    () => ({ minHeight: DEFAULT_EDITOR_MIN_HEIGHT }),
    [],
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImagesRef = useRef<Map<string, File>>(new Map());

  const imageUploadEnabled = imageUpload?.enabled ?? true;
  const deferUpload = imageUpload?.deferUpload ?? false;
  const { uploadFile } = useQiniuUpload({
    maxFileSize: imageUpload?.maxFileSize,
    maxFileSizeByType: imageUpload?.maxFileSizeByType,
    allowedTypes: imageUpload?.allowedTypes ?? DEFAULT_IMAGE_ALLOWED_TYPES,
    pathPrefix: imageUpload?.pathPrefix ?? "markdown",
  });

  const resolvedPlaceholder = placeholder ?? "开始编写 Markdown 内容";

  useEffect(() => {
    if (markdownValue === lastSyncedMarkdownRef.current) {
      return;
    }
    // Sync external controlled value into Slate state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditorValue(deserializeFromMarkdown(markdownValue));
    lastSyncedMarkdownRef.current = markdownValue;
    setSlateVersion((prev) => prev + 1);
  }, [markdownValue]);

  useEffect(() => {
    const pendingImages = pendingImagesRef.current;
    return () => {
      pendingImages.forEach((_, url) => {
        URL.revokeObjectURL(url);
      });
      pendingImages.clear();
    };
  }, []);

  const handleSlateChange = useCallback(
    (nextValue: Descendant[]) => {
      setEditorValue(nextValue);
      lastSelectionRef.current = editor.selection;

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
    [disabled, editor.selection, readOnly, setMarkdownValue],
  );

  const insertImageFiles = useCallback(
    async (files: File[]) => {
      if (disabled || readOnly || !imageUploadEnabled) {
        return;
      }

      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        return;
      }

      if (!editor.selection && lastSelectionRef.current) {
        Transforms.select(editor, lastSelectionRef.current);
      }

      for (const rawFile of imageFiles) {
        const allowedTypes =
          imageUpload?.allowedTypes ?? DEFAULT_IMAGE_ALLOWED_TYPES;
        const maxFileSize = imageUpload?.maxFileSize ?? DEFAULT_MAX_FILE_SIZE;
        const maxFileSizeByType = imageUpload?.maxFileSizeByType;

        if (!isTypeAllowed(rawFile, allowedTypes)) {
          toast.error(`图片 ${rawFile.name} 类型不支持`);
          continue;
        }

        const sizeLimit = resolveFileSizeLimit(
          rawFile.type,
          maxFileSizeByType,
          maxFileSize,
        );

        const findImageEntry = (url: string) => {
          const [entry] = Editor.nodes(editor, {
            at: [],
            match: (n) =>
              !Editor.isEditor(n) &&
              "type" in n &&
              n.type === "image" &&
              (n as MarkdownElement).url === url,
          });
          return entry;
        };

        const blobUrl = URL.createObjectURL(rawFile);
        const imageNode: MarkdownElement = {
          type: "image",
          url: blobUrl,
          alt: rawFile.name,
          loading: true,
          children: [{ text: "" }],
        };
        Transforms.insertNodes(editor, imageNode);
        Transforms.insertNodes(editor, {
          type: "paragraph",
          children: [{ text: "" }],
        } satisfies MarkdownElement);

        if (deferUpload) {
          if (rawFile.size > sizeLimit) {
            try {
              const compressed = await compressImageIfNeeded(
                rawFile,
                sizeLimit,
              );
              if (compressed.size > sizeLimit) {
                const entry = findImageEntry(blobUrl);
                if (entry) {
                  Transforms.removeNodes(editor, { at: entry[1] });
                }
                URL.revokeObjectURL(blobUrl);
                toast.error(`图片 ${rawFile.name} 超过大小限制`);
                continue;
              }
              const newBlobUrl = URL.createObjectURL(compressed);
              pendingImagesRef.current.set(newBlobUrl, compressed);
              const entry = findImageEntry(blobUrl);
              if (entry) {
                Transforms.setNodes(
                  editor,
                  {
                    url: newBlobUrl,
                    loading: false,
                  } as Partial<MarkdownElement>,
                  { at: entry[1] },
                );
              }
              URL.revokeObjectURL(blobUrl);
            } catch {
              const entry = findImageEntry(blobUrl);
              if (entry) {
                Transforms.removeNodes(editor, { at: entry[1] });
              }
              URL.revokeObjectURL(blobUrl);
              toast.error(`图片 ${rawFile.name} 超过大小限制`);
              continue;
            }
          } else {
            pendingImagesRef.current.set(blobUrl, rawFile);
            const entry = findImageEntry(blobUrl);
            if (entry) {
              Transforms.setNodes(
                editor,
                { loading: false } as Partial<MarkdownElement>,
                { at: entry[1] },
              );
            }
          }
          continue;
        }

        try {
          let file = rawFile;
          if (file.size > sizeLimit) {
            file = await compressImageIfNeeded(file, sizeLimit);
            if (file.size > sizeLimit) {
              const entry = findImageEntry(blobUrl);
              if (entry) {
                Transforms.removeNodes(editor, { at: entry[1] });
              }
              URL.revokeObjectURL(blobUrl);
              toast.error(`图片 ${rawFile.name} 超过大小限制`);
              continue;
            }
          }
          const result = await uploadFile(file);
          const entry = findImageEntry(blobUrl);
          if (entry) {
            Transforms.setNodes(
              editor,
              { url: result.url, loading: false } as Partial<MarkdownElement>,
              { at: entry[1] },
            );
          }
          URL.revokeObjectURL(blobUrl);
        } catch (error) {
          const entry = findImageEntry(blobUrl);
          if (entry) {
            Transforms.removeNodes(editor, { at: entry[1] });
          }
          URL.revokeObjectURL(blobUrl);
          toast.error(
            `图片 ${rawFile.name} 上传失败: ${error instanceof Error ? error.message : "未知错误"}`,
          );
        }
      }
    },
    [
      disabled,
      editor,
      imageUpload,
      imageUploadEnabled,
      readOnly,
      uploadFile,
      deferUpload,
    ],
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

      if (imageUploadEnabled && event.clipboardData.files.length > 0) {
        const files = Array.from(event.clipboardData.files);
        const imageFiles = files.filter((file) =>
          file.type.startsWith("image/"),
        );

        if (imageFiles.length > 0) {
          event.preventDefault();
          void insertImageFiles(imageFiles);
          return;
        }
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
    [disabled, editor, imageUploadEnabled, insertImageFiles, readOnly],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled || readOnly || !imageUploadEnabled) {
        return;
      }

      const files = Array.from(event.dataTransfer.files ?? []);
      if (files.length === 0) {
        return;
      }

      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) {
        return;
      }

      event.preventDefault();
      const range = ReactEditor.findEventRange(editor, event);
      if (range) {
        Transforms.select(editor, range);
      }

      void insertImageFiles(imageFiles);
    },
    [disabled, editor, readOnly, imageUploadEnabled, insertImageFiles],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (disabled || readOnly || !imageUploadEnabled) {
        return;
      }

      if (event.dataTransfer.types?.includes("Files")) {
        event.preventDefault();
      }
    },
    [disabled, readOnly, imageUploadEnabled],
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
      getPendingImages: () => {
        return Array.from(pendingImagesRef.current.entries()).map(
          ([url, file]) => ({ url, file }),
        );
      },
      removePendingImages: (urls: string[]) => {
        urls.forEach((url) => {
          const file = pendingImagesRef.current.get(url);
          if (file) {
            URL.revokeObjectURL(url);
          }
          pendingImagesRef.current.delete(url);
        });
      },
      replaceImageUrls: (replacements: Map<string, string>) => {
        const imageEntries = Array.from(
          Editor.nodes(editor, {
            at: [],
            match: (n) =>
              !Editor.isEditor(n) &&
              "type" in n &&
              n.type === "image" &&
              typeof (n as MarkdownElement).url === "string" &&
              replacements.has((n as MarkdownElement).url!),
          }),
        );
        for (const [, path] of imageEntries) {
          const node = editor.children[path[0]] as MarkdownElement | undefined;
          const oldUrl = node?.url;
          if (oldUrl && replacements.has(oldUrl)) {
            Transforms.setNodes(
              editor,
              { url: replacements.get(oldUrl) } as Partial<MarkdownElement>,
              { at: path },
            );
          }
        }
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
      onRequestImageUpload:
        disabled || readOnly || !imageUploadEnabled
          ? undefined
          : () => fileInputRef.current?.click(),
    }),
    [disabled, readOnly, imageUploadEnabled],
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) {
              void insertImageFiles(files);
            }
            event.target.value = "";
          }}
        />
        <Editable
          className="rounded-md border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 focus:outline-none"
          style={editorMinHeightStyle}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder={resolvedPlaceholder}
          readOnly={disabled || readOnly}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />
      </Slate>
    </div>
  );
});

MarkdownEditor.displayName = "MarkdownEditor";

export type { MarkdownEditorProps, MarkdownEditorRef } from "./type";

export default MarkdownEditor;

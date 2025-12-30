import type { MouseEventHandler, ReactNode } from "react";
import React, { useCallback, useMemo, useState } from "react";

import type { Editor } from "slate";
import { useSlate } from "slate-react";
import {
  Bold,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

import { HEADING_OPTIONS } from "./constants";
import {
  isBlockActive,
  isMarkActive,
  toggleBlock,
  toggleMark,
} from "./slateUtils";
import type {
  BuiltinToolbarItem,
  MarkdownBlockType,
  MarkdownTextMark,
  ToolbarItemConfig,
  ToolbarRenderContext,
} from "./type";

interface ToolbarButtonProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onMouseDown?: MouseEventHandler<HTMLButtonElement>;
}

export const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  icon,
  label,
  active,
  disabled,
  onMouseDown,
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className={cn(active && "bg-slate-100")}
    title={label}
    aria-label={label}
    disabled={disabled}
    onMouseDown={onMouseDown}
  >
    {icon}
  </Button>
);

export const ToolbarDivider: React.FC = () => (
  <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
);

interface MarkButtonProps {
  format: MarkdownTextMark;
  icon: ReactNode;
  label: string;
  disabled?: boolean;
}

export const MarkButton: React.FC<MarkButtonProps> = ({
  format,
  icon,
  label,
  disabled,
}) => {
  const editor = useSlate() as Editor;
  const isActive = isMarkActive(editor, format);

  const handleMouseDown: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.preventDefault();
      toggleMark(editor, format);
    },
    [editor, format],
  );

  return (
    <ToolbarButton
      icon={icon}
      label={label}
      active={isActive}
      disabled={disabled}
      onMouseDown={handleMouseDown}
    />
  );
};

interface BlockButtonProps {
  format: MarkdownBlockType;
  icon: ReactNode;
  label: string;
  disabled?: boolean;
}

export const BlockButton: React.FC<BlockButtonProps> = ({
  format,
  icon,
  label,
  disabled,
}) => {
  const editor = useSlate() as Editor;
  const isActive = isBlockActive(editor, format);

  const handleMouseDown: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.preventDefault();
      toggleBlock(editor, format);
    },
    [editor, format],
  );

  return (
    <ToolbarButton
      icon={icon}
      label={label}
      active={isActive}
      disabled={disabled}
      onMouseDown={handleMouseDown}
    />
  );
};

interface HeadingDropdownProps {
  disabled?: boolean;
}

export const HeadingDropdown: React.FC<HeadingDropdownProps> = ({
  disabled,
}) => {
  const editor = useSlate() as Editor;
  const [open, setOpen] = useState(false);

  const currentKey = useMemo(() => {
    const active = HEADING_OPTIONS.find((option) => {
      if (option.key === "paragraph") {
        return false;
      }
      return isBlockActive(editor, option.key);
    });
    return active?.key ?? "paragraph";
  }, [editor]);

  const currentLabel =
    HEADING_OPTIONS.find((option) => option.key === currentKey)?.label ??
    "正文";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="sm" disabled={disabled}>
          {currentLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {HEADING_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.key}
            className={cn(option.key === currentKey && "bg-slate-100")}
            onSelect={() => {
              toggleBlock(editor, option.key);
              setOpen(false);
            }}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

interface HistoryButtonProps {
  type: "undo" | "redo";
  disabled?: boolean;
}

export const HistoryButton: React.FC<HistoryButtonProps> = ({
  type,
  disabled,
}) => {
  const editor = useSlate() as Editor;
  const label = type === "undo" ? "撤销" : "重做";

  const handleMouseDown: MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.preventDefault();
      if (type === "undo") {
        editor.undo();
      } else {
        editor.redo();
      }
    },
    [editor, type],
  );

  return (
    <ToolbarButton
      icon={
        type === "undo" ? (
          <Undo2 className="h-4 w-4" />
        ) : (
          <Redo2 className="h-4 w-4" />
        )
      }
      label={label}
      disabled={disabled}
      onMouseDown={handleMouseDown}
    />
  );
};

interface MarkdownToolbarProps {
  items: ToolbarItemConfig[];
  context: ToolbarRenderContext;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({
  items,
  context,
}) => {
  const { disabled } = context;

  const toolbarText = useMemo(
    () => ({
      bold: "加粗",
      italic: "斜体",
      highlight: "高亮",
      orderedList: "有序列表",
      unorderedList: "无序列表",
      blockquote: "引用",
    }),
    [],
  );

  const renderBuiltinItem = useCallback(
    (item: BuiltinToolbarItem): ReactNode => {
      switch (item) {
        case "undo":
          return <HistoryButton key="undo" type="undo" disabled={disabled} />;
        case "redo":
          return <HistoryButton key="redo" type="redo" disabled={disabled} />;
        case "heading":
          return <HeadingDropdown key="heading" disabled={disabled} />;
        case "bold":
          return (
            <MarkButton
              key="bold"
              format="bold"
              icon={<Bold className="h-4 w-4" />}
              label={toolbarText.bold}
              disabled={disabled}
            />
          );
        case "italic":
          return (
            <MarkButton
              key="italic"
              format="italic"
              icon={<Italic className="h-4 w-4" />}
              label={toolbarText.italic}
              disabled={disabled}
            />
          );
        case "highlight":
          return (
            <MarkButton
              key="highlight"
              format="highlight"
              icon={<Highlighter className="h-4 w-4" />}
              label={toolbarText.highlight}
              disabled={disabled}
            />
          );
        case "orderedList":
          return (
            <BlockButton
              key="orderedList"
              format="numbered-list"
              icon={<ListOrdered className="h-4 w-4" />}
              label={toolbarText.orderedList}
              disabled={disabled}
            />
          );
        case "unorderedList":
          return (
            <BlockButton
              key="unorderedList"
              format="bulleted-list"
              icon={<List className="h-4 w-4" />}
              label={toolbarText.unorderedList}
              disabled={disabled}
            />
          );
        case "blockquote":
          return (
            <BlockButton
              key="blockquote"
              format="block-quote"
              icon={<Quote className="h-4 w-4" />}
              label={toolbarText.blockquote}
              disabled={disabled}
            />
          );
        default:
          return null;
      }
    },
    [disabled, toolbarText],
  );

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-white p-2">
      {items.map((item, index) => {
        if (item === "divider") {
          return <ToolbarDivider key={`divider-${index}`} />;
        }
        if (typeof item === "string") {
          return (
            <React.Fragment key={`${item}-${index}`}>
              {renderBuiltinItem(item)}
            </React.Fragment>
          );
        }
        return (
          <span key={item.key} className="flex items-center">
            {item.render(context)}
          </span>
        );
      })}
    </div>
  );
};

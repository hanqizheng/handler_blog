"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type CommentStatus = "visible" | "hidden" | "spam";
type EditorMode = "edit" | "reply";
type EditorLayout = "card" | "plain";

interface CommentEditorFormProps {
  mode: EditorMode;
  commentId?: number;
  postId: number;
  parentId?: number | null;
  initialContent?: string;
  initialStatus?: CommentStatus;
  layout?: EditorLayout;
  showHeader?: boolean;
  formId?: string;
  hideActions?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  onSubmittingChange?: (submitting: boolean) => void;
}

export function CommentEditorForm({
  mode,
  commentId,
  postId,
  parentId,
  initialContent = "",
  initialStatus = "visible",
  layout = "card",
  showHeader = true,
  formId,
  hideActions = false,
  onCancel,
  onSuccess,
  onDirtyChange,
  onSubmittingChange,
}: CommentEditorFormProps) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<CommentStatus>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setContent(initialContent);
    setStatus(initialStatus);
    setIsDirty(false);
    onDirtyChange?.(false);
  }, [initialContent, initialStatus, mode, commentId, onDirtyChange]);

  useEffect(() => {
    onSubmittingChange?.(isSaving);
  }, [isSaving, onSubmittingChange]);

  const markDirty = () => {
    if (!isDirty) {
      setIsDirty(true);
      onDirtyChange?.(true);
    }
  };

  const description = useMemo(() => {
    return mode === "reply" ? "回复用户评论" : "编辑评论内容";
  }, [mode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedContent = content.trim();

    if (!trimmedContent) {
      alert("内容不能为空");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        mode === "reply"
          ? "/api/admin/comments"
          : `/api/admin/comments/${commentId}`,
        {
          method: mode === "reply" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mode === "reply"
              ? { postId, parentId, content: trimmedContent }
              : { content: trimmedContent, status },
          ),
        },
      );

      if (!response.ok) {
        throw new Error("保存失败");
      }

      setIsDirty(false);
      onDirtyChange?.(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/comments");
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      alert("保存失败，请稍后再试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }

    router.push("/admin/comments");
  };

  const formContent = (
    <form id={formId} className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="comment-content">内容</Label>
        <textarea
          id="comment-content"
          className="border-input bg-background focus-visible:ring-ring min-h-[140px] w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
          value={content}
          onChange={(event) => {
            markDirty();
            setContent(event.target.value);
          }}
          placeholder="输入评论内容"
        />
      </div>
      {mode === "edit" ? (
        <div className="space-y-2">
          <Label htmlFor="comment-status">状态</Label>
          <select
            id="comment-status"
            className="border-input bg-background focus-visible:ring-ring h-9 w-full rounded-md border px-3 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
            value={status}
            onChange={(event) => {
              markDirty();
              setStatus(event.target.value as CommentStatus);
            }}
          >
            <option value="visible">visible</option>
            <option value="hidden">hidden</option>
            <option value="spam">spam</option>
          </select>
        </div>
      ) : null}
      {!hideActions ? (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
          <Button type="button" variant="ghost" onClick={handleCancel}>
            取消
          </Button>
        </div>
      ) : null}
    </form>
  );

  if (layout === "plain") {
    return (
      <div className="space-y-4">
        {showHeader ? (
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              {mode === "reply" ? "回复评论" : "编辑评论"}
            </h2>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        ) : null}
        {formContent}
      </div>
    );
  }

  return (
    <Card>
      {showHeader ? (
        <CardHeader>
          <CardTitle>{mode === "reply" ? "回复评论" : "编辑评论"}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      ) : null}
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}

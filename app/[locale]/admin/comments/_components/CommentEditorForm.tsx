"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type CommentStatus = "visible" | "hidden" | "spam";
type EditorMode = "edit" | "reply";

interface CommentEditorFormProps {
  mode: EditorMode;
  commentId?: number;
  postId: number;
  parentId?: number | null;
  initialContent?: string;
  initialStatus?: CommentStatus;
}

export function CommentEditorForm({
  mode,
  commentId,
  postId,
  parentId,
  initialContent = "",
  initialStatus = "visible",
}: CommentEditorFormProps) {
  const router = useRouter();
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<CommentStatus>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);

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
        mode === "reply" ? "/api/admin/comments" : `/api/admin/comments/${commentId}`,
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

      router.push("/admin/comments");
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("保存失败，请稍后再试");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "reply" ? "回复评论" : "编辑评论"}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="comment-content">内容</Label>
            <textarea
              id="comment-content"
              className="min-h-[140px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="输入评论内容"
            />
          </div>
          {mode === "edit" ? (
            <div className="space-y-2">
              <Label htmlFor="comment-status">状态</Label>
              <select
                id="comment-status"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as CommentStatus)
                }
              >
                <option value="visible">visible</option>
                <option value="hidden">hidden</option>
                <option value="spam">spam</option>
              </select>
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "保存中..." : "保存"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/admin/comments")}
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

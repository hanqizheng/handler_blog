"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarkdownEditor } from "@/components/MarkdownEditor";

type EditorMode = "create" | "edit";

interface PostEditorFormProps {
  mode: EditorMode;
  initialTitle?: string;
  initialContent?: string;
  postId?: number;
}

export function PostEditorForm({
  mode,
  initialTitle = "",
  initialContent = "",
  postId,
}: PostEditorFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  const description = useMemo(() => {
    return mode === "create" ? "创建新的博客文章" : "编辑现有博客文章";
  }, [mode]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      alert("标题和内容不能为空");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        mode === "create" ? "/api/posts" : `/api/posts/${postId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            content: trimmedContent,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("保存失败");
      }

      router.push("/admin/posts");
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
        <CardTitle>{mode === "create" ? "新建文章" : "编辑文章"}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="post-title">标题</Label>
            <Input
              id="post-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="输入文章标题"
            />
          </div>
          <div className="space-y-2">
            <Label>内容</Label>
            <MarkdownEditor value={content} onChange={setContent} />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "保存中..." : "保存"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/admin/posts")}
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

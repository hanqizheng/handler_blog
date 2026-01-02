"use client";

import { useMemo, useRef, useState } from "react";
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
import type { MarkdownEditorRef } from "@/components/MarkdownEditor";
import { useQiniuUpload } from "@/hooks/useQiniuUpload-sdk";

type EditorMode = "create" | "edit";

interface PostEditorFormProps {
  mode: EditorMode;
  initialTitle?: string;
  initialContent?: string;
  initialAssetFolder?: string;
  postId?: number;
}

const buildPostFolderName = (title: string) => {
  const trimmed = title.trim();
  if (!trimmed) return "untitled";

  const asciiSlug = trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (asciiSlug) {
    return asciiSlug;
  }

  const encoded = encodeURIComponent(trimmed).replace(/%2F/gi, "-");
  return encoded || "post";
};

export function PostEditorForm({
  mode,
  initialTitle = "",
  initialContent = "",
  initialAssetFolder,
  postId,
}: PostEditorFormProps) {
  const router = useRouter();
  const editorRef = useRef<MarkdownEditorRef | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [assetFolder] = useState(() => {
    if (mode === "edit") {
      return initialAssetFolder?.trim() || buildPostFolderName(initialTitle);
    }
    return `${Date.now()}`;
  });

  const description = useMemo(() => {
    return mode === "create" ? "创建新的博客文章" : "编辑现有博客文章";
  }, [mode]);

  const imagePathPrefix = useMemo(() => {
    return `posts/${assetFolder}`;
  }, [assetFolder]);

  const { uploadFile } = useQiniuUpload({
    allowedTypes: ["image/*"],
    pathPrefix: imagePathPrefix,
  });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      alert("标题和内容不能为空");
      return;
    }

    setIsSaving(true);

    let resolvedContent = trimmedContent;
    const pendingImages = editorRef.current?.getPendingImages() ?? [];
    const uploadsToHandle = pendingImages.filter(({ url }) =>
      resolvedContent.includes(url),
    );

    try {
      for (const pending of uploadsToHandle) {
        const result = await uploadFile(pending.file);
        resolvedContent = resolvedContent
          .split(pending.url)
          .join(result.url);
      }
      if (uploadsToHandle.length > 0) {
        editorRef.current?.removePendingImages(
          uploadsToHandle.map((item) => item.url),
        );
        setContent(resolvedContent);
      }

      const response = await fetch(
        mode === "create" ? "/api/posts" : `/api/posts/${postId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            content: resolvedContent,
            assetFolder,
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
      alert(
        error instanceof Error ? error.message : "保存失败，请稍后再试",
      );
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
            <MarkdownEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              imageUpload={{ deferUpload: true }}
            />
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

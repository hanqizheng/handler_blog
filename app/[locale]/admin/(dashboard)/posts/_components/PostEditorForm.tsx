"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MarkdownEditor } from "@/components/MarkdownEditor";
import type { MarkdownEditorRef } from "@/components/MarkdownEditor";
import { QiniuImage } from "@/components/qiniu-image";
import { useQiniuUpload } from "@/hooks/useQiniuUpload-sdk";

type EditorMode = "create" | "edit";
type EditorLayout = "card" | "plain";

interface PostEditorFormProps {
  mode: EditorMode;
  initialTitle?: string;
  initialContent?: string;
  initialAssetFolder?: string;
  initialCoverImageUrl?: string;
  postId?: number;
  layout?: EditorLayout;
  showHeader?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
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
  initialCoverImageUrl,
  postId,
  layout = "card",
  showHeader = true,
  onCancel,
  onSuccess,
  onDirtyChange,
}: PostEditorFormProps) {
  const router = useRouter();
  const editorRef = useRef<MarkdownEditorRef | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialCoverImageUrl?.trim() || "",
  );
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [assetFolder] = useState(() => {
    if (mode === "edit") {
      return initialAssetFolder?.trim() || buildPostFolderName(initialTitle);
    }
    return `${Date.now()}`;
  });

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
    setCoverImageUrl(initialCoverImageUrl?.trim() || "");
    setCoverFile(null);
    setIsDirty(false);
    onDirtyChange?.(false);
  }, [
    initialContent,
    initialCoverImageUrl,
    initialTitle,
    mode,
    onDirtyChange,
    postId,
  ]);

  const markDirty = () => {
    if (!isDirty) {
      setIsDirty(true);
      onDirtyChange?.(true);
    }
  };

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

    if (mode === "edit" && !postId) {
      alert("无法获取文章 ID");
      return;
    }

    setIsSaving(true);

    let resolvedContent = trimmedContent;
    let resolvedCoverImageUrl = coverImageUrl.trim();
    const pendingImages = editorRef.current?.getPendingImages() ?? [];
    const uploadsToHandle = pendingImages.filter(({ url }) =>
      resolvedContent.includes(url),
    );

    try {
      if (coverFile) {
        const coverUpload = await uploadFile(coverFile);
        resolvedCoverImageUrl = coverUpload.url;
        setCoverImageUrl(coverUpload.url);
        setCoverFile(null);
      }
      for (const pending of uploadsToHandle) {
        const result = await uploadFile(pending.file);
        resolvedContent = resolvedContent.split(pending.url).join(result.url);
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
            coverImageUrl: resolvedCoverImageUrl,
          }),
        },
      );

      if (!response.ok) {
        let message = "保存失败";
        try {
          const data = (await response.json()) as { error?: string };
          if (data?.error) {
            message = data.error;
          }
        } catch {
          // Ignore parse errors and fall back to default message.
        }
        throw new Error(message);
      }

      setIsDirty(false);
      onDirtyChange?.(false);
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/admin/posts");
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "保存失败，请稍后再试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      return;
    }

    router.push("/admin/posts");
  };

  const formContent = (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="post-title">标题</Label>
        <Input
          id="post-title"
          value={title}
          onChange={(event) => {
            markDirty();
            setTitle(event.target.value);
          }}
          placeholder="输入文章标题"
        />
      </div>
      <div className="space-y-2">
        <Label>封面</Label>
        {coverImageUrl ? (
          <QiniuImage
            src={coverImageUrl}
            alt="post cover"
            className="h-48 w-full object-cover"
          />
        ) : (
          <div className="flex h-48 w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
            暂无封面
          </div>
        )}
        <Input
          type="file"
          accept="image/*"
          onChange={(event) => {
            markDirty();
            setCoverFile(event.target.files?.[0] ?? null);
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              markDirty();
              setCoverImageUrl("");
              setCoverFile(null);
            }}
            disabled={isSaving || (!coverImageUrl && !coverFile)}
          >
            移除封面
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label>内容</Label>
        <MarkdownEditor
          ref={editorRef}
          value={content}
          onChange={(nextContent) => {
            markDirty();
            setContent(nextContent);
          }}
          imageUpload={{ deferUpload: true }}
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "保存中..." : "保存"}
        </Button>
        <Button type="button" variant="ghost" onClick={handleCancel}>
          取消
        </Button>
      </div>
    </form>
  );

  if (layout === "plain") {
    return (
      <div className="space-y-4">
        {showHeader ? (
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">
              {mode === "create" ? "新建文章" : "编辑文章"}
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
          <CardTitle>{mode === "create" ? "新建文章" : "编辑文章"}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      ) : null}
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}

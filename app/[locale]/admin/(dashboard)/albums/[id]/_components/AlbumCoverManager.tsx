"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QiniuImage } from "@/components/qiniu-image";
import { useQiniuUpload } from "@/hooks/useQiniuUpload-sdk";

interface AlbumCoverManagerProps {
  albumId: number;
  albumSlug: string;
  coverUrl: string | null;
}

export function AlbumCoverManager({
  albumId,
  albumSlug,
  coverUrl,
}: AlbumCoverManagerProps) {
  const [currentCover, setCurrentCover] = useState<string | null>(coverUrl);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { uploadFile } = useQiniuUpload({
    allowedTypes: ["image/*"],
    pathPrefix: `photo_album/${albumSlug}`,
  });

  const updateCover = async (nextCoverUrl: string) => {
    const response = await fetch(`/api/admin/albums/${albumId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverUrl: nextCoverUrl }),
    });
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "更新失败");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("请选择要上传的图片");
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await uploadFile(file);
      await updateCover(result.url);
      setCurrentCover(result.url);
      setFile(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "上传失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!currentCover) return;
    if (!confirm("确定移除封面吗？")) return;
    setIsSubmitting(true);
    try {
      await updateCover("");
      setCurrentCover(null);
      setFile(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "更新失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log("currentCover: ", currentCover);

  return (
    <Card>
      <CardHeader>
        <CardTitle>相册封面</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentCover ? (
          <QiniuImage
            src={currentCover}
            alt="album cover"
            className="h-48 w-full rounded-lg object-cover"
          />
        ) : (
          <p className="text-sm text-slate-500">暂无封面</p>
        )}
        <Input
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleUpload} disabled={isSubmitting}>
            {isSubmitting ? "上传中..." : "上传封面"}
          </Button>
          {currentCover ? (
            <Button
              variant="outline"
              onClick={handleRemove}
              disabled={isSubmitting}
            >
              移除封面
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

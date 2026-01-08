"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { QiniuImage } from "@/components/qiniu-image";
import { useQiniuUpload } from "@/hooks/useQiniuUpload-sdk";

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Shanghai",
});

type AlbumPhoto = {
  id: number;
  imageUrl: string;
  imageKey: string;
  createdAt: string | Date;
};

interface AlbumPhotoManagerProps {
  albumId: number;
  albumSlug: string;
  photos: AlbumPhoto[];
}

const formatPhotoDate = (value: AlbumPhoto["createdAt"]) =>
  dateFormatter.format(new Date(value));

export function AlbumPhotoManager({
  albumId,
  albumSlug,
  photos,
}: AlbumPhotoManagerProps) {
  const [items, setItems] = useState<AlbumPhoto[]>(photos);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { uploadFile } = useQiniuUpload({
    allowedTypes: ["image/*"],
    pathPrefix: `photo_album/${albumSlug}`,
  });

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [items],
  );

  const refreshItems = async () => {
    const response = await fetch(`/api/admin/albums/${albumId}`);
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      photos?: AlbumPhoto[];
    } | null;
    if (response.ok && data?.ok && data.photos) {
      setItems(data.photos);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      alert("请选择要上传的图片");
      return;
    }
    setIsSubmitting(true);
    try {
      for (const file of files) {
        const result = await uploadFile(file);
        const response = await fetch(`/api/admin/albums/${albumId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: result.url, imageKey: result.key }),
        });
        const data = (await response.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
        } | null;
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "保存失败");
        }
      }
      setFiles([]);
      await refreshItems();
    } catch (error) {
      alert(error instanceof Error ? error.message : "上传失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (photo: AlbumPhoto) => {
    if (!confirm("确定删除这张图片吗？")) return;
    const response = await fetch(
      `/api/admin/albums/${albumId}/photos/${photo.id}`,
      { method: "DELETE" },
    );
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (!response.ok || !data?.ok) {
      alert(data?.error || "删除失败");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== photo.id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>上传图片</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              const list = Array.from(event.target.files ?? []);
              setFiles(list);
            }}
          />
          <Button onClick={handleUpload} disabled={isSubmitting}>
            {isSubmitting ? "上传中..." : "开始上传"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>图片列表</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedItems.length === 0 ? (
            <p className="text-sm text-slate-500">暂无图片</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedItems.map((item) => (
                <div
                  key={item.id}
                  className="space-y-2 rounded-lg border border-slate-200 p-2"
                >
                  <QiniuImage
                    src={item.imageUrl}
                    alt="album"
                    className="h-40 w-full rounded object-cover"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{formatPhotoDate(item.createdAt)}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(item)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

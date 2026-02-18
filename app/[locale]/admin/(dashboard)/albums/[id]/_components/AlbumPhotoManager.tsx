"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildDrawerUrl } from "@/app/[locale]/admin/_components/admin-drawer-query";
import { QiniuImage } from "@/components/qiniu-image";
import { useQiniuUpload } from "@/hooks/useQiniuUpload-sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminFormDrawer } from "@/components/ui/admin-form-drawer";
import { Input } from "@/components/ui/input";

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
  drawerMode: "upload" | null;
}

const formatPhotoDate = (value: AlbumPhoto["createdAt"]) =>
  dateFormatter.format(new Date(value));

export function AlbumPhotoManager({
  albumId,
  albumSlug,
  photos,
  drawerMode,
}: AlbumPhotoManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<AlbumPhoto[]>(photos);
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setItems(photos);
  }, [photos]);

  useEffect(() => {
    if (drawerMode !== "upload") {
      setFiles([]);
      setDirty(false);
    }
  }, [drawerMode]);

  const { uploadFile } = useQiniuUpload({
    allowedTypes: ["image/*"],
    pathPrefix: `photo_album/${albumSlug}`,
  });

  const navigateDrawer = useCallback(
    (mode: "upload" | null) => {
      const nextUrl = buildDrawerUrl(
        pathname,
        new URLSearchParams(searchParams.toString()),
        mode,
      );
      router.push(nextUrl);
    },
    [pathname, router, searchParams],
  );

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
      setDirty(false);
      navigateDrawer(null);
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
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>图片列表</CardTitle>
          <Button onClick={() => navigateDrawer("upload")}>上传图片</Button>
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
      <AdminFormDrawer
        open={drawerMode === "upload"}
        onOpenChange={(open) => {
          if (!open) {
            navigateDrawer(null);
          }
        }}
        title="上传图片"
        description="批量上传图片到当前相册"
        width={640}
        dirty={dirty}
      >
        <div className="space-y-4">
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              const list = Array.from(event.target.files ?? []);
              setFiles(list);
              setDirty(list.length > 0);
            }}
          />
          <div className="flex items-center gap-3">
            <Button onClick={handleUpload} disabled={isSubmitting}>
              {isSubmitting ? "上传中..." : "开始上传"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigateDrawer(null)}
              disabled={isSubmitting}
            >
              取消
            </Button>
          </div>
        </div>
      </AdminFormDrawer>
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildDrawerUrl } from "@/app/[locale]/admin/_components/admin-drawer-query";
import { QiniuImage } from "@/components/qiniu-image";
import { useQiniuUpload } from "@/hooks/useQiniuUpload-sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminFormDrawer } from "@/components/ui/admin-form-drawer";
import { Input } from "@/components/ui/input";

interface AlbumCoverManagerProps {
  albumId: number;
  albumSlug: string;
  coverUrl: string | null;
  drawerMode: "cover" | null;
}

export function AlbumCoverManager({
  albumId,
  albumSlug,
  coverUrl,
  drawerMode,
}: AlbumCoverManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentCover, setCurrentCover] = useState<string | null>(coverUrl);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setCurrentCover(coverUrl);
    setFile(null);
    setDirty(false);
  }, [coverUrl, drawerMode]);

  const { uploadFile } = useQiniuUpload({
    allowedTypes: ["image/*"],
    pathPrefix: `photo_album/${albumSlug}`,
  });

  const navigateDrawer = useCallback(
    (mode: "cover" | null) => {
      const nextUrl = buildDrawerUrl(
        pathname,
        new URLSearchParams(searchParams.toString()),
        mode,
      );
      router.push(nextUrl);
    },
    [pathname, router, searchParams],
  );

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
      setDirty(false);
      navigateDrawer(null);
      router.refresh();
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
      setDirty(false);
      navigateDrawer(null);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "更新失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>相册封面</CardTitle>
          <Button onClick={() => navigateDrawer("cover")}>编辑封面</Button>
        </CardHeader>
        <CardContent>
          {currentCover ? (
            <QiniuImage
              src={currentCover}
              alt="album cover"
              className="h-48 w-full rounded-lg object-cover"
            />
          ) : (
            <p className="text-sm text-slate-500">暂无封面</p>
          )}
        </CardContent>
      </Card>
      <AdminFormDrawer
        open={drawerMode === "cover"}
        onOpenChange={(open) => {
          if (!open) {
            navigateDrawer(null);
          }
        }}
        title="编辑相册封面"
        description="上传或移除当前相册封面"
        width={640}
        dirty={dirty}
      >
        <div className="space-y-4">
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
            onChange={(event) => {
              if (!dirty) setDirty(true);
              setFile(event.target.files?.[0] ?? null);
            }}
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

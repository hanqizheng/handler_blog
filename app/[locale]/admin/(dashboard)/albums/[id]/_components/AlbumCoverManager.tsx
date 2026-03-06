"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildDrawerUrl } from "@/app/[locale]/admin/_components/admin-drawer-query";
import { QiniuImage } from "@/components/qiniu-image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminFormDrawer } from "@/components/ui/admin-form-drawer";
import { useQiniuUpload } from "@/hooks/useQiniuUpload-sdk";

import {
  AlbumFormFields,
  type AlbumCategoryOption,
} from "../../_components/AlbumFormFields";

interface AlbumCoverManagerProps {
  albumId: number;
  albumName: string;
  albumDescription: string | null;
  albumSlug: string;
  categoryId: number;
  categories: AlbumCategoryOption[];
  coverUrl: string | null;
  drawerMode: "edit" | null;
}

export function AlbumCoverManager({
  albumId,
  albumName,
  albumDescription,
  albumSlug,
  categoryId,
  categories,
  coverUrl,
  drawerMode,
}: AlbumCoverManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [name, setName] = useState(albumName);
  const [description, setDescription] = useState(albumDescription ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    categoryId,
  );
  const [currentCover, setCurrentCover] = useState<string | null>(coverUrl);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setName(albumName);
    setDescription(albumDescription ?? "");
    setSelectedCategoryId(categoryId);
    setCurrentCover(coverUrl);
    setCoverFile(null);
    setDirty(false);
  }, [albumDescription, albumName, categoryId, coverUrl, drawerMode]);

  const { uploadFile } = useQiniuUpload({
    allowedTypes: ["image/*"],
    pathPrefix: `photo_album/${albumSlug}`,
  });

  const navigateDrawer = useCallback(
    (mode: "edit" | null) => {
      const nextUrl = buildDrawerUrl(
        pathname,
        new URLSearchParams(searchParams.toString()),
        mode,
      );
      router.push(nextUrl);
    },
    [pathname, router, searchParams],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedCategoryId) {
      alert("请先选择相册分类");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      alert("请输入相册名称");
      return;
    }

    setIsSubmitting(true);
    try {
      const nextCoverUrl = coverFile
        ? (await uploadFile(coverFile)).url
        : (currentCover ?? "");

      const response = await fetch(`/api/admin/albums/${albumId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description,
          categoryId: selectedCategoryId,
          coverUrl: nextCoverUrl,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "更新失败");
      }

      setCurrentCover(nextCoverUrl || null);
      setCoverFile(null);
      setDirty(false);
      navigateDrawer(null);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "更新失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCategoryName =
    categories.find((item) => item.id === selectedCategoryId)?.name ??
    `分类 #${selectedCategoryId}`;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>相册信息</CardTitle>
          <Button onClick={() => navigateDrawer("edit")}>编辑相册</Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            {currentCover ? (
              <QiniuImage
                src={currentCover}
                alt={name}
                className="h-48 w-full rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-48 w-full items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">
                暂无封面
              </div>
            )}
            <div className="space-y-3 text-sm text-slate-600">
              <div>
                <p className="text-xs tracking-wide text-slate-400 uppercase">
                  相册名称
                </p>
                <p className="mt-1 text-base font-medium text-slate-900">
                  {name}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-slate-400 uppercase">
                  分类
                </p>
                <p className="mt-1">{currentCategoryName}</p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-slate-400 uppercase">
                  描述
                </p>
                <p className="mt-1 whitespace-pre-wrap">
                  {description || "暂无描述"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <AdminFormDrawer
        open={drawerMode === "edit"}
        onOpenChange={(open) => {
          if (!open) {
            navigateDrawer(null);
          }
        }}
        title="编辑相册"
        description="更新相册名称、描述、分类和封面"
        width={640}
        dirty={dirty}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {currentCover ? (
            <QiniuImage
              src={currentCover}
              alt={name}
              className="h-48 w-full rounded-lg object-cover"
            />
          ) : (
            <p className="text-sm text-slate-500">暂无封面</p>
          )}
          <AlbumFormFields
            idsPrefix="album-edit"
            name={name}
            description={description}
            categoryId={selectedCategoryId}
            categories={categories}
            onNameChange={(value) => {
              if (!dirty) setDirty(true);
              setName(value);
            }}
            onDescriptionChange={(value) => {
              if (!dirty) setDirty(true);
              setDescription(value);
            }}
            onCategoryChange={(value) => {
              if (!dirty) setDirty(true);
              setSelectedCategoryId(value);
            }}
            onCoverChange={(file) => {
              if (!dirty) setDirty(true);
              setCoverFile(file);
            }}
          />
          {coverFile ? (
            <p className="text-xs text-slate-500">
              已选择新封面：{coverFile.name}
            </p>
          ) : null}
          {currentCover ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!dirty) setDirty(true);
                setCurrentCover(null);
                setCoverFile(null);
              }}
              disabled={isSubmitting}
            >
              移除封面
            </Button>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存相册"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigateDrawer(null)}
              disabled={isSubmitting}
            >
              取消
            </Button>
          </div>
        </form>
      </AdminFormDrawer>
    </>
  );
}

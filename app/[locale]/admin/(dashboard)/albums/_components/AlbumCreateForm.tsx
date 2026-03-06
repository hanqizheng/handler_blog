"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildDrawerUrl } from "@/app/[locale]/admin/_components/admin-drawer-query";
import { useQiniuUpload } from "@/hooks/useQiniuUpload-sdk";
import { Button } from "@/components/ui/button";
import { AdminFormDrawer } from "@/components/ui/admin-form-drawer";

import { AlbumFormFields, type AlbumCategoryOption } from "./AlbumFormFields";

interface AlbumCreateFormProps {
  drawerMode: "create" | null;
  categories: AlbumCategoryOption[];
}

export function AlbumCreateForm({
  drawerMode,
  categories,
}: AlbumCreateFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(
    categories[0]?.id ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { uploadFile } = useQiniuUpload({
    allowedTypes: ["image/*"],
    pathPrefix: "photo_album/covers",
  });

  useEffect(() => {
    if (drawerMode === "create") {
      setName("");
      setDescription("");
      setCoverFile(null);
      setCategoryId(categories[0]?.id ?? null);
      setDirty(false);
    }
  }, [categories, drawerMode]);

  const navigateDrawer = useCallback(
    (mode: "create" | null) => {
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
    if (!categoryId) {
      alert("请先创建并启用相册分类");
      return;
    }
    setIsSubmitting(true);
    try {
      const coverUrl = coverFile ? (await uploadFile(coverFile)).url : "";
      const response = await fetch("/api/admin/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, coverUrl, categoryId }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "创建失败");
      }
      setDirty(false);
      navigateDrawer(null);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "创建失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-end">
        <Button onClick={() => navigateDrawer("create")}>新建相册</Button>
      </div>
      <AdminFormDrawer
        open={drawerMode === "create"}
        onOpenChange={(open) => {
          if (!open) {
            navigateDrawer(null);
          }
        }}
        title="新建相册"
        description="创建新相册并可选上传封面"
        width={640}
        dirty={dirty}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <AlbumFormFields
            idsPrefix="album-create"
            name={name}
            description={description}
            categoryId={categoryId}
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
              setCategoryId(value);
            }}
            onCoverChange={(file) => {
              if (!dirty) setDirty(true);
              setCoverFile(file);
            }}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "创建中..." : "创建相册"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => navigateDrawer(null)}
            >
              取消
            </Button>
          </div>
        </form>
      </AdminFormDrawer>
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildDrawerUrl } from "@/app/[locale]/admin/_components/admin-drawer-query";
import { useQiniuUpload } from "@/hooks/useQiniuUpload-sdk";
import { Button } from "@/components/ui/button";
import { AdminFormDrawer } from "@/components/ui/admin-form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CategoryOption {
  id: number;
  name: string;
}

interface AlbumCreateFormProps {
  drawerMode: "create" | null;
  categories: CategoryOption[];
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
  const [categoryId, setCategoryId] = useState(1);
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
      setCategoryId(1);
      setDirty(false);
    }
  }, [drawerMode]);

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
          <div className="space-y-2">
            <Label htmlFor="album-name">相册名称</Label>
            <Input
              id="album-name"
              value={name}
              onChange={(event) => {
                if (!dirty) setDirty(true);
                setName(event.target.value);
              }}
              placeholder="例如：旅行日记"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-desc">描述（可选）</Label>
            <Input
              id="album-desc"
              value={description}
              onChange={(event) => {
                if (!dirty) setDirty(true);
                setDescription(event.target.value);
              }}
              placeholder="相册说明"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-category">分类</Label>
            <select
              id="album-category"
              value={categoryId}
              onChange={(event) => {
                if (!dirty) setDirty(true);
                setCategoryId(Number(event.target.value));
              }}
              className="border-input focus-visible:ring-ring flex h-9 w-full border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="album-cover">封面（可选）</Label>
            <Input
              id="album-cover"
              type="file"
              accept="image/*"
              onChange={(event) => {
                if (!dirty) setDirty(true);
                setCoverFile(event.target.files?.[0] ?? null);
              }}
            />
          </div>
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

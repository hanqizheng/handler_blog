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
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BannerItem = {
  id: number;
  imageUrl: string;
  linkUrl: string;
  mainTitle: string;
  subTitle: string;
  sortOrder: number;
  isActive: number;
};

interface BannerManagerProps {
  items: BannerItem[];
  drawerMode: "create" | "edit" | null;
  editingItem: BannerItem | null;
}

const DEFAULT_FORM = {
  linkUrl: "",
  mainTitle: "",
  subTitle: "",
  sortOrder: "0",
  isActive: true,
};

export function BannerManager({
  items,
  drawerMode,
  editingItem,
}: BannerManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [formValues, setFormValues] = useState(DEFAULT_FORM);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { uploadFile } = useQiniuUpload({
    allowedTypes: ["image/*"],
    pathPrefix: "huteng_blog/banners",
  });

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);
  }, [items]);

  useEffect(() => {
    if (drawerMode === "edit" && editingItem) {
      setFormValues({
        linkUrl: editingItem.linkUrl || "",
        mainTitle: editingItem.mainTitle || "",
        subTitle: editingItem.subTitle || "",
        sortOrder: String(editingItem.sortOrder ?? 0),
        isActive: editingItem.isActive === 1,
      });
    } else {
      setFormValues(DEFAULT_FORM);
    }
    setImageFile(null);
    setDirty(false);
  }, [drawerMode, editingItem]);

  const navigateDrawer = useCallback(
    (mode: "create" | "edit" | null, id?: number | null) => {
      const nextUrl = buildDrawerUrl(
        pathname,
        new URLSearchParams(searchParams.toString()),
        mode,
        id,
      );
      router.push(nextUrl);
    },
    [pathname, router, searchParams],
  );

  const markDirty = () => {
    if (!dirty) {
      setDirty(true);
    }
  };

  const handleClose = () => {
    navigateDrawer(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该 Banner 吗？")) return;
    const response = await fetch(`/api/admin/banners/${id}`, {
      method: "DELETE",
    });
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (!response.ok || !data?.ok) {
      alert(data?.error || "删除失败");
      return;
    }
    router.refresh();
  };

  const handleToggle = async (item: BannerItem) => {
    const response = await fetch(`/api/admin/banners/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: item.isActive !== 1 }),
    });
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
    } | null;
    if (!response.ok || !data?.ok) {
      alert(data?.error || "更新失败");
      return;
    }
    router.refresh();
  };

  const handleSubmit = async () => {
    if (drawerMode === "create" && !imageFile) {
      alert("请选择要上传的图片");
      return;
    }

    setIsSubmitting(true);
    try {
      if (drawerMode === "create") {
        const uploadResult = await uploadFile(imageFile as File);
        const response = await fetch("/api/admin/banners", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: uploadResult.url,
            linkUrl: formValues.linkUrl,
            mainTitle: formValues.mainTitle,
            subTitle: formValues.subTitle,
            sortOrder: Number(formValues.sortOrder) || 0,
            isActive: formValues.isActive,
          }),
        });
        const data = (await response.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
        } | null;
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "创建失败");
        }
      } else if (drawerMode === "edit" && editingItem) {
        const response = await fetch(`/api/admin/banners/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            linkUrl: formValues.linkUrl,
            mainTitle: formValues.mainTitle,
            subTitle: formValues.subTitle,
            sortOrder: Number(formValues.sortOrder) || 0,
            isActive: formValues.isActive,
          }),
        });
        const data = (await response.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
        } | null;
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "更新失败");
        }
      }

      setDirty(false);
      navigateDrawer(null);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDrawerOpen = drawerMode === "create" || drawerMode === "edit";

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Button onClick={() => navigateDrawer("create")}>新增 Banner</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Banner 列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>预览</TableHead>
                  <TableHead>链接</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-56">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>暂无 Banner</TableCell>
                  </TableRow>
                ) : (
                  sortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <QiniuImage
                          src={item.imageUrl}
                          alt="banner"
                          className="h-14 w-24 rounded object-cover"
                        />
                      </TableCell>
                      <TableCell className="max-w-60 truncate">
                        {item.linkUrl || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {item.mainTitle || "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.subTitle || "-"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.sortOrder}</TableCell>
                      <TableCell>
                        {item.isActive === 1 ? "展示中" : "已隐藏"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigateDrawer("edit", item.id)}
                          >
                            编辑
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggle(item)}
                          >
                            {item.isActive === 1 ? "隐藏" : "展示"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(item.id)}
                          >
                            删除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <AdminFormDrawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          }
        }}
        title={drawerMode === "create" ? "新增 Banner" : "编辑 Banner"}
        description={
          drawerMode === "create"
            ? "上传首页 Banner 并设置展示信息"
            : "更新 Banner 的文案、排序与状态"
        }
        width={640}
        dirty={dirty}
      >
        <div className="space-y-4">
          {drawerMode === "edit" && editingItem ? (
            <div className="space-y-2">
              <Label>当前图片</Label>
              <QiniuImage
                src={editingItem.imageUrl}
                alt="banner"
                className="h-40 w-full rounded object-cover"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="banner-image">图片</Label>
              <Input
                id="banner-image"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  markDirty();
                  setImageFile(event.target.files?.[0] ?? null);
                }}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="banner-link">跳转链接（可选）</Label>
            <Input
              id="banner-link"
              value={formValues.linkUrl}
              onChange={(event) => {
                markDirty();
                setFormValues((prev) => ({
                  ...prev,
                  linkUrl: event.target.value,
                }));
              }}
              placeholder="https://example.com"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="banner-main-title">主标题（可选）</Label>
              <Input
                id="banner-main-title"
                value={formValues.mainTitle}
                onChange={(event) => {
                  markDirty();
                  setFormValues((prev) => ({
                    ...prev,
                    mainTitle: event.target.value,
                  }));
                }}
                placeholder="输入主标题"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="banner-sub-title">副标题（可选）</Label>
              <Input
                id="banner-sub-title"
                value={formValues.subTitle}
                onChange={(event) => {
                  markDirty();
                  setFormValues((prev) => ({
                    ...prev,
                    subTitle: event.target.value,
                  }));
                }}
                placeholder="输入副标题"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="banner-order">排序</Label>
              <Input
                id="banner-order"
                type="number"
                value={formValues.sortOrder}
                onChange={(event) => {
                  markDirty();
                  setFormValues((prev) => ({
                    ...prev,
                    sortOrder: event.target.value,
                  }));
                }}
                className="w-32"
              />
            </div>
            <label className="flex items-center gap-2 pt-6 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={formValues.isActive}
                onChange={(event) => {
                  markDirty();
                  setFormValues((prev) => ({
                    ...prev,
                    isActive: event.target.checked,
                  }));
                }}
              />
              立即展示
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleClose}
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

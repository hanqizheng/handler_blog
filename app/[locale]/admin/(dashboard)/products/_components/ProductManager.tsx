"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildDrawerUrl } from "@/app/[locale]/admin/_components/admin-drawer-query";
import { QiniuImage } from "@/components/qiniu-image";
import { useQiniuUpload } from "@/hooks/useQiniuUpload-sdk";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDrawerActions } from "@/components/ui/admin-drawer-actions";
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

type ProductItem = {
  id: number;
  name: string;
  description: string | null;
  logoUrl: string;
  linkUrl: string;
  sortOrder: number;
  isActive: number;
};

interface ProductManagerProps {
  items: ProductItem[];
  drawerMode: "create" | "edit" | null;
  editingItem: ProductItem | null;
}

const DEFAULT_FORM = {
  name: "",
  description: "",
  logoUrl: "",
  linkUrl: "",
  sortOrder: "0",
  isActive: true,
};

export function ProductManager({
  items,
  drawerMode,
  editingItem,
}: ProductManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [formValues, setFormValues] = useState(DEFAULT_FORM);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { uploadFile } = useQiniuUpload({
    allowedTypes: ["image/*"],
    pathPrefix: "huteng_blog/products",
  });

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);
  }, [items]);

  useEffect(() => {
    if (drawerMode === "edit" && editingItem) {
      setFormValues({
        name: editingItem.name ?? "",
        description: editingItem.description ?? "",
        logoUrl: editingItem.logoUrl ?? "",
        linkUrl: editingItem.linkUrl ?? "",
        sortOrder: String(editingItem.sortOrder ?? 0),
        isActive: editingItem.isActive === 1,
      });
    } else {
      setFormValues(DEFAULT_FORM);
    }
    setLogoFile(null);
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
    if (!confirm("确定删除该产品吗？")) return;
    const response = await fetch(`/api/admin/products/${id}`, {
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

  const handleToggle = async (item: ProductItem) => {
    const response = await fetch(`/api/admin/products/${item.id}`, {
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
    if (!formValues.name.trim()) {
      alert("请输入产品名称");
      return;
    }

    setIsSubmitting(true);
    try {
      let resolvedLogoUrl = formValues.logoUrl.trim();
      if (logoFile) {
        const uploadResult = await uploadFile(logoFile);
        resolvedLogoUrl = uploadResult.url;
      }

      if (drawerMode === "create") {
        const response = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formValues.name.trim(),
            description: formValues.description.trim(),
            logoUrl: resolvedLogoUrl,
            linkUrl: formValues.linkUrl.trim(),
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
        const response = await fetch(`/api/admin/products/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formValues.name.trim(),
            description: formValues.description.trim(),
            logoUrl: resolvedLogoUrl,
            linkUrl: formValues.linkUrl.trim(),
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
  const previewLogo = formValues.logoUrl || editingItem?.logoUrl || "";

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Button onClick={() => navigateDrawer("create")}>新增产品</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>产品列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Logo</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead>链接</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-56">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>暂无产品</TableCell>
                  </TableRow>
                ) : (
                  sortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.logoUrl ? (
                          <QiniuImage
                            src={item.logoUrl}
                            alt={item.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-400">
                            {item.name.slice(0, 1)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-48 truncate font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell className="max-w-60 truncate text-sm text-slate-600">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell className="max-w-60 truncate">
                        {item.linkUrl || "-"}
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
        title={drawerMode === "create" ? "新增产品" : "编辑产品"}
        description={
          drawerMode === "create" ? "创建产品展示信息" : "更新产品内容与排序"
        }
        width={640}
        dirty={dirty}
        footer={
          <AdminDrawerActions
            submitting={isSubmitting}
            onCancel={handleClose}
            onConfirm={handleSubmit}
          />
        }
      >
        <div className="space-y-4">
          {previewLogo ? (
            <div className="space-y-2">
              <Label>Logo 预览</Label>
              <QiniuImage
                src={previewLogo}
                alt="product logo"
                className="h-16 w-16 rounded-full object-cover"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="product-logo-file">产品 Logo（可选）</Label>
            <Input
              id="product-logo-file"
              type="file"
              accept="image/*"
              onChange={(event) => {
                markDirty();
                setLogoFile(event.target.files?.[0] ?? null);
              }}
            />
            <Input
              value={formValues.logoUrl}
              onChange={(event) => {
                markDirty();
                setFormValues((prev) => ({
                  ...prev,
                  logoUrl: event.target.value,
                }));
              }}
              placeholder="或直接填写 Logo 图片链接"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-name">名称</Label>
              <Input
                id="product-name"
                value={formValues.name}
                onChange={(event) => {
                  markDirty();
                  setFormValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }));
                }}
                placeholder="输入产品名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-link">跳转链接（可选）</Label>
              <Input
                id="product-link"
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-description">描述（可选）</Label>
            <Input
              id="product-description"
              value={formValues.description}
              onChange={(event) => {
                markDirty();
                setFormValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }));
              }}
              placeholder="一句话描述产品"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-order">排序</Label>
              <Input
                id="product-order"
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
        </div>
      </AdminFormDrawer>
    </>
  );
}

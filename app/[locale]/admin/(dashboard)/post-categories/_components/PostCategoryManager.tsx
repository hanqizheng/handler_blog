"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildDrawerUrl } from "@/app/[locale]/admin/_components/admin-drawer-query";
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
import { toPostCategorySlug } from "@/utils/post-category";

type CategoryItem = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: number;
};

interface PostCategoryManagerProps {
  items: CategoryItem[];
  drawerMode: "create" | "edit" | null;
  editingItem: CategoryItem | null;
}

const DEFAULT_FORM = {
  name: "",
  slug: "",
  sortOrder: "0",
  isActive: true,
};

export function PostCategoryManager({
  items,
  drawerMode,
  editingItem,
}: PostCategoryManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [formValues, setFormValues] = useState(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);
  }, [items]);

  useEffect(() => {
    if (drawerMode === "edit" && editingItem) {
      setFormValues({
        name: editingItem.name ?? "",
        slug: editingItem.slug ?? "",
        sortOrder: String(editingItem.sortOrder ?? 0),
        isActive: editingItem.isActive === 1,
      });
    } else {
      setFormValues(DEFAULT_FORM);
    }
    setDirty(false);
    setIsSubmitting(false);
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
    if (!confirm("确定删除该分类吗？")) return;
    const response = await fetch(`/api/admin/post-categories/${id}`, {
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

  const handleToggle = async (item: CategoryItem) => {
    const response = await fetch(`/api/admin/post-categories/${item.id}`, {
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
    const trimmedName = formValues.name.trim();
    const resolvedSlug = toPostCategorySlug(formValues.slug || trimmedName);

    if (!trimmedName) {
      alert("请输入分类名称");
      return;
    }

    if (!resolvedSlug) {
      alert("请输入有效的分类 slug");
      return;
    }

    setIsSubmitting(true);
    try {
      if (drawerMode === "create") {
        const response = await fetch("/api/admin/post-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            slug: resolvedSlug,
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
        const response = await fetch(
          `/api/admin/post-categories/${editingItem.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: trimmedName,
              slug: resolvedSlug,
              sortOrder: Number(formValues.sortOrder) || 0,
              isActive: formValues.isActive,
            }),
          },
        );
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
  const slugPreview = toPostCategorySlug(formValues.slug || formValues.name);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Button onClick={() => navigateDrawer("create")}>新增分类</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>分类列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-56">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>暂无分类</TableCell>
                  </TableRow>
                ) : (
                  sortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.slug}</TableCell>
                      <TableCell>{item.sortOrder}</TableCell>
                      <TableCell>
                        {item.isActive === 1 ? "启用中" : "已停用"}
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
                            {item.isActive === 1 ? "停用" : "启用"}
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
        title={drawerMode === "create" ? "新增分类" : "编辑分类"}
        description={
          drawerMode === "create" ? "创建文章分类" : "更新分类信息与状态"
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
          <div className="space-y-2">
            <Label htmlFor="post-category-name">分类名称</Label>
            <Input
              id="post-category-name"
              value={formValues.name}
              onChange={(event) => {
                markDirty();
                setFormValues((prev) => ({
                  ...prev,
                  name: event.target.value,
                }));
              }}
              placeholder="输入分类名称"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="post-category-slug">Slug（可选）</Label>
            <Input
              id="post-category-slug"
              value={formValues.slug}
              onChange={(event) => {
                markDirty();
                setFormValues((prev) => ({
                  ...prev,
                  slug: event.target.value,
                }));
              }}
              placeholder="留空将根据名称自动生成"
            />
            <p className="text-xs text-slate-500">预览：{slugPreview || "-"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="post-category-order">排序</Label>
              <Input
                id="post-category-order"
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
              启用分类
            </label>
          </div>
        </div>
      </AdminFormDrawer>
    </>
  );
}

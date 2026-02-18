"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LinkIcon } from "lucide-react";

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

type FriendLinkItem = {
  id: number;
  name: string;
  url: string;
  iconUrl: string;
  sortOrder: number;
  isActive: number;
};

interface FriendLinkManagerProps {
  items: FriendLinkItem[];
  drawerMode: "create" | "edit" | null;
  editingItem: FriendLinkItem | null;
}

const DEFAULT_FORM = {
  name: "",
  url: "",
  iconUrl: "",
  sortOrder: "0",
  isActive: true,
};

export function FriendLinkManager({
  items,
  drawerMode,
  editingItem,
}: FriendLinkManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [formValues, setFormValues] = useState(DEFAULT_FORM);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const { uploadFile } = useQiniuUpload({
    allowedTypes: ["image/*"],
    pathPrefix: "huteng_blog/friend-links",
  });

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);
  }, [items]);

  useEffect(() => {
    if (drawerMode === "edit" && editingItem) {
      setFormValues({
        name: editingItem.name ?? "",
        url: editingItem.url ?? "",
        iconUrl: editingItem.iconUrl ?? "",
        sortOrder: String(editingItem.sortOrder ?? 0),
        isActive: editingItem.isActive === 1,
      });
    } else {
      setFormValues(DEFAULT_FORM);
    }
    setIconFile(null);
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
    if (!confirm("确定删除该友情链接吗？")) return;
    const response = await fetch(`/api/admin/friend-links/${id}`, {
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

  const handleToggle = async (item: FriendLinkItem) => {
    const response = await fetch(`/api/admin/friend-links/${item.id}`, {
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
      alert("请输入链接名称");
      return;
    }
    if (!formValues.url.trim()) {
      alert("请输入链接地址");
      return;
    }

    setIsSubmitting(true);
    try {
      let resolvedIconUrl = formValues.iconUrl.trim();
      if (iconFile) {
        const uploadResult = await uploadFile(iconFile);
        resolvedIconUrl = uploadResult.url;
      }

      if (drawerMode === "create") {
        const response = await fetch("/api/admin/friend-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formValues.name.trim(),
            url: formValues.url.trim(),
            iconUrl: resolvedIconUrl,
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
          `/api/admin/friend-links/${editingItem.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: formValues.name.trim(),
              url: formValues.url.trim(),
              iconUrl: resolvedIconUrl,
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
  const previewIcon = formValues.iconUrl || editingItem?.iconUrl || "";

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Button onClick={() => navigateDrawer("create")}>新增友情链接</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>友情链接列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>图标</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>链接</TableHead>
                  <TableHead>排序</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-56">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>暂无链接</TableCell>
                  </TableRow>
                ) : (
                  sortedItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.iconUrl ? (
                          <QiniuImage
                            src={item.iconUrl}
                            alt={item.name}
                            className="h-8 w-8 object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center bg-slate-100 text-slate-500">
                            <LinkIcon className="h-4 w-4" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="max-w-[280px] truncate">
                        {item.url || "-"}
                      </TableCell>
                      <TableCell>{item.sortOrder}</TableCell>
                      <TableCell>
                        {item.isActive === 1 ? "已展示" : "已隐藏"}
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
                            variant="destructive"
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
        title={drawerMode === "create" ? "新增友情链接" : "编辑友情链接"}
        description={
          drawerMode === "create"
            ? "创建站点友情链接项"
            : "更新友情链接内容与排序"
        }
        width={640}
        dirty={dirty}
      >
        <div className="space-y-4">
          {previewIcon ? (
            <div className="space-y-2">
              <Label>图标预览</Label>
              <QiniuImage
                src={previewIcon}
                alt="friend link icon"
                className="h-12 w-12 object-cover"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="friend-link-icon">图标（可选）</Label>
            <Input
              id="friend-link-icon"
              type="file"
              accept="image/*"
              onChange={(event) => {
                markDirty();
                setIconFile(event.target.files?.[0] ?? null);
              }}
            />
            <Input
              value={formValues.iconUrl}
              onChange={(event) => {
                markDirty();
                setFormValues((prev) => ({
                  ...prev,
                  iconUrl: event.target.value,
                }));
              }}
              placeholder="或直接填写图标链接"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="friend-link-name">展示名称</Label>
              <Input
                id="friend-link-name"
                value={formValues.name}
                onChange={(event) => {
                  markDirty();
                  setFormValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }));
                }}
                placeholder="输入展示名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="friend-link-url">跳转链接</Label>
              <Input
                id="friend-link-url"
                value={formValues.url}
                onChange={(event) => {
                  markDirty();
                  setFormValues((prev) => ({
                    ...prev,
                    url: event.target.value,
                  }));
                }}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="friend-link-order">排序</Label>
              <Input
                id="friend-link-order"
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

"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { QiniuImage } from "@/components/qiniu-image";
import { useQiniuUpload } from "@/hooks/useQiniuUpload-sdk";

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
  initialItems: ProductItem[];
}

export function ProductManager({ initialItems }: ProductManagerProps) {
  const [items, setItems] = useState<ProductItem[]>(initialItems);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editValues, setEditValues] = useState({
    name: "",
    description: "",
    logoUrl: "",
    linkUrl: "",
    sortOrder: "0",
    isActive: true,
  });

  const { uploadFile } = useQiniuUpload({
    allowedTypes: ["image/*"],
    pathPrefix: "huteng_blog/products",
  });

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);
  }, [items]);

  const refreshItems = async () => {
    const response = await fetch("/api/admin/products");
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      items?: ProductItem[];
    } | null;
    if (response.ok && data?.ok && data.items) {
      setItems(data.items);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      alert("请输入产品名称");
      return;
    }

    setIsSubmitting(true);
    try {
      let resolvedLogoUrl = logoUrl.trim();
      if (logoFile) {
        const uploadResult = await uploadFile(logoFile);
        resolvedLogoUrl = uploadResult.url;
      }
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          logoUrl: resolvedLogoUrl,
          linkUrl: linkUrl.trim(),
          sortOrder: Number(sortOrder) || 0,
          isActive,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "创建失败");
      }
      setLogoFile(null);
      setLogoUrl("");
      setName("");
      setDescription("");
      setLinkUrl("");
      setSortOrder("0");
      setIsActive(true);
      await refreshItems();
    } catch (error) {
      alert(error instanceof Error ? error.message : "创建失败");
    } finally {
      setIsSubmitting(false);
    }
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
    setItems((prev) => prev.filter((item) => item.id !== id));
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
    await refreshItems();
  };

  const startEdit = (item: ProductItem) => {
    setEditingId(item.id);
    setEditValues({
      name: item.name ?? "",
      description: item.description ?? "",
      logoUrl: item.logoUrl ?? "",
      linkUrl: item.linkUrl ?? "",
      sortOrder: String(item.sortOrder ?? 0),
      isActive: item.isActive === 1,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsSaving(false);
  };

  const saveEdit = async (id: number) => {
    if (!editValues.name.trim()) {
      alert("请输入产品名称");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editValues.name.trim(),
          description: editValues.description.trim(),
          logoUrl: editValues.logoUrl.trim(),
          linkUrl: editValues.linkUrl.trim(),
          sortOrder: Number(editValues.sortOrder) || 0,
          isActive: editValues.isActive,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "更新失败");
      }
      setEditingId(null);
      await refreshItems();
    } catch (error) {
      alert(error instanceof Error ? error.message : "更新失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>新增产品</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-logo">产品 Logo（可选）</Label>
            <Input
              id="product-logo"
              type="file"
              accept="image/*"
              onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
            />
            <Input
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="或直接填写 Logo 图片链接"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-name">名称</Label>
              <Input
                id="product-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="输入产品名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-link">跳转链接（可选）</Label>
              <Input
                id="product-link"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="product-description">描述（可选）</Label>
            <Input
              id="product-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="一句话描述产品"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-order">排序</Label>
              <Input
                id="product-order"
                type="number"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="w-32"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              立即展示
            </label>
          </div>
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "创建产品"}
          </Button>
        </CardContent>
      </Card>

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
                sortedItems.map((item) => {
                  const previewLogo =
                    editingId === item.id && editValues.logoUrl
                      ? editValues.logoUrl
                      : item.logoUrl;

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        {previewLogo ? (
                          <QiniuImage
                            src={previewLogo}
                            alt={item.name}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-400">
                            {item.name.slice(0, 1)}
                          </div>
                        )}
                      </TableCell>
                      {editingId === item.id ? (
                        <>
                          <TableCell>
                            <Input
                              value={editValues.name}
                              onChange={(event) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  name: event.target.value,
                                }))
                              }
                              placeholder="产品名称"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={editValues.description}
                              onChange={(event) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  description: event.target.value,
                                }))
                              }
                              placeholder="产品描述"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              <Input
                                value={editValues.linkUrl}
                                onChange={(event) =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    linkUrl: event.target.value,
                                  }))
                                }
                                placeholder="https://example.com"
                              />
                              <Input
                                value={editValues.logoUrl}
                                onChange={(event) =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    logoUrl: event.target.value,
                                  }))
                                }
                                placeholder="Logo 图片链接"
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={editValues.sortOrder}
                              onChange={(event) =>
                                setEditValues((prev) => ({
                                  ...prev,
                                  sortOrder: event.target.value,
                                }))
                              }
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <label className="flex items-center gap-2 text-sm text-slate-600">
                              <input
                                type="checkbox"
                                checked={editValues.isActive}
                                onChange={(event) =>
                                  setEditValues((prev) => ({
                                    ...prev,
                                    isActive: event.target.checked,
                                  }))
                                }
                              />
                              {editValues.isActive ? "展示中" : "已隐藏"}
                            </label>
                          </TableCell>
                        </>
                      ) : (
                        <>
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
                        </>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {editingId === item.id ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => saveEdit(item.id)}
                                disabled={isSaving}
                              >
                                {isSaving ? "保存中..." : "保存"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={cancelEdit}
                                disabled={isSaving}
                              >
                                取消
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => startEdit(item)}
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
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

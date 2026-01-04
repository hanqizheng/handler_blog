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
import { useQiniuUpload } from "@/hooks/useQiniuUpload-sdk";

type BannerItem = {
  id: number;
  imageUrl: string;
  linkUrl: string;
  sortOrder: number;
  isActive: number;
};

interface BannerManagerProps {
  initialItems: BannerItem[];
}

export function BannerManager({ initialItems }: BannerManagerProps) {
  const [items, setItems] = useState<BannerItem[]>(initialItems);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { uploadFile } = useQiniuUpload({
    allowedTypes: ["image/*"],
    pathPrefix: "huteng_blog/banners",
  });

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);
  }, [items]);

  const refreshItems = async () => {
    const response = await fetch("/api/admin/banners");
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; items?: BannerItem[] }
      | null;
    if (response.ok && data?.ok && data.items) {
      setItems(data.items);
    }
  };

  const handleCreate = async () => {
    if (!imageFile) {
      alert("请选择要上传的图片");
      return;
    }
    setIsSubmitting(true);
    try {
      const uploadResult = await uploadFile(imageFile);
      const response = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: uploadResult.url,
          linkUrl,
          sortOrder: Number(sortOrder) || 0,
          isActive,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "创建失败");
      }
      setImageFile(null);
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
    if (!confirm("确定删除该 Banner 吗？")) return;
    const response = await fetch(`/api/admin/banners/${id}`, {
      method: "DELETE",
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!response.ok || !data?.ok) {
      alert(data?.error || "删除失败");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggle = async (item: BannerItem) => {
    const response = await fetch(`/api/admin/banners/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: item.isActive !== 1 }),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string }
      | null;
    if (!response.ok || !data?.ok) {
      alert(data?.error || "更新失败");
      return;
    }
    await refreshItems();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>上传新 Banner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="banner-image">图片</Label>
            <Input
              id="banner-image"
              type="file"
              accept="image/*"
              onChange={(event) =>
                setImageFile(event.target.files?.[0] ?? null)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="banner-link">跳转链接（可选）</Label>
            <Input
              id="banner-link"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="banner-order">排序</Label>
              <Input
                id="banner-order"
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
            {isSubmitting ? "上传中..." : "创建 Banner"}
          </Button>
        </CardContent>
      </Card>

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
                <TableHead>排序</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="w-[200px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>暂无 Banner</TableCell>
                </TableRow>
              ) : (
                sortedItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <img
                        src={item.imageUrl}
                        alt="banner"
                        className="h-14 w-24 rounded object-cover"
                      />
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {item.linkUrl || "-"}
                    </TableCell>
                    <TableCell>{item.sortOrder}</TableCell>
                    <TableCell>{item.isActive === 1 ? "展示中" : "已隐藏"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
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
  );
}

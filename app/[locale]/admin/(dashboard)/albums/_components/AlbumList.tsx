"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { QiniuImage } from "@/components/qiniu-image";
import { formatDateYmd } from "@/utils/date";

interface AlbumItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  categoryId: number;
  categoryName: string | null;
  createdAt: Date;
}

interface AlbumListProps {
  items: AlbumItem[];
}

export function AlbumList({ items }: AlbumListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleDelete = async (item: AlbumItem) => {
    if (deletingId !== null) return;
    if (!confirm(`确认删除相册「${item.name}」吗？`)) return;

    setDeletingId(item.id);
    try {
      const response = await fetch(`/api/admin/albums/${item.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        queuedRetryCount?: number;
      } | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "删除失败");
      }

      router.refresh();

      if ((data.queuedRetryCount ?? 0) > 0) {
        alert(
          `相册已删除，${data.queuedRetryCount} 个云端文件删除失败并已加入重试队列。`,
        );
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  if (items.length === 0) {
    return <p className="text-sm text-slate-500">暂无相册</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="overflow-hidden bg-slate-50 transition hover:bg-slate-100"
        >
          <Link href={`/admin/albums/${item.id}`} className="block">
            {item.coverUrl ? (
              <QiniuImage
                src={item.coverUrl}
                alt={item.name}
                className="h-40 w-full object-cover"
              />
            ) : (
              <div className="flex h-40 w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
                暂无封面
              </div>
            )}
            <div className="space-y-1 p-4">
              <p className="font-semibold text-slate-900">{item.name}</p>
              {item.description ? (
                <p className="line-clamp-2 text-sm text-slate-500">
                  {item.description}
                </p>
              ) : null}
            </div>
          </Link>
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              {item.categoryName ? (
                <span className="bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {item.categoryName}
                </span>
              ) : null}
              <span className="text-xs text-slate-400">
                {formatDateYmd(item.createdAt)}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDelete(item)}
              disabled={deletingId === item.id}
            >
              {deletingId === item.id ? "删除中..." : "删除"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

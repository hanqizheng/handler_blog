"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

interface AlbumItem {
  id: number;
  name: string;
  slug: string;
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
          className="rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Link href={`/admin/albums/${item.id}`} className="block space-y-1">
            <p className="text-base font-semibold text-slate-900">{item.name}</p>
            <p className="text-xs text-slate-500">{item.slug}</p>
          </Link>
          <div className="mt-3 flex items-center justify-end">
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

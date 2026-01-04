import { desc } from "drizzle-orm";

import { db } from "@/db";
import { photoAlbums } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { AlbumCreateForm } from "./_components/AlbumCreateForm";

export default async function AdminAlbumsPage() {
  const items = await db
    .select()
    .from(photoAlbums)
    .orderBy(desc(photoAlbums.createdAt), desc(photoAlbums.id));

  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">相册管理</h1>
        <p className="text-sm text-slate-500">
          创建相册并上传图片，图片将保存在 photo_album/[album_name_xxx]。
        </p>
      </div>
      <AlbumCreateForm />
      <Card>
        <CardHeader>
          <CardTitle>相册列表</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">暂无相册</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/admin/albums/${item.id}`}
                  className="rounded-lg border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <p className="text-base font-semibold text-slate-900">
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500">{item.slug}</p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

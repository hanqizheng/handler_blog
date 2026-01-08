import { desc } from "drizzle-orm";

import { db } from "@/db";
import { photoAlbums } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { getImageUrl } from "@/utils/image";

export default async function AlbumsPage() {
  const items = await db
    .select()
    .from(photoAlbums)
    .orderBy(desc(photoAlbums.createdAt), desc(photoAlbums.id));

  return (
    <main>
      <h1>相册列表</h1>
      {items.length === 0 ? (
        <p>暂无相册</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/albums/${item.id}`}
                className="block overflow-hidden rounded-lg border border-slate-200 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {item.coverUrl ? (
                  <img
                    src={getImageUrl(item.coverUrl)}
                    alt={item.name}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center bg-slate-100 text-sm text-slate-500">
                    暂无封面
                  </div>
                )}
                <div className="space-y-1 p-4">
                  <p className="text-base font-semibold">{item.name}</p>
                  {item.description ? (
                    <p className="text-sm text-slate-600">{item.description}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import { asc, desc } from "drizzle-orm";

import {
  parseDrawerState,
  type AdminSearchParams,
} from "@/app/[locale]/admin/_components/admin-drawer-query";
import { db } from "@/db";
import { friendLinks } from "@/db/schema";

import { FriendLinkManager } from "./_components/FriendLinkManager";

const FRIEND_LINK_DRAWER_MODES = ["create", "edit"] as const;

export default async function AdminFriendLinksPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { mode: drawerMode, id } = parseDrawerState(
    resolvedSearchParams,
    FRIEND_LINK_DRAWER_MODES,
  );

  const items = await db
    .select()
    .from(friendLinks)
    .orderBy(asc(friendLinks.sortOrder), desc(friendLinks.id));

  const editingItem =
    drawerMode === "edit" && id
      ? (items.find((item) => item.id === id) ?? null)
      : null;

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">友情链接管理</h1>
        <p className="text-sm text-slate-500">
          配置额外的友情链接（展示文本、链接与图标）。
        </p>
      </div>
      <FriendLinkManager
        items={items}
        drawerMode={drawerMode}
        editingItem={editingItem}
      />
    </section>
  );
}

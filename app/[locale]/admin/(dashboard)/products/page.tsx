import { asc, desc } from "drizzle-orm";

import {
  parseDrawerState,
  type AdminSearchParams,
} from "@/app/[locale]/admin/_components/admin-drawer-query";
import { db } from "@/db";
import { products } from "@/db/schema";

import { ProductManager } from "./_components/ProductManager";

const PRODUCT_DRAWER_MODES = ["create", "edit"] as const;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { mode: drawerMode, id } = parseDrawerState(
    resolvedSearchParams,
    PRODUCT_DRAWER_MODES,
  );

  const items = await db
    .select()
    .from(products)
    .orderBy(asc(products.sortOrder), desc(products.id));

  const editingItem =
    drawerMode === "edit" && id
      ? (items.find((item) => item.id === id) ?? null)
      : null;

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">产品管理</h1>
        <p className="text-sm text-slate-500">
          管理展示在首页的产品信息与排序（配置链接后会自动联动 Footer
          友情链接）。
        </p>
      </div>
      <ProductManager
        items={items}
        drawerMode={drawerMode}
        editingItem={editingItem}
      />
    </section>
  );
}

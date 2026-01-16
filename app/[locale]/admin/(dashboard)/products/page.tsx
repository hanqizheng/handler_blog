import { asc, desc } from "drizzle-orm";

import { db } from "@/db";
import { products } from "@/db/schema";

import { ProductManager } from "./_components/ProductManager";

export default async function AdminProductsPage() {
  const items = await db
    .select()
    .from(products)
    .orderBy(asc(products.sortOrder), desc(products.id));

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">产品管理</h1>
        <p className="text-sm text-slate-500">
          管理展示在首页的产品信息与排序。
        </p>
      </div>
      <ProductManager initialItems={items} />
    </section>
  );
}

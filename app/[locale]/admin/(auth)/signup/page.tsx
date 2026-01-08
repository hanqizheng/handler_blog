import { sql } from "drizzle-orm";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { SignupForm } from "./_components/SignupForm";

export const runtime = "nodejs";

export default async function AdminSignupPage() {
  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(adminUsers);
  const hasAnyUser = (countRow?.count ?? 0) > 0;

  if (hasAnyUser) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>管理员账户已创建</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-600">
            <p>当前站点已存在管理员账户，请直接登录。</p>
            <Link className="text-slate-900 underline" href="/admin/login">
              返回登录
            </Link>
          </CardContent>
        </Card>
      </section>
    );
  }

  return <SignupForm />;
}

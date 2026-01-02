import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { AdminSidebar } from "./_components/AdminSidebar";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="flex min-h-screen flex-col md:flex-row">
        <AdminSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <header className="flex items-center justify-between border-b bg-white/80 px-6 py-4 backdrop-blur">
            <div>
              <p className="text-sm font-semibold text-slate-900">后台管理</p>
              <p className="text-xs text-slate-500">
                内容与评论的集中管理入口
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/">返回前台</Link>
            </Button>
          </header>
          <main className="flex-1 px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}

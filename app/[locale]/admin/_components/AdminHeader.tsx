import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link } from "@/i18n/navigation";

export function AdminHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 lg:px-6">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-2 h-4" />
      <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">后台管理</p>
          <p className="text-xs text-muted-foreground">
            内容与评论的集中管理入口
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/">返回前台</Link>
        </Button>
      </div>
    </header>
  );
}

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link } from "@/i18n/navigation";

import { AdminBreadcrumb } from "./AdminBreadcrumb";

export function AdminHeader() {
  return (
    <header className="bg-background flex min-h-14 shrink-0 items-center gap-2 border-b px-4 py-4 lg:px-6 lg:py-5">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mx-2 h-4" />
      <div className="flex flex-1 items-center justify-between">
        <AdminBreadcrumb />
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link href="/">返回前台</Link>
        </Button>
      </div>
    </header>
  );
}

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

import { AdminHeader } from "../_components/AdminHeader";
import { AdminSidebar } from "../_components/AdminSidebar";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AdminSidebar variant="inset" />
      <SidebarInset className="min-w-0">
        <AdminHeader />
        <main className="flex min-w-0 flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

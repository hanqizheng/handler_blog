import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { getAdminSession } from "@/lib/admin-auth";

import { AdminHeader } from "../_components/AdminHeader";
import { AdminSidebar } from "../_components/AdminSidebar";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="fixed inset-0 flex min-h-0 w-full">
      <SidebarProvider className="h-full w-full overflow-hidden">
        <AdminSidebar variant="inset" />
        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          <AdminHeader />
          <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-auto px-4 py-6 lg:px-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
      <Toaster />
    </div>
  );
}

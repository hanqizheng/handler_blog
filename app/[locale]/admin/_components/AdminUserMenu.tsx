"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOutIcon, UserIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type AdminUser = {
  id: number;
  email: string;
};

export function AdminUserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadUser = async () => {
      try {
        const response = await fetch("/api/admin/auth/me");
        const data = (await response.json().catch(() => null)) as
          | { ok?: boolean; user?: AdminUser }
          | null;
        if (!cancelled) {
          setUser(response.ok && data?.ok ? data.user ?? null : null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/admin/auth/logout", { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "退出失败");
      }
      router.push("/admin/login");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "退出失败");
    } finally {
      setIsLoggingOut(false);
    }
  };

  const displayEmail = user?.email ?? (isLoading ? "加载中..." : "未登录");
  const fallbackLabel = user?.email?.slice(0, 2).toUpperCase() || "AD";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-semibold">
                  {fallbackLabel}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayEmail}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user ? "管理员" : "请登录后操作"}
                </span>
              </div>
              <UserIcon className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            align="end"
            side="right"
            sideOffset={8}
          >
            <DropdownMenuLabel>账户</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              disabled={!user || isLoggingOut}
            >
              <LogOutIcon />
              <span>{isLoggingOut ? "退出中..." : "退出登录"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

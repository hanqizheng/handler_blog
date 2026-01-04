"use client";

import type { ComponentProps } from "react";
import {
  CameraIcon,
  FileIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ListIcon,
  SettingsIcon,
} from "lucide-react";

import { LOCALES } from "@/constants/i18n";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

import { AdminUserMenu } from "./AdminUserMenu";

const MENU_ITEMS = [
  { href: "/admin", label: "概览", icon: LayoutDashboardIcon },
  { href: "/admin/posts", label: "文章管理", icon: FileTextIcon },
  { href: "/admin/comments", label: "评论管理", icon: ListIcon },
  { href: "/admin/banners", label: "Banner 管理", icon: FileIcon },
  { href: "/admin/albums", label: "相册管理", icon: CameraIcon },
  { href: "/admin/security", label: "安全设置", icon: SettingsIcon },
];

function normalizePathname(pathname: string) {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];

  if (LOCALES.includes(maybeLocale as (typeof LOCALES)[number])) {
    const remainder = segments.slice(2).join("/");
    return `/${remainder}`;
  }

  return pathname;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar(props: ComponentProps<typeof Sidebar>) {
  const pathname = normalizePathname(usePathname() ?? "/");

  return (
    <AdminSidebarContent pathname={pathname} {...props} />
  );
}

function AdminSidebarContent({
  pathname,
  ...props
}: { pathname: string } & ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="后台管理">
              <Link href="/admin">
                <LayoutDashboardIcon />
                <span className="text-sm font-semibold">后台管理</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>管理</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MENU_ITEMS.map((item) => {
                const isActive = isActivePath(pathname, item.href);
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href} aria-current={isActive ? "page" : undefined}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <AdminUserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}

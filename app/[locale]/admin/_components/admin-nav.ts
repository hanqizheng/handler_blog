import type { LucideIcon } from "lucide-react";
import {
  CameraIcon,
  FileIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ListIcon,
  PackageIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";

export const ADMIN_ROOT_PATH = "/admin";
export const ADMIN_ROOT_LABEL = "后台管理";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "概览", icon: LayoutDashboardIcon },
  { href: "/admin/posts", label: "文章管理", icon: FileTextIcon },
  { href: "/admin/comments", label: "评论管理", icon: ListIcon },
  { href: "/admin/banners", label: "Banner 管理", icon: FileIcon },
  { href: "/admin/albums", label: "相册管理", icon: CameraIcon },
  { href: "/admin/products", label: "产品管理", icon: PackageIcon },
  { href: "/admin/about", label: "个人简介", icon: UserIcon },
  { href: "/admin/security", label: "安全设置", icon: SettingsIcon },
];

import type { LucideIcon } from "lucide-react";
import {
  CameraIcon,
  FileIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LinkIcon,
  ListIcon,
  PackageIcon,
  SettingsIcon,
  TagIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";

export const ADMIN_ROOT_PATH = "/admin";
export const ADMIN_ROOT_LABEL = "后台管理";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  order: number;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "概览", icon: LayoutDashboardIcon, order: 0 },
  { href: "/admin/posts", label: "文章管理", icon: FileTextIcon, order: 10 },
  {
    href: "/admin/post-categories",
    label: "分类管理",
    icon: TagIcon,
    order: 15,
  },
  { href: "/admin/comments", label: "评论管理", icon: ListIcon, order: 20 },
  { href: "/admin/banners", label: "Banner 管理", icon: FileIcon, order: 30 },
  { href: "/admin/albums", label: "相册管理", icon: CameraIcon, order: 40 },
  { href: "/admin/products", label: "产品管理", icon: PackageIcon, order: 50 },
  {
    href: "/admin/friend-links",
    label: "友情链接管理",
    icon: LinkIcon,
    order: 60,
  },
  { href: "/admin/about", label: "个人简介", icon: UserIcon, order: 70 },
  { href: "/admin/users", label: "管理员管理", icon: UsersIcon, order: 75 },
  { href: "/admin/security", label: "安全设置", icon: SettingsIcon, order: 80 },
];

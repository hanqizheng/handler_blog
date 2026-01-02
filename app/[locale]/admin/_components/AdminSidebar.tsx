"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { LOCALES } from "@/constants/i18n";
import { cn } from "@/lib/utils";

const MENU_ITEMS = [
  { href: "/admin", label: "概览" },
  { href: "/admin/posts", label: "文章管理" },
  { href: "/admin/comments", label: "评论管理" },
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

export function AdminSidebar() {
  const pathname = normalizePathname(usePathname() ?? "/");

  return (
    <aside className="flex w-full flex-col border-b border-slate-800 bg-slate-900 text-slate-200 md:w-64 md:border-b-0 md:border-r">
      <div className="px-6 py-5">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          admin
        </p>
        <p className="text-lg font-semibold text-white">后台管理</p>
      </div>
      <nav className="flex flex-row gap-2 overflow-x-auto px-4 pb-4 md:flex-col md:px-3 md:pb-6">
        {MENU_ITEMS.map((item) => {
          const isActive = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-300 hover:bg-slate-800/70 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

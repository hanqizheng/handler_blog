"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/posts", label: "博客" },
  { href: "/albums", label: "相册" },
  { href: "/about", label: "关于我" },
];

export function SiteNavigation() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-colors ${
        isScrolled ? "bg-white shadow-sm" : "bg-white/50"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <img src="/brand/huteng.svg" alt="Huteng" className="h-8 w-auto" />
        </Link>
        <nav
          className={`flex items-center gap-6 text-sm font-semibold ${
            isScrolled ? "text-slate-900" : "text-slate-900"
          }`}
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

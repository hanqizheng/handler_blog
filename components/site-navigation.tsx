import { Link } from "@/i18n/navigation";

const navItems = [
  { href: "/", label: "首页" },
  { href: "/posts", label: "博客" },
  { href: "/albums", label: "相册" },
  { href: "/about", label: "关于我" },
];

export function SiteNavigation() {
  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
      <Link href="/" className="flex items-center gap-3">
        <picture className="block h-8 w-8 shrink-0">
          <source
            srcSet="/brand/logo-light.svg"
            media="(prefers-color-scheme: dark)"
          />
          <img src="/brand/logo.svg" alt="Huteng logo" className="h-8 w-8" />
        </picture>
        <img src="/brand/huteng.svg" alt="Huteng" className="h-6 w-auto" />
      </Link>
      <nav className="flex items-center gap-6 text-sm font-medium text-slate-700">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="hover:text-slate-900"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

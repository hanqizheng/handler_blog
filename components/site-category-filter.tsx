"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface CategoryOption {
  slug: string;
  name: string;
}

interface SiteCategoryFilterProps {
  categories: CategoryOption[];
  allLabel: string;
}

export function SiteCategoryFilter({
  categories,
  allLabel,
}: SiteCategoryFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("category") ?? "";

  const handleClick = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (slug) {
      params.set("category", slug);
    } else {
      params.delete("category");
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const baseClass =
    "cursor-pointer select-none px-3 py-1 text-sm transition-colors";
  const activeClass = "bg-slate-900 text-white";
  const inactiveClass = "bg-slate-100 text-slate-600 hover:bg-slate-200";

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        className={`${baseClass} ${current === "" ? activeClass : inactiveClass}`}
        onClick={() => handleClick("")}
      >
        {allLabel}
      </button>
      {categories.map((category) => (
        <button
          key={category.slug}
          type="button"
          className={`${baseClass} ${current === category.slug ? activeClass : inactiveClass}`}
          onClick={() => handleClick(category.slug)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}

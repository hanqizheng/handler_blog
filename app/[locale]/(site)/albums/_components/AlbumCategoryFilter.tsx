"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface CategoryOption {
  slug: string;
  name: string;
}

interface AlbumCategoryFilterProps {
  categories: CategoryOption[];
  allLabel: string;
}

export function AlbumCategoryFilter({
  categories,
  allLabel,
}: AlbumCategoryFilterProps) {
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
    "px-3 py-1 text-sm transition-colors cursor-pointer select-none";
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
      {categories.map((cat) => (
        <button
          key={cat.slug}
          type="button"
          className={`${baseClass} ${current === cat.slug ? activeClass : inactiveClass}`}
          onClick={() => handleClick(cat.slug)}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

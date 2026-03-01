"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { PostCategoryTab } from "./PostCategoryTab";
import { AlbumCategoryTab } from "./AlbumCategoryTab";

type CategoryItem = {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: number;
};

interface CategoriesTabManagerProps {
  activeTab: "post" | "album";
  postItems: CategoryItem[];
  albumItems: CategoryItem[];
  drawerMode: "create" | "edit" | null;
  editingPostItem: CategoryItem | null;
  editingAlbumItem: CategoryItem | null;
}

export function CategoriesTabManager({
  activeTab,
  postItems,
  albumItems,
  drawerMode,
  editingPostItem,
  editingAlbumItem,
}: CategoriesTabManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleTabChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", value);
    nextParams.delete("drawer");
    nextParams.delete("id");
    const query = nextParams.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="post">文章分类</TabsTrigger>
        <TabsTrigger value="album">相册分类</TabsTrigger>
      </TabsList>
      <TabsContent value="post">
        <PostCategoryTab
          items={postItems}
          drawerMode={activeTab === "post" ? drawerMode : null}
          editingItem={editingPostItem}
        />
      </TabsContent>
      <TabsContent value="album">
        <AlbumCategoryTab
          items={albumItems}
          drawerMode={activeTab === "album" ? drawerMode : null}
          editingItem={editingAlbumItem}
        />
      </TabsContent>
    </Tabs>
  );
}

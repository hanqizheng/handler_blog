"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CommentManager } from "./CommentManager";

type CommentListItem = {
  id: number;
  postId: number | null;
  albumId: number | null;
  parentId: number | null;
  content: string;
  status: "visible" | "hidden" | "spam";
  createdAt: string | Date;
  postTitle: string | null;
  albumName: string | null;
};

type EditableComment = {
  id: number;
  postId: number | null;
  content: string;
  status: "visible" | "hidden" | "spam";
};

type ReplyTargetComment = {
  id: number;
  postId: number | null;
  albumId: number | null;
  content: string;
  createdAt: string | Date;
  parentId: number | null;
};

interface CommentTabManagerProps {
  activeTab: "post" | "album";
  postItems: CommentListItem[];
  albumItems: CommentListItem[];
  drawerMode: "edit" | "reply" | null;
  editableComment: EditableComment | null;
  replyTargetComment: ReplyTargetComment | null;
}

export function CommentTabManager({
  activeTab,
  postItems,
  albumItems,
  drawerMode,
  editableComment,
  replyTargetComment,
}: CommentTabManagerProps) {
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
        <TabsTrigger value="post">文章评论</TabsTrigger>
        <TabsTrigger value="album">相册评论</TabsTrigger>
      </TabsList>
      <TabsContent value="post">
        <CommentManager
          source="post"
          items={postItems}
          drawerMode={activeTab === "post" ? drawerMode : null}
          editableComment={editableComment}
          replyTargetComment={replyTargetComment}
        />
      </TabsContent>
      <TabsContent value="album">
        <CommentManager
          source="album"
          items={albumItems}
          drawerMode={activeTab === "album" ? drawerMode : null}
          editableComment={editableComment}
          replyTargetComment={replyTargetComment}
        />
      </TabsContent>
    </Tabs>
  );
}

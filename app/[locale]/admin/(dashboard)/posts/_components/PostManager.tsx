"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildDrawerUrl } from "@/app/[locale]/admin/_components/admin-drawer-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminFormDrawer } from "@/components/ui/admin-form-drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { PostEditorForm } from "./PostEditorForm";
import { PostRowActions } from "./PostRowActions";

type PostListItem = {
  id: number;
  title: string;
};

type EditablePost = {
  id: number;
  title: string;
  content: string;
  assetFolder: string;
  coverImageUrl: string;
};

interface PostManagerProps {
  items: PostListItem[];
  drawerMode: "create" | "edit" | null;
  editingPost: EditablePost | null;
}

export function PostManager({
  items,
  drawerMode,
  editingPost,
}: PostManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDirty(false);
  }, [drawerMode, editingPost?.id]);

  const navigateDrawer = useCallback(
    (mode: "create" | "edit" | null, id?: number | null) => {
      const nextUrl = buildDrawerUrl(
        pathname,
        new URLSearchParams(searchParams.toString()),
        mode,
        id,
      );
      router.push(nextUrl);
    },
    [pathname, router, searchParams],
  );

  const handleCreate = () => {
    navigateDrawer("create");
  };

  const handleEdit = (id: number) => {
    navigateDrawer("edit", id);
  };

  const handleClose = () => {
    navigateDrawer(null);
  };

  const handleSaved = () => {
    setDirty(false);
    navigateDrawer(null);
    router.refresh();
  };

  const isDrawerOpen = drawerMode === "create" || drawerMode === "edit";

  return (
    <>
      <section className="flex w-full flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">文章管理</h1>
          <Button onClick={handleCreate}>新建文章</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>文章列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead className="w-[240px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>暂无文章</TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item.id)}
                          >
                            编辑
                          </Button>
                          <PostRowActions id={item.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
      <AdminFormDrawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClose();
          }
        }}
        title={drawerMode === "create" ? "新建文章" : "编辑文章"}
        description={
          drawerMode === "create" ? "创建新的博客文章" : "更新文章内容与封面"
        }
        width={640}
        dirty={dirty}
      >
        {drawerMode === "create" ? (
          <PostEditorForm
            key="create"
            mode="create"
            layout="plain"
            showHeader={false}
            onCancel={handleClose}
            onSuccess={handleSaved}
            onDirtyChange={setDirty}
          />
        ) : editingPost ? (
          <PostEditorForm
            key={`edit-${editingPost.id}`}
            mode="edit"
            postId={editingPost.id}
            initialTitle={editingPost.title}
            initialContent={editingPost.content}
            initialAssetFolder={editingPost.assetFolder}
            initialCoverImageUrl={editingPost.coverImageUrl}
            layout="plain"
            showHeader={false}
            onCancel={handleClose}
            onSuccess={handleSaved}
            onDirtyChange={setDirty}
          />
        ) : (
          <p className="text-muted-foreground text-sm">未找到文章数据。</p>
        )}
      </AdminFormDrawer>
    </>
  );
}

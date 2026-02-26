"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildDrawerUrl } from "@/app/[locale]/admin/_components/admin-drawer-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDrawerActions } from "@/components/ui/admin-drawer-actions";
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
  categoryName: string | null;
};

type EditablePost = {
  id: number;
  title: string;
  content: string;
  assetFolder: string;
  coverImageUrl: string;
  categoryId: number;
};

type PostCategoryOption = {
  id: number;
  name: string;
  isActive: number;
};

interface PostManagerProps {
  items: PostListItem[];
  categories: PostCategoryOption[];
  drawerMode: "create" | "edit" | null;
  editingPost: EditablePost | null;
}

const POST_DRAWER_FORM_ID = "post-editor-form";

export function PostManager({
  items,
  categories,
  drawerMode,
  editingPost,
}: PostManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dirty, setDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigateDrawer = useCallback(
    (mode: "create" | "edit" | null, id?: number | null) => {
      setDirty(false);
      setIsSubmitting(false);
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

  const handleCreate = useCallback(() => {
    navigateDrawer("create");
  }, [navigateDrawer]);

  const handleEdit = useCallback(
    (id: number) => {
      navigateDrawer("edit", id);
    },
    [navigateDrawer],
  );

  const handleClose = useCallback(() => {
    navigateDrawer(null);
  }, [navigateDrawer]);

  const handleSaved = useCallback(() => {
    setDirty(false);
    setIsSubmitting(false);
    navigateDrawer(null);
    router.refresh();
  }, [navigateDrawer, router]);

  const isDrawerOpen = drawerMode === "create" || drawerMode === "edit";
  const hasActiveCategories = categories.some((item) => item.isActive === 1);
  const canUseEditor =
    drawerMode === "edit" ? categories.length > 0 : hasActiveCategories;

  const drawerFooter = useMemo(() => {
    if (!canUseEditor) {
      return (
        <p className="text-sm text-slate-500">
          请先在分类管理中创建并启用至少一个分类。
        </p>
      );
    }

    return (
      <AdminDrawerActions
        formId={POST_DRAWER_FORM_ID}
        submitting={isSubmitting}
        onCancel={handleClose}
        primaryLabel={drawerMode === "create" ? "发布" : "更新"}
        primaryLoadingLabel={
          drawerMode === "create" ? "发布中..." : "更新中..."
        }
      />
    );
  }, [canUseEditor, drawerMode, handleClose, isSubmitting]);

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
                  <TableHead>分类</TableHead>
                  <TableHead className="w-[240px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4}>暂无文章</TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.id}</TableCell>
                      <TableCell>{item.title}</TableCell>
                      <TableCell>{item.categoryName ?? "-"}</TableCell>
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
        footer={drawerFooter}
      >
        {!canUseEditor ? (
          <p className="text-sm text-slate-500">
            未找到可用分类，请先创建分类。
          </p>
        ) : drawerMode === "create" ? (
          <PostEditorForm
            key="create"
            mode="create"
            categories={categories}
            layout="plain"
            showHeader={false}
            formId={POST_DRAWER_FORM_ID}
            hideActions
            onCancel={handleClose}
            onSuccess={handleSaved}
            onDirtyChange={setDirty}
            onSubmittingChange={setIsSubmitting}
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
            initialCategoryId={editingPost.categoryId}
            categories={categories}
            layout="plain"
            showHeader={false}
            formId={POST_DRAWER_FORM_ID}
            hideActions
            onCancel={handleClose}
            onSuccess={handleSaved}
            onDirtyChange={setDirty}
            onSubmittingChange={setIsSubmitting}
          />
        ) : (
          <p className="text-muted-foreground text-sm">未找到文章数据。</p>
        )}
      </AdminFormDrawer>
    </>
  );
}

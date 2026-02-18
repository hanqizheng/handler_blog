"use client";

import { useCallback, useEffect, useState } from "react";
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

import { CommentEditorForm } from "./CommentEditorForm";
import { CommentRowActions } from "./CommentRowActions";

type CommentListItem = {
  id: number;
  postId: number;
  parentId: number | null;
  content: string;
  status: "visible" | "hidden" | "spam";
  createdAt: string | Date;
  postTitle: string | null;
};

type EditableComment = {
  id: number;
  postId: number;
  content: string;
  status: "visible" | "hidden" | "spam";
};

type ReplyTargetComment = {
  id: number;
  postId: number;
  content: string;
  createdAt: string | Date;
  parentId: number | null;
};

interface CommentManagerProps {
  items: CommentListItem[];
  drawerMode: "edit" | "reply" | null;
  editableComment: EditableComment | null;
  replyTargetComment: ReplyTargetComment | null;
}

export function CommentManager({
  items,
  drawerMode,
  editableComment,
  replyTargetComment,
}: CommentManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [dirty, setDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setDirty(false);
    setIsSubmitting(false);
  }, [drawerMode, editableComment?.id, replyTargetComment?.id]);

  const navigateDrawer = useCallback(
    (mode: "edit" | "reply" | null, id?: number | null) => {
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

  const handleClose = () => {
    navigateDrawer(null);
  };

  const handleSaved = () => {
    setDirty(false);
    navigateDrawer(null);
    router.refresh();
  };

  const isDrawerOpen = drawerMode === "edit" || drawerMode === "reply";
  const formId =
    drawerMode === "reply"
      ? "comment-reply-editor-form"
      : "comment-edit-editor-form";

  return (
    <>
      <section className="flex w-full flex-1 flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">评论管理</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>评论列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>文章</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>回复</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>时间</TableHead>
                  <TableHead className="w-[280px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>暂无评论</TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => {
                    const contentPreview =
                      item.content.length > 80
                        ? `${item.content.slice(0, 80)}...`
                        : item.content;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>
                          {item.postTitle ?? `文章 #${item.postId}`}
                        </TableCell>
                        <TableCell>{contentPreview}</TableCell>
                        <TableCell>
                          {item.parentId ? `回复 #${item.parentId}` : "-"}
                        </TableCell>
                        <TableCell>{item.status}</TableCell>
                        <TableCell>
                          {new Date(item.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigateDrawer("edit", item.id)}
                            >
                              编辑
                            </Button>
                            {!item.parentId ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigateDrawer("reply", item.id)}
                              >
                                回复
                              </Button>
                            ) : null}
                            <CommentRowActions id={item.id} />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
        title={drawerMode === "reply" ? "回复评论" : "编辑评论"}
        description={
          drawerMode === "reply" ? "回复用户评论内容" : "更新评论内容与状态"
        }
        width={640}
        dirty={dirty}
        footer={
          <AdminDrawerActions
            formId={formId}
            submitting={isSubmitting}
            onCancel={handleClose}
          />
        }
      >
        {drawerMode === "edit" ? (
          editableComment ? (
            <CommentEditorForm
              mode="edit"
              commentId={editableComment.id}
              postId={editableComment.postId}
              initialContent={editableComment.content}
              initialStatus={editableComment.status}
              layout="plain"
              showHeader={false}
              formId={formId}
              hideActions
              onCancel={handleClose}
              onSuccess={handleSaved}
              onDirtyChange={setDirty}
              onSubmittingChange={setIsSubmitting}
            />
          ) : (
            <p className="text-muted-foreground text-sm">评论不存在。</p>
          )
        ) : replyTargetComment ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>回复对象</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{replyTargetComment.content}</p>
                <small className="text-muted-foreground">
                  {new Date(replyTargetComment.createdAt).toLocaleString()}
                </small>
              </CardContent>
            </Card>
            <CommentEditorForm
              mode="reply"
              postId={replyTargetComment.postId}
              parentId={replyTargetComment.id}
              layout="plain"
              showHeader={false}
              formId={formId}
              hideActions
              onCancel={handleClose}
              onSuccess={handleSaved}
              onDirtyChange={setDirty}
              onSubmittingChange={setIsSubmitting}
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            暂不支持回复二级评论或评论不存在。
          </p>
        )}
      </AdminFormDrawer>
    </>
  );
}

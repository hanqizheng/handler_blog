import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { comments, posts } from "@/db/schema";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { CommentRowActions } from "./_components/CommentRowActions";

export default async function AdminCommentsPage() {
  const items = await db
    .select({
      id: comments.id,
      postId: comments.postId,
      parentId: comments.parentId,
      content: comments.content,
      status: comments.status,
      createdAt: comments.createdAt,
      postTitle: posts.title,
    })
    .from(comments)
    .leftJoin(posts, eq(comments.postId, posts.id))
    .orderBy(desc(comments.createdAt), desc(comments.id));

  return (
    <section className="mx-auto max-w-6xl space-y-6">
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
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/comments/${item.id}/edit`}>
                              编辑
                            </Link>
                          </Button>
                          {!item.parentId ? (
                            <Button asChild variant="outline" size="sm">
                              <Link href={`/admin/comments/${item.id}/reply`}>
                                回复
                              </Link>
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
  );
}

import { desc } from "drizzle-orm";

import { db } from "@/db";
import { posts } from "@/db/schema";
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

import { PostRowActions } from "./_components/PostRowActions";

export default async function AdminPostsPage() {
  const items = await db.select().from(posts).orderBy(desc(posts.id));

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">文章管理</h1>
        <Button asChild>
          <Link href="/admin/posts/new">新建文章</Link>
        </Button>
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
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/posts/${item.id}/edit`}>
                            编辑
                          </Link>
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
      <Button asChild variant="ghost">
        <Link href="/admin">返回后台首页</Link>
      </Button>
    </main>
  );
}

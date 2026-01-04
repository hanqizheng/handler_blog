import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default function AdminHomePage() {
  return (
    <section className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-sm text-slate-500">概览</p>
        <h1 className="text-2xl font-semibold text-slate-900">后台管理</h1>
        <p className="mt-2 text-slate-600">
          从左侧菜单进入对应模块，集中管理文章与评论内容。
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>快捷入口</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/admin/posts"
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span>文章管理</span>
              <span className="text-xs text-slate-400">进入</span>
            </Link>
            <Link
              href="/admin/comments"
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span>评论管理</span>
              <span className="text-xs text-slate-400">进入</span>
            </Link>
            <Link
              href="/admin/banners"
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span>Banner 管理</span>
              <span className="text-xs text-slate-400">进入</span>
            </Link>
            <Link
              href="/admin/albums"
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span>相册管理</span>
              <span className="text-xs text-slate-400">进入</span>
            </Link>
            <Link
              href="/admin/security"
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <span>安全设置</span>
              <span className="text-xs text-slate-400">进入</span>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>操作提示</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>文章管理支持新建、编辑与发布内容。</p>
            <p>评论管理支持审核、回复与处理留言。</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

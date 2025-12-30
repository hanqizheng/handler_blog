import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

export default function AdminHomePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>后台管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild variant="outline">
            <Link href="/admin/posts">文章管理</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/">返回前台</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

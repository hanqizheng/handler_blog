"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";

export default function AdminAcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      alert("邀请链接无效");
      return;
    }

    if (!password) {
      alert("请输入密码");
      return;
    }

    if (password !== confirmPassword) {
      alert("两次密码输入不一致");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/users/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "接受邀请失败");
      }

      router.push("/admin/security?drawer=totp-setup");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "接受邀请失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>接受管理员邀请</CardTitle>
        </CardHeader>
        <CardContent>
          {!token ? (
            <div className="space-y-3 text-sm text-slate-600">
              <p>邀请链接缺少 token 参数，请检查链接是否完整。</p>
              <Link className="text-slate-900 underline" href="/admin/login">
                返回登录
              </Link>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="accept-password">设置密码</Label>
                <Input
                  id="accept-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accept-confirm-password">确认密码</Label>
                <Input
                  id="accept-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </div>
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "提交中..." : "创建账号并登录"}
              </Button>
              <p className="text-center text-xs text-slate-500">
                完成后会跳转到安全设置，请立即绑定 TOTP。
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

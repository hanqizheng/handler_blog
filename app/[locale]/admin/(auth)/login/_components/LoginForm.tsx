"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";

export function LoginForm({ showSignupLink }: Readonly<{ showSignupLink: boolean }>) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [requireTotp, setRequireTotp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          totp: requireTotp ? totp : undefined,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; requireTotp?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.ok) {
        if (data?.requireTotp) {
          setRequireTotp(true);
        }
        throw new Error(data?.error || "登录失败");
      }

      router.push("/admin");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "登录失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>管理员登录</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="admin-email">邮箱</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">密码</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {requireTotp ? (
              <div className="space-y-2">
                <Label htmlFor="admin-totp">TOTP 验证码</Label>
                <Input
                  id="admin-totp"
                  value={totp}
                  onChange={(event) => setTotp(event.target.value)}
                  placeholder="输入 6 位验证码"
                />
              </div>
            ) : null}
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "登录中..." : "登录"}
            </Button>
            <div className="text-center text-xs text-slate-500">
              {showSignupLink ? (
                <Link href="/admin/signup">创建管理员账户</Link>
              ) : (
                "管理员账户已创建，请直接登录"
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

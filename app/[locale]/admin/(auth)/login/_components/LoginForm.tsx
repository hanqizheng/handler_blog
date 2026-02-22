"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";

type LoginErrorCode =
  | "email and password are required"
  | "invalid credentials"
  | "totp required"
  | "invalid totp";

const resolveLoginErrorMessage = (error?: string) => {
  const code = error as LoginErrorCode | undefined;
  switch (code) {
    case "email and password are required":
      return "请输入邮箱和密码";
    case "invalid credentials":
      return "邮箱或密码不正确";
    case "invalid totp":
      return "验证码不正确，请重新输入";
    case "totp required":
      return "该账号已启用二次验证，请输入 6 位验证码";
    default:
      return "登录失败，请稍后重试";
  }
};

export function LoginForm({ showSignupLink }: Readonly<{ showSignupLink: boolean }>) {
  const router = useRouter();
  const totpInputRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [totpRequiredFor, setTotpRequiredFor] = useState<string | null>(null);
  const [showTotpField, setShowTotpField] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "info" | "error";
    message: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedEmail = email.trim().toLowerCase();
  const requireTotp = totpRequiredFor === normalizedEmail && normalizedEmail !== "";
  const isTotpVisible = requireTotp || showTotpField;

  useEffect(() => {
    if (requireTotp || showTotpField) {
      totpInputRef.current?.focus();
    }
  }, [requireTotp, showTotpField]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    const submitEmail = email.trim().toLowerCase();
    const normalizedTotp = totp.trim();

    if (normalizedTotp && !/^\d{6}$/.test(normalizedTotp)) {
      setFeedback({ type: "error", message: "验证码应为 6 位数字" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          totp: normalizedTotp || undefined,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; requireTotp?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.ok) {
        if (data?.requireTotp) {
          setTotpRequiredFor(submitEmail);
          setShowTotpField(true);
          if (data.error === "invalid totp") {
            setFeedback({ type: "error", message: resolveLoginErrorMessage(data.error) });
          } else {
            setFeedback({
              type: "info",
              message: "该账号已启用二次验证，请输入验证码后再次点击登录",
            });
          }
          return;
        }

        setFeedback({
          type: "error",
          message: resolveLoginErrorMessage(data?.error),
        });
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? "网络异常，请稍后再试" : "登录失败，请稍后再试",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>管理员登录</CardTitle>
          <CardDescription>
            如已开启 TOTP 二次验证，可在下方直接输入 6 位验证码以一次完成登录。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            {feedback ? (
              <div
                role={feedback.type === "error" ? "alert" : "status"}
                className={
                  feedback.type === "error"
                    ? "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                    : "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                }
              >
                {feedback.message}
              </div>
            ) : null}
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
            {isTotpVisible ? (
              <div className="space-y-2">
                <Label htmlFor="admin-totp">
                  TOTP 验证码{requireTotp ? "" : "（已开启时填写）"}
                </Label>
                <Input
                  id="admin-totp"
                  ref={totpInputRef}
                  value={totp}
                  onChange={(event) => setTotp(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="输入 6 位验证码"
                  required={requireTotp}
                />
                <p className="text-xs text-slate-500">
                  {requireTotp
                    ? "检测到当前账号已启用二次验证，请输入验证码后继续。"
                    : "未启用 TOTP 可留空。"}
                </p>
              </div>
            ) : (
              <button
                type="button"
                className="text-xs text-slate-600 underline-offset-4 hover:underline"
                onClick={() => setShowTotpField(true)}
              >
                我已开启 TOTP，直接输入验证码
              </button>
            )}
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "提交中..." : requireTotp ? "验证并登录" : "登录"}
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

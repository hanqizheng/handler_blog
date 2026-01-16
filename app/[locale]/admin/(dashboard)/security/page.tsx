"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QiniuImage } from "@/components/qiniu-image";

type TotpState =
  | { status: "loading" }
  | { status: "enabled" }
  | { status: "setup"; secret: string; otpauth: string };

export default function AdminSecurityPage() {
  const [totpState, setTotpState] = useState<TotpState>({ status: "loading" });
  const [token, setToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [captchaEnabled, setCaptchaEnabled] = useState<boolean | null>(null);
  const [captchaSubmitting, setCaptchaSubmitting] = useState(false);

  const loadTotp = async () => {
    const response = await fetch("/api/admin/auth/totp-setup");
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      enabled?: boolean;
      secret?: string;
      otpauth?: string;
    } | null;
    if (!response.ok || !data?.ok) {
      setTotpState({ status: "enabled" });
      return;
    }
    if (data.enabled) {
      setTotpState({ status: "enabled" });
      return;
    }
    setTotpState({
      status: "setup",
      secret: data.secret ?? "",
      otpauth: data.otpauth ?? "",
    });
  };

  const loadCommentCaptcha = async () => {
    const response = await fetch("/api/admin/security/comment-captcha");
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      enabled?: boolean;
    } | null;
    if (!response.ok || !data?.ok) {
      setCaptchaEnabled(false);
      return;
    }
    setCaptchaEnabled(Boolean(data.enabled));
  };

  useEffect(() => {
    void loadTotp();
    void loadCommentCaptcha();
  }, []);

  useEffect(() => {
    if (totpState.status !== "setup" || !totpState.otpauth) {
      setQrCode(null);
      return;
    }

    let cancelled = false;
    QRCode.toDataURL(totpState.otpauth, { width: 200, margin: 1 })
      .then((url) => {
        if (!cancelled) setQrCode(url);
      })
      .catch(() => {
        if (!cancelled) setQrCode(null);
      });

    return () => {
      cancelled = true;
    };
  }, [totpState]);

  const handleEnable = async () => {
    if (totpState.status !== "setup") return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/auth/totp-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: totpState.secret, token }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "启用失败");
      }
      setToken("");
      await loadTotp();
    } catch (error) {
      alert(error instanceof Error ? error.message : "启用失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisable = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/auth/totp-setup", {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "停用失败");
      }
      await loadTotp();
    } catch (error) {
      alert(error instanceof Error ? error.message : "停用失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnableCaptcha = async () => {
    setCaptchaSubmitting(true);
    try {
      const response = await fetch("/api/admin/security/comment-captcha", {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "启用失败");
      }
      await loadCommentCaptcha();
    } catch (error) {
      alert(error instanceof Error ? error.message : "启用失败");
    } finally {
      setCaptchaSubmitting(false);
    }
  };

  const handleDisableCaptcha = async () => {
    setCaptchaSubmitting(true);
    try {
      const response = await fetch("/api/admin/security/comment-captcha", {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "停用失败");
      }
      await loadCommentCaptcha();
    } catch (error) {
      alert(error instanceof Error ? error.message : "停用失败");
    } finally {
      setCaptchaSubmitting(false);
    }
  };

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">安全设置</h1>
        <p className="text-sm text-slate-500">
          为管理员账号启用 TOTP 二次验证。
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>TOTP 二次验证</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          {totpState.status === "loading" ? (
            <p>加载中...</p>
          ) : totpState.status === "enabled" ? (
            <div className="space-y-3">
              <p>当前已启用 TOTP 二次验证。</p>
              <Button
                variant="outline"
                onClick={handleDisable}
                disabled={isSubmitting}
              >
                {isSubmitting ? "处理中..." : "停用 TOTP"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <p>1. 使用验证器应用扫码绑定：</p>
                {qrCode ? (
                  <QiniuImage
                    src={qrCode}
                    alt="TOTP QR Code"
                    className="h-48 w-48 rounded border border-slate-200 bg-white p-2"
                  />
                ) : (
                  <p className="text-xs text-slate-500">二维码生成中...</p>
                )}
                <p className="text-xs text-slate-400">
                  无法扫码时可手动输入密钥：
                </p>
                <code className="block rounded bg-slate-100 p-2 text-xs text-slate-800">
                  {totpState.secret}
                </code>
              </div>
              <div className="space-y-2">
                <Label htmlFor="totp-token">2. 输入验证码完成绑定</Label>
                <Input
                  id="totp-token"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="6 位验证码"
                />
              </div>
              <Button onClick={handleEnable} disabled={isSubmitting}>
                {isSubmitting ? "绑定中..." : "启用 TOTP"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>评论验证码</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          {captchaEnabled === null ? (
            <p>加载中...</p>
          ) : captchaEnabled ? (
            <div className="space-y-3">
              <p>当前已启用评论验证码。</p>
              <Button
                variant="outline"
                onClick={handleDisableCaptcha}
                disabled={captchaSubmitting}
              >
                {captchaSubmitting ? "处理中..." : "停用评论验证码"}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p>当前未启用评论验证码（默认关闭）。</p>
              <Button
                onClick={handleEnableCaptcha}
                disabled={captchaSubmitting}
              >
                {captchaSubmitting ? "处理中..." : "启用评论验证码"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

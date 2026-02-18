"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { buildDrawerUrl } from "@/app/[locale]/admin/_components/admin-drawer-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminFormDrawer } from "@/components/ui/admin-form-drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AboutProfile = {
  id: number;
  displayName: string;
  roleTitle: string;
  bio: string | null;
  phone: string;
  email: string;
};

interface AboutProfileManagerProps {
  initialProfile: AboutProfile | null;
  drawerMode: "edit" | null;
}

export function AboutProfileManager({
  initialProfile,
  drawerMode,
}: AboutProfileManagerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [displayName, setDisplayName] = useState(
    initialProfile?.displayName ?? "",
  );
  const [roleTitle, setRoleTitle] = useState(initialProfile?.roleTitle ?? "");
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [phone, setPhone] = useState(initialProfile?.phone ?? "");
  const [email, setEmail] = useState(initialProfile?.email ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDisplayName(initialProfile?.displayName ?? "");
    setRoleTitle(initialProfile?.roleTitle ?? "");
    setBio(initialProfile?.bio ?? "");
    setPhone(initialProfile?.phone ?? "");
    setEmail(initialProfile?.email ?? "");
    setDirty(false);
  }, [initialProfile, drawerMode]);

  const navigateDrawer = useCallback(
    (mode: "edit" | null) => {
      const nextUrl = buildDrawerUrl(
        pathname,
        new URLSearchParams(searchParams.toString()),
        mode,
      );
      router.push(nextUrl);
    },
    [pathname, router, searchParams],
  );

  const markDirty = () => {
    if (!dirty) {
      setDirty(true);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      alert("请输入姓名");
      return;
    }
    if (!bio.trim()) {
      alert("请输入个人简介");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/about-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          roleTitle: roleTitle.trim(),
          bio: bio.trim(),
          phone: phone.trim(),
          email: email.trim(),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "保存失败");
      }
      setDirty(false);
      navigateDrawer(null);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>个人简介内容</CardTitle>
          <Button onClick={() => navigateDrawer("edit")}>编辑资料</Button>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <div>
            <p className="text-xs text-slate-500">姓名</p>
            <p>{initialProfile?.displayName || "-"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">头衔</p>
            <p>{initialProfile?.roleTitle || "-"}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs text-slate-500">电话</p>
              <p>{initialProfile?.phone || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">邮箱</p>
              <p>{initialProfile?.email || "-"}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-500">个人简介</p>
            <p className="whitespace-pre-wrap">{initialProfile?.bio || "-"}</p>
          </div>
        </CardContent>
      </Card>
      <AdminFormDrawer
        open={drawerMode === "edit"}
        onOpenChange={(open) => {
          if (!open) {
            navigateDrawer(null);
          }
        }}
        title="编辑个人简介"
        description="更新姓名、头衔与联系方式"
        width={640}
        dirty={dirty}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="about-display-name">姓名</Label>
            <Input
              id="about-display-name"
              value={displayName}
              onChange={(event) => {
                markDirty();
                setDisplayName(event.target.value);
              }}
              placeholder="输入姓名"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="about-role-title">头衔</Label>
            <Input
              id="about-role-title"
              value={roleTitle}
              onChange={(event) => {
                markDirty();
                setRoleTitle(event.target.value);
              }}
              placeholder="输入头衔"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="about-phone">联系方式（电话）</Label>
              <Input
                id="about-phone"
                value={phone}
                onChange={(event) => {
                  markDirty();
                  setPhone(event.target.value);
                }}
                placeholder="输入电话号码"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="about-email">联系方式（邮箱）</Label>
              <Input
                id="about-email"
                value={email}
                onChange={(event) => {
                  markDirty();
                  setEmail(event.target.value);
                }}
                placeholder="输入邮箱地址"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="about-bio">个人简介</Label>
            <textarea
              id="about-bio"
              className="border-input bg-background focus-visible:ring-ring min-h-40 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
              value={bio}
              onChange={(event) => {
                markDirty();
                setBio(event.target.value);
              }}
              placeholder="输入个人简介，可用换行分段"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "保存中..." : "保存"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigateDrawer(null)}
              disabled={isSaving}
            >
              取消
            </Button>
          </div>
        </div>
      </AdminFormDrawer>
    </>
  );
}

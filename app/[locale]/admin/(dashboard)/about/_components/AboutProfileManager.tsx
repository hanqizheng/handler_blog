"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AboutProfile = {
  id: number;
  displayName: string;
  roleTitle: string;
  bio: string | null;
};

interface AboutProfileManagerProps {
  initialProfile: AboutProfile | null;
}

export function AboutProfileManager({
  initialProfile,
}: AboutProfileManagerProps) {
  const [displayName, setDisplayName] = useState(
    initialProfile?.displayName ?? "",
  );
  const [roleTitle, setRoleTitle] = useState(initialProfile?.roleTitle ?? "");
  const [bio, setBio] = useState(initialProfile?.bio ?? "");
  const [isSaving, setIsSaving] = useState(false);

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
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "保存失败");
      }
      alert("保存成功");
    } catch (error) {
      alert(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>个人简介内容</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="about-display-name">姓名</Label>
          <Input
            id="about-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="输入姓名"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="about-role-title">头衔</Label>
          <Input
            id="about-role-title"
            value={roleTitle}
            onChange={(event) => setRoleTitle(event.target.value)}
            placeholder="输入头衔"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="about-bio">个人简介</Label>
          <textarea
            id="about-bio"
            className="border-input bg-background focus-visible:ring-ring min-h-40 w-full rounded-md border px-3 py-2 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="输入个人简介，可用换行分段"
          />
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "保存中..." : "保存"}
        </Button>
      </CardContent>
    </Card>
  );
}

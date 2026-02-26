"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminUserItem = {
  id: number;
  email: string;
  role: "owner" | "admin";
  totpEnabled: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

type InvitationResponse = {
  email: string;
  expiresAt: string;
  invitePath: string;
  inviteUrl: string;
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return date.toLocaleString("zh-CN", { hour12: false });
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isForbidden, setIsForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationResponse | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.id - b.id);
  }, [items]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users");
      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            currentUserId?: number;
            items?: AdminUserItem[];
          }
        | null;

      if (response.status === 403) {
        setIsForbidden(true);
        setItems([]);
        setCurrentUserId(null);
        return;
      }

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "加载失败");
      }

      setIsForbidden(false);
      setItems(data.items ?? []);
      setCurrentUserId(
        typeof data.currentUserId === "number" ? data.currentUserId : null,
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
      setItems([]);
      setCurrentUserId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      alert("请输入邮箱");
      return;
    }

    setIsInviting(true);
    try {
      const response = await fetch("/api/admin/users/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            invitation?: InvitationResponse;
          }
        | null;

      if (!response.ok || !data?.ok || !data.invitation) {
        throw new Error(data?.error || "创建邀请失败");
      }

      setInvitation(data.invitation);
      setInviteEmail("");
    } catch (inviteError) {
      alert(inviteError instanceof Error ? inviteError.message : "创建邀请失败");
    } finally {
      setIsInviting(false);
    }
  };

  const handleCopy = async () => {
    if (!invitation?.inviteUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(invitation.inviteUrl);
      alert("邀请链接已复制");
    } catch {
      alert("复制失败，请手动复制");
    }
  };

  const handleDelete = async (target: AdminUserItem) => {
    if (!confirm(`确认删除管理员 ${target.email}？`)) {
      return;
    }

    setDeletingId(target.id);
    try {
      const response = await fetch(`/api/admin/users/${target.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "删除失败");
      }

      await loadUsers();
    } catch (deleteError) {
      alert(deleteError instanceof Error ? deleteError.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="flex w-full flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">管理员管理</h1>
        <p className="text-sm text-slate-500">
          仅 owner 可邀请或删除管理员，邀请链接为一次性短时有效。
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-sm text-slate-600">加载中...</CardContent>
        </Card>
      ) : null}

      {!isLoading && isForbidden ? (
        <Card>
          <CardHeader>
            <CardTitle>无权访问</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>只有 owner 才能管理管理员账号。</p>
            <p>如需开通权限，请联系站点 owner。</p>
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && !isForbidden && error ? (
        <Card>
          <CardContent className="py-8 text-sm text-red-600">{error}</CardContent>
        </Card>
      ) : null}

      {!isLoading && !isForbidden && !error ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>邀请新管理员</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:max-w-md">
                <Label htmlFor="invite-email">受邀邮箱</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <Button onClick={handleInvite} disabled={isInviting}>
                {isInviting ? "生成中..." : "生成邀请链接"}
              </Button>

              {invitation ? (
                <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p>
                    邀请对象：<span className="font-medium">{invitation.email}</span>
                  </p>
                  <p>
                    过期时间：
                    <span className="font-medium">
                      {formatDateTime(invitation.expiresAt)}
                    </span>
                  </p>
                  <div className="space-y-1">
                    <p>邀请链接：</p>
                    <code className="block break-all rounded bg-white p-2 text-xs text-slate-800">
                      {invitation.inviteUrl}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={handleCopy}>
                      复制链接
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>管理员列表</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>邮箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>2FA</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>创建人</TableHead>
                    <TableHead className="w-44">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>暂无管理员</TableCell>
                    </TableRow>
                  ) : (
                    sortedItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.email}</TableCell>
                        <TableCell>
                          {item.role === "owner" ? "Owner" : "Admin"}
                        </TableCell>
                        <TableCell>
                          {item.totpEnabled ? "已启用" : "未启用"}
                        </TableCell>
                        <TableCell>{formatDateTime(item.createdAt)}</TableCell>
                        <TableCell>
                          {item.createdBy === null ? "-" : `#${item.createdBy}`}
                        </TableCell>
                        <TableCell>
                          {item.id === currentUserId ? (
                            <span className="text-xs text-slate-500">当前登录</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deletingId === item.id}
                              onClick={() => handleDelete(item)}
                            >
                              {deletingId === item.id ? "删除中..." : "删除"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}

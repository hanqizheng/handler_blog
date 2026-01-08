import { db } from "@/db";
import { siteProfiles } from "@/db/schema";

export default async function AboutPage() {
  const [profile] = await db.select().from(siteProfiles).limit(1);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">关于我</h1>
      {profile ? (
        <div className="mt-6 space-y-3 text-sm text-slate-600">
          {profile.displayName ? (
            <p className="text-base font-semibold text-slate-900">
              {profile.displayName}
            </p>
          ) : null}
          {profile.bio ? <p>{profile.bio}</p> : null}
          <div className="space-y-1">
            {profile.phone ? <p>电话：{profile.phone}</p> : null}
            {profile.email ? <p>邮箱：{profile.email}</p> : null}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-600">
          暂无个人信息配置。
        </p>
      )}
    </main>
  );
}

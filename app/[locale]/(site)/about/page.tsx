import { desc } from "drizzle-orm";

import { db } from "@/db";
import { siteProfiles } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [profile] = await db
    .select()
    .from(siteProfiles)
    .orderBy(desc(siteProfiles.id))
    .limit(1);
  const displayName = profile?.displayName?.trim() ?? "";
  const roleTitle = profile?.roleTitle?.trim() ?? "";
  const bio = profile?.bio?.trim() ?? "";
  const bioParagraphs = bio
    .split(/\r?\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const hasProfile = Boolean(displayName || roleTitle || bioParagraphs.length);
  const timeline = [
    {
      period: "2017年",
      title: "AIAIG海外置业 合伙人 独立经纪人",
      details: ["负责 www.aiaig.com 海外独立经纪人运营"],
    },
    {
      period: "2015－2017年",
      title: "北京春座木年科技有限公司 合伙人",
      details: ["普乐园 托管运营北京丰台某养老机构"],
    },
    {
      period: "2006－2015年",
      title: "有过交集的事儿",
      details: ["团购网、京东、淘宝拍卖、奔富620、于蓝医生", "龙腾海外房产网"],
    },
    {
      period: "2006－2015年",
      title: "北京天士力文化传媒有限公司",
      details: ["养老网 www.yanglao.com.cn 项目负责人"],
    },
    {
      period: "2005－2006年",
      title: "百狗 baigoo.com 搜索",
      details: [
        "个人创意产品，偶遇百度上市被媒体报道，受到关注和使用，并出售。同年加入奇虎360，BD组，工作内容网站联盟。",
      ],
    },
    {
      period: "2003－2004年",
      title: "武汉思迈人才顾问有限公司",
      details: [
        "个人在武汉创业项目，其中创业失败，公司一元出售，偶登媒体头条。",
      ],
    },
  ];

  return (
    <main
      className="relative overflow-hidden"
      style={{
        fontFamily:
          '"Source Han Sans SC","Noto Sans SC","PingFang SC","Microsoft YaHei",sans-serif',
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 right-[-15%] h-64 w-64 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute -bottom-35 left-[-10%] h-72 w-72 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.06),transparent_55%)]" />
      </div>
      <div className="relative mx-auto w-full max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-center gap-3 text-[0.7rem] tracking-[0.3em] text-slate-500 uppercase">
          <span className="h-px w-10 bg-slate-300" />
          <span>Hu Teng</span>
        </div>
        <h1
          className="mt-4 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl"
          style={{
            fontFamily:
              '"Source Han Serif SC","Noto Serif SC","Songti SC",serif',
          }}
        >
          关于我
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          从个人主页到独立经纪，从互联网到海外置业，记录一条更真实、更自我
          的路线。
        </p>

        <div className="mt-10 flex w-full flex-col gap-10">
          {hasProfile ? (
            <section className="animate-in fade-in-0 slide-in-from-bottom-6 duration-700">
              <div className="rounded-3xl border border-white/70 bg-white/80 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur">
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <p className="text-xs tracking-[0.35em] text-slate-500 uppercase">
                      个人简介
                    </p>
                    {displayName ? (
                      <h2
                        className="mt-3 text-2xl font-semibold text-slate-900"
                        style={{
                          fontFamily:
                            '"Source Han Serif SC","Noto Serif SC","Songti SC",serif',
                        }}
                      >
                        {displayName}
                      </h2>
                    ) : null}
                    {roleTitle ? (
                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {roleTitle}
                      </p>
                    ) : null}
                  </div>
                  <div className="hidden h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-sm font-semibold text-amber-700 sm:flex">
                    主页
                  </div>
                </div>
                {bioParagraphs.length ? (
                  <div className="mt-6 space-y-3 text-sm leading-relaxed text-slate-600">
                    {bioParagraphs.map((paragraph, index) => (
                      <p key={`${index}-${paragraph}`}>{paragraph}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <section
            className="animate-in fade-in-0 slide-in-from-bottom-6 duration-700"
            style={{ animationDelay: "150ms" }}
          >
            <div className="rounded-3xl border border-slate-200/70 bg-white/70 p-8 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs tracking-[0.35em] text-slate-500 uppercase">
                    个人经历
                  </p>
                  <h2
                    className="mt-3 text-2xl font-semibold text-slate-900"
                    style={{
                      fontFamily:
                        '"Source Han Serif SC","Noto Serif SC","Songti SC",serif',
                    }}
                  >
                    时间轴
                  </h2>
                </div>
                <div className="text-xs text-slate-500">2017 → 2003</div>
              </div>

              <div className="relative mt-10">
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 hidden h-full w-px -translate-x-1/2 bg-linear-to-b from-amber-300 via-slate-200 to-transparent sm:block"
                />
                <ol className="space-y-8">
                  {timeline.map((item, index) => {
                    const isLeft = index % 2 === 0;
                    const cardClasses =
                      "w-full rounded-2xl border border-slate-200/60 bg-white/70 p-5 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.25)]";
                    const cardBody = (
                      <>
                        <time className="text-xs font-medium text-amber-700">
                          {item.period}
                        </time>
                        <h3 className="mt-2 text-sm font-semibold text-slate-900">
                          {item.title}
                        </h3>
                        <div className="mt-2 space-y-2 text-sm text-slate-600">
                          {item.details.map((detail) => (
                            <p key={detail}>{detail}</p>
                          ))}
                        </div>
                      </>
                    );

                    return (
                      <li
                        key={`${item.period}-${item.title}`}
                        className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center sm:gap-6"
                      >
                        <div
                          className={`order-2 sm:order-0 sm:col-start-1 ${
                            isLeft ? cardClasses : "hidden sm:block"
                          }`}
                        >
                          {isLeft ? cardBody : null}
                        </div>
                        <div className="order-1 flex justify-start sm:order-0 sm:col-start-2 sm:col-end-3 sm:justify-center">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-amber-200 bg-white shadow-[0_0_0_6px_rgba(253,230,138,0.35)]">
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                          </span>
                        </div>
                        <div
                          className={`order-2 sm:order-0 sm:col-start-3 ${
                            isLeft ? "hidden sm:block" : cardClasses
                          }`}
                        >
                          {isLeft ? null : cardBody}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

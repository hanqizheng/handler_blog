"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type CommentItem = {
  id: number;
  content: string;
  createdAt: string;
  isAdmin: boolean;
  replies: CommentReply[];
};

type CommentReply = {
  id: number;
  parentId: number | null;
  content: string;
  createdAt: string;
  isAdmin: boolean;
};

type SubmitResult = {
  ok: boolean;
  item?: CommentItem;
  error?: string;
  code?: string;
  captchaVerified?: boolean;
  status?: number;
};

const MAX_COMMENT_LENGTH = 500;
const CAPTCHA_SCRIPT_URL =
  "https://o.alicdn.com/captcha-frontend/aliyunCaptcha/AliyunCaptcha.js";
const CAPTCHA_ELEMENT_ID = "comment-captcha-element";
const CAPTCHA_BUTTON_ID = "comment-captcha-button";
const CONSENT_STORAGE_KEY = "comment_cookie_consent";

let captchaScriptPromise: Promise<void> | null = null;

const loadCaptchaScript = () => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("captcha script can only load in browser"));
  }
  if (window.initAliyunCaptcha) {
    return Promise.resolve();
  }
  if (captchaScriptPromise) {
    return captchaScriptPromise;
  }

  captchaScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CAPTCHA_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      captchaScriptPromise = null;
      reject(new Error("captcha script failed to load"));
    };
    document.head.appendChild(script);
  });

  return captchaScriptPromise;
};

export function CommentSection({
  postId,
  captchaEnabled = false,
}: {
  postId: number;
  captchaEnabled?: boolean;
}) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cookieConsent, setCookieConsent] = useState<
    "unknown" | "accepted" | "declined"
  >("unknown");
  const captchaReadyPromiseRef = useRef<Promise<void> | null>(null);
  const captchaInstanceRef = useRef<{
    verify?: () => void;
    show?: () => void;
  } | null>(null);
  const payloadRef = useRef({
    postId,
    content: "",
    website: "",
    cookieConsent: "unknown" as "unknown" | "accepted" | "declined",
  });

  const sceneId = process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_SCENE_ID ?? "";
  const prefix = process.env.NEXT_PUBLIC_ALIYUN_CAPTCHA_PREFIX ?? "";

  useEffect(() => {
    payloadRef.current = {
      postId,
      content,
      website: honeypot,
      cookieConsent,
    };
  }, [postId, content, honeypot, cookieConsent]);

  useEffect(() => {
    if (!captchaEnabled) {
      setCookieConsent("declined");
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (stored === "declined") {
      setCookieConsent("declined");
      return;
    }
    setCookieConsent("unknown");
  }, [captchaEnabled]);

  useEffect(() => {
    return () => {
      document.getElementById("aliyunCaptcha-mask")?.remove();
      document.getElementById("aliyunCaptcha-window-popup")?.remove();
    };
  }, []);

  const handleAcceptConsent = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, "accepted");
    }
    setCookieConsent("accepted");
  }, []);

  const handleDeclineConsent = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, "declined");
    }
    setCookieConsent("declined");
  }, []);

  const handleSubmitSuccess = useCallback((item?: CommentItem) => {
    if (item) {
      setItems((prev) => [item, ...prev]);
    }
    setContent("");
  }, []);

  const sendComment = useCallback(
    async (captchaVerifyParam?: string): Promise<SubmitResult> => {
      const payload = payloadRef.current;
      const trimmed = payload.content.trim();
      if (!trimmed) {
        return { ok: false, error: "请输入留言内容", code: "invalid_payload" };
      }

      const body: Record<string, unknown> = {
        postId: payload.postId,
        content: trimmed,
        website: payload.website,
      };
      if (payload.cookieConsent && payload.cookieConsent !== "unknown") {
        body.cookieConsent = payload.cookieConsent;
      }
      if (captchaVerifyParam) {
        body.captchaVerifyParam = captchaVerifyParam;
      }

      let response: Response;
      try {
        response = await fetch("/api/comments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch {
        return { ok: false, error: "提交失败", code: "network_error" };
      }

      let data: {
        ok?: boolean;
        item?: CommentItem;
        error?: string;
        code?: string;
        captchaVerified?: boolean;
      } = {};
      try {
        data = (await response.json()) as typeof data;
      } catch {
        data = {};
      }

      const ok = response.ok && data.ok === true;
      return {
        ok,
        item: data.item,
        error: data.error ?? "提交失败",
        code: data.code,
        captchaVerified: data.captchaVerified,
        status: response.status,
      };
    },
    [],
  );

  const captchaVerifyCallback = useCallback(
    async (captchaVerifyParam: string) => {
      setError(null);
      setSubmitting(true);
      const result = await sendComment(captchaVerifyParam);
      setSubmitting(false);

      if (result.ok) {
        handleSubmitSuccess(result.item);
        return { captchaResult: true, bizResult: true };
      }

      setError(result.error ?? "提交失败");
      const captchaResult = result.captchaVerified === true || result.ok;
      return { captchaResult, bizResult: false };
    },
    [handleSubmitSuccess, sendComment],
  );

  const ensureCaptchaReady = useCallback(async () => {
    if (captchaReadyPromiseRef.current) {
      await captchaReadyPromiseRef.current;
      return;
    }
    if (!captchaEnabled) {
      throw new Error("captcha disabled");
    }
    if (!sceneId || !prefix) {
      throw new Error("验证码配置缺失");
    }
    const readyPromise = (async () => {
      await loadCaptchaScript();
      if (!window.initAliyunCaptcha) {
        throw new Error("验证码脚本未加载");
      }
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const timeoutId = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error("验证码初始化失败"));
        }, 2000);

        try {
          window?.initAliyunCaptcha?.({
            SceneId: sceneId,
            prefix,
            mode: "popup",
            element: `#${CAPTCHA_ELEMENT_ID}`,
            button: `#${CAPTCHA_BUTTON_ID}`,
            captchaVerifyCallback,
            onBizResultCallback: () => undefined,
            getInstance: (instance) => {
              captchaInstanceRef.current = instance as {
                verify?: () => void;
                show?: () => void;
              };
              if (settled) return;
              settled = true;
              window.clearTimeout(timeoutId);
              resolve();
            },
            slideStyle: {
              width: 360,
              height: 40,
            },
            language: "cn",
          });
        } catch (error) {
          if (!settled) {
            settled = true;
            window.clearTimeout(timeoutId);
            reject(
              error instanceof Error ? error : new Error("验证码初始化失败"),
            );
          }
        }
      });
    })();

    captchaReadyPromiseRef.current = readyPromise;
    try {
      await readyPromise;
    } catch (error) {
      captchaReadyPromiseRef.current = null;
      throw error;
    }
  }, [captchaEnabled, captchaVerifyCallback, prefix, sceneId]);

  const triggerCaptcha = useCallback(async () => {
    await ensureCaptchaReady();
    const instance = captchaInstanceRef.current;
    if (instance?.verify) {
      instance.verify();
      return;
    }
    if (instance?.show) {
      instance.show();
      return;
    }
    const button = document.getElementById(CAPTCHA_BUTTON_ID);
    if (!button) {
      throw new Error("验证码触发器不可用");
    }
    button.click();
  }, [ensureCaptchaReady]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/comments?postId=${postId}&page=1&limit=20`,
          { cache: "no-store" },
        );
        const data = (await response.json()) as {
          ok: boolean;
          items?: CommentItem[];
          error?: string;
        };
        if (!active) {
          return;
        }
        if (!response.ok || !data.ok) {
          setError(data.error ?? "加载失败");
          setItems([]);
          return;
        }
        setItems(data.items ?? []);
      } catch {
        if (active) {
          setError("加载失败");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [postId]);

  const submitComment = async () => {
    if (submitting) {
      return;
    }
    const trimmed = content.trim();
    if (!trimmed) {
      setError("请输入留言内容");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await sendComment();
    const shouldTriggerCaptcha =
      !result.ok &&
      (result.code === "captcha_required" ||
        (result.status === 403 && result.error === "需要验证码"));
    if (shouldTriggerCaptcha) {
      setSubmitting(false);
      try {
        await triggerCaptcha();
      } catch {
        setError("验证码加载失败");
      }
      return;
    }
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? "提交失败");
      return;
    }

    handleSubmitSuccess(result.item);
  };

  const contentLength = content.length;

  const renderBubble = (entry: {
    content: string;
    createdAt: string;
    isAdmin: boolean;
  }) => {
    const alignClass = entry.isAdmin
      ? "justify-end text-right"
      : "justify-start text-left";
    const bubbleClass = "text-slate-900";
    const metaClass = entry.isAdmin ? "text-slate-400" : "text-slate-500";

    return (
      <div className={`flex ${alignClass}`}>
        <div
          className={`max-w-[80%] px-4 py-3 text-sm leading-6 ${bubbleClass}`}
        >
          {entry.isAdmin ? (
            <span className="mb-2 block text-[10px] tracking-[0.25em] text-slate-400 uppercase">
              管理员
            </span>
          ) : null}
          <p className="whitespace-pre-wrap">{entry.content}</p>
          <span className={`mt-2 block text-xs ${metaClass}`}>
            {new Date(entry.createdAt).toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <section className="mt-12 space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-slate-900">留言</h2>
        <p className="text-sm text-slate-500">友善交流，分享你的想法。</p>
      </div>
      {captchaEnabled && cookieConsent === "unknown" ? (
        <div className="space-y-3 bg-slate-100 px-4 py-3 text-sm text-slate-600">
          <p>为减少验证码，我们会在本地保存一个评论安全 cookie。</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAcceptConsent}
              className="bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
            >
              同意
            </button>
            <button
              type="button"
              onClick={handleDeclineConsent}
              className="bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
            >
              不同意
            </button>
          </div>
        </div>
      ) : null}
      <div className="space-y-3">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submitComment();
            }
          }}
          placeholder="留个言吧..."
          maxLength={MAX_COMMENT_LENGTH}
          rows={3}
          aria-label="留言内容"
          className="min-h-24 w-full resize-none bg-slate-100 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-2 focus-visible:outline-slate-300"
        />
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          hidden
          aria-hidden="true"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            {contentLength}/{MAX_COMMENT_LENGTH}
          </span>
          <button
            type="button"
            onClick={() => void submitComment()}
            disabled={submitting || content.trim().length === 0}
            className="bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            {submitting ? "发送中..." : "发送"}
          </button>
        </div>
      </div>
      <div id={CAPTCHA_ELEMENT_ID} aria-hidden="true" />
      <button id={CAPTCHA_BUTTON_ID} type="button" hidden aria-hidden="true" />
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">加载中...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">暂无留言</p>
      ) : (
        <ul className="list-none space-y-6 p-0">
          {items.map((item) => (
            <li key={item.id} className="space-y-3">
              {renderBubble(item)}
              {item.replies.length > 0 ? (
                <ul className="list-none space-y-3 p-0">
                  {item.replies.map((reply) => (
                    <li key={reply.id}>{renderBubble(reply)}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

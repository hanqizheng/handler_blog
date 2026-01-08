"use client";

import { useEffect, useState } from "react";

type CommentItem = {
  id: number;
  content: string;
  createdAt: string;
  replies: CommentReply[];
};

type CommentReply = {
  id: number;
  parentId: number | null;
  content: string;
  createdAt: string;
};

const MAX_COMMENT_LENGTH = 500;

export function CommentSection({ postId }: { postId: number }) {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [content, setContent] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, content: trimmed, website: honeypot }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        item?: CommentItem;
        error?: string;
      };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "提交失败");
        return;
      }
      if (data.item) {
        setItems((prev) => [data.item as CommentItem, ...prev]);
      }
      setContent("");
    } catch {
      setError("提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <h2>留言</h2>
      <div>
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
        <button
          type="button"
          onClick={() => void submitComment()}
          disabled={submitting || content.trim().length === 0}
        >
          {submitting ? "发送中..." : "发送"}
        </button>
      </div>
      {error ? <p>{error}</p> : null}
      {loading ? (
        <p>加载中...</p>
      ) : items.length === 0 ? (
        <p>暂无留言</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <p>{item.content}</p>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
              {item.replies.length > 0 ? (
                <ul>
                  {item.replies.map((reply) => (
                    <li key={reply.id}>
                      <p>{reply.content}</p>
                      <small>{new Date(reply.createdAt).toLocaleString()}</small>
                    </li>
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

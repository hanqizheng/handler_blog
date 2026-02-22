const DIRECT_VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "m4v"];

export type ResolvedVideoEmbed =
  | {
      type: "iframe";
      provider: "youtube" | "bilibili";
      src: string;
      title: string;
    }
  | {
      type: "video";
      provider: "direct";
      src: string;
      mimeType?: string;
    };

function parseUrl(rawUrl: string) {
  const value = rawUrl.trim();
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function getYoutubeVideoId(url: URL) {
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id || null;
  }

  if (
    host === "youtube.com" ||
    host === "www.youtube.com" ||
    host === "m.youtube.com"
  ) {
    if (url.pathname === "/watch") {
      return url.searchParams.get("v")?.trim() || null;
    }

    const embedMatch = url.pathname.match(/^\/embed\/([^/?#]+)/i);
    if (embedMatch?.[1]) {
      return embedMatch[1];
    }

    const shortsMatch = url.pathname.match(/^\/shorts\/([^/?#]+)/i);
    if (shortsMatch?.[1]) {
      return shortsMatch[1];
    }
  }

  return null;
}

function getBilibiliVideoId(url: URL) {
  const host = url.hostname.toLowerCase();
  if (!host.endsWith("bilibili.com")) {
    return null;
  }

  const match = url.pathname.match(/\/video\/(BV[0-9A-Za-z]+)/i);
  return match?.[1]?.toUpperCase() ?? null;
}

function resolveDirectVideo(url: URL): ResolvedVideoEmbed | null {
  const path = url.pathname.toLowerCase();
  const extension = path.split(".").pop() ?? "";
  if (!DIRECT_VIDEO_EXTENSIONS.includes(extension)) {
    return null;
  }

  const mimeType =
    extension === "mp4"
      ? "video/mp4"
      : extension === "webm"
        ? "video/webm"
        : extension === "ogg"
          ? "video/ogg"
          : extension === "m4v"
            ? "video/mp4"
            : undefined;

  return {
    type: "video",
    provider: "direct",
    src: url.toString(),
    mimeType,
  };
}

export function resolveVideoEmbed(rawUrl: string): ResolvedVideoEmbed | null {
  const url = parseUrl(rawUrl);
  if (!url) {
    return null;
  }

  const youtubeId = getYoutubeVideoId(url);
  if (youtubeId) {
    return {
      type: "iframe",
      provider: "youtube",
      src: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
      title: "YouTube video",
    };
  }

  const bilibiliId = getBilibiliVideoId(url);
  if (bilibiliId) {
    return {
      type: "iframe",
      provider: "bilibili",
      src: `https://player.bilibili.com/player.html?bvid=${bilibiliId}&page=1`,
      title: "Bilibili video",
    };
  }

  return resolveDirectVideo(url);
}

import type { ResolvedVideoEmbed } from "@/utils/video";

type VideoEmbedProps = {
  embed: ResolvedVideoEmbed;
  className?: string;
};

const IFRAME_ALLOW =
  "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

export function VideoEmbed({ embed, className }: VideoEmbedProps) {
  if (embed.type === "iframe") {
    return (
      <div
        className={["my-6 overflow-hidden rounded-lg bg-slate-100", className]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="aspect-video">
          <iframe
            src={embed.src}
            title={embed.title}
            className="h-full w-full border-0"
            loading="lazy"
            allow={IFRAME_ALLOW}
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <video
      className={["my-6 w-full rounded-lg bg-black", className]
        .filter(Boolean)
        .join(" ")}
      controls
      preload="metadata"
    >
      <source src={embed.src} type={embed.mimeType} />
      您的浏览器不支持 video 标签。
    </video>
  );
}

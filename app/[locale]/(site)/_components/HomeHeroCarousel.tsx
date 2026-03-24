"use client";

import { useEffect, useState } from "react";

import { QiniuImage } from "@/components/qiniu-image";

type HomeHeroCarouselItem = {
  id: number;
  imageUrl: string | null;
  linkUrl: string | null;
  title: string;
  subtitle: string;
};

type HomeHeroCarouselProps = {
  items: HomeHeroCarouselItem[];
  autoAdvanceMs?: number;
};

export function HomeHeroCarousel({
  items,
  autoAdvanceMs = 7000,
}: HomeHeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % items.length);
    }, autoAdvanceMs);

    return () => window.clearInterval(timer);
  }, [autoAdvanceMs, items.length]);

  const activeItem = items[activeIndex];

  if (!activeItem) {
    return null;
  }

  const Content = (
    <>
      <QiniuImage
        key={activeItem.id}
        src={activeItem.imageUrl}
        alt={activeItem.title}
        variant="hero"
        priority
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/20 via-black/55 to-black/80" />
      <div className="relative z-10 flex h-full items-end px-6 pb-16 md:pb-24">
        <div
          className="mx-auto w-full max-w-6xl space-y-4 text-left text-white"
          style={{
            fontFamily:
              "SF Pro Display, SF Pro Text, -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif",
          }}
        >
          <h1 className="text-4xl leading-tight font-semibold md:text-6xl">
            {activeItem.title}
          </h1>
          <p className="max-w-2xl text-lg font-medium text-white/85 md:text-2xl">
            {activeItem.subtitle}
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <div className="absolute inset-0">
        {activeItem.linkUrl ? (
          <a
            href={activeItem.linkUrl}
            className="absolute inset-0 block transition-opacity duration-700"
          >
            {Content}
          </a>
        ) : (
          <div className="absolute inset-0 transition-opacity duration-700">
            {Content}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-10 flex items-center justify-center gap-2">
        {items.map((item, index) => (
          <span
            key={item.id}
            className={`h-1 rounded-full bg-white/80 transition-all duration-500 ${
              index === activeIndex ? "w-10 opacity-100" : "w-6 opacity-45"
            }`}
          />
        ))}
      </div>
    </>
  );
}

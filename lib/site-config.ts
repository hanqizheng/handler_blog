import { cache } from "react";
import { and, asc, desc, eq, ne } from "drizzle-orm";

import { siteContact } from "@/constants/site";
import { db } from "@/db";
import { friendLinks, products, siteProfiles } from "@/db/schema";

export type FooterFriendLink = {
  id: string;
  name: string;
  href: string;
  iconUrl: string;
};

export const getLatestSiteProfile = cache(async () => {
  const [profile] = await db
    .select()
    .from(siteProfiles)
    .orderBy(desc(siteProfiles.id))
    .limit(1);

  return profile ?? null;
});

export const getSiteContactConfig = cache(async () => {
  const profile = await getLatestSiteProfile();

  return {
    phone: profile?.phone?.trim() || siteContact.phone,
    email: profile?.email?.trim() || siteContact.email,
  };
});

export const getFooterFriendLinks = cache(async () => {
  const productItems = await db
    .select({
      id: products.id,
      name: products.name,
      href: products.linkUrl,
      iconUrl: products.logoUrl,
      sortOrder: products.sortOrder,
    })
    .from(products)
    .where(and(eq(products.isActive, 1), ne(products.linkUrl, "")))
    .orderBy(asc(products.sortOrder), desc(products.id));

  const customItems = await db
    .select({
      id: friendLinks.id,
      name: friendLinks.name,
      href: friendLinks.url,
      iconUrl: friendLinks.iconUrl,
      sortOrder: friendLinks.sortOrder,
    })
    .from(friendLinks)
    .where(and(eq(friendLinks.isActive, 1), ne(friendLinks.url, "")))
    .orderBy(asc(friendLinks.sortOrder), desc(friendLinks.id));

  const combined = [
    ...productItems.map((item) => ({
      id: `product-${item.id}`,
      name: item.name,
      href: item.href,
      iconUrl: item.iconUrl,
      sortOrder: item.sortOrder,
      sourcePriority: 0,
    })),
    ...customItems.map((item) => ({
      id: `custom-${item.id}`,
      name: item.name,
      href: item.href,
      iconUrl: item.iconUrl,
      sortOrder: item.sortOrder,
      sourcePriority: 1,
    })),
  ]
    .filter((item) => Boolean(item.name.trim() && item.href.trim()))
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        a.sourcePriority - b.sourcePriority ||
        a.name.localeCompare(b.name, "zh-CN"),
    )
    .map(
      (item): FooterFriendLink => ({
        id: item.id,
        name: item.name.trim(),
        href: item.href.trim(),
        iconUrl: item.iconUrl.trim(),
      }),
    );

  return combined;
});

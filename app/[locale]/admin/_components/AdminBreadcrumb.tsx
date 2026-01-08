"use client";

import { Fragment } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Link, usePathname } from "@/i18n/navigation";

import {
  ADMIN_NAV_ITEMS,
  ADMIN_ROOT_LABEL,
  ADMIN_ROOT_PATH,
} from "./admin-nav";
import { normalizeAdminPathname } from "./admin-path";

const navLabelMap = new Map(
  ADMIN_NAV_ITEMS.map((item) => [item.href, item.label]),
);

function formatSegmentLabel(segment: string) {
  try {
    return decodeURIComponent(segment).replace(/-/g, " ");
  } catch {
    return segment.replace(/-/g, " ");
  }
}

export function AdminBreadcrumb() {
  const pathname = normalizeAdminPathname(usePathname() ?? ADMIN_ROOT_PATH);
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "admin") {
    return null;
  }

  const crumbs: Array<{
    label: string;
    href?: string;
    isCurrent: boolean;
  }> = [];

  if (segments.length === 1) {
    crumbs.push({ label: ADMIN_ROOT_LABEL, isCurrent: true });
  } else {
    crumbs.push({
      label: ADMIN_ROOT_LABEL,
      href: ADMIN_ROOT_PATH,
      isCurrent: false,
    });

    const pathParts: string[] = [];
    const tailSegments = segments.slice(1);

    tailSegments.forEach((segment, index) => {
      pathParts.push(segment);
      const href = `${ADMIN_ROOT_PATH}/${pathParts.join("/")}`;
      const label = navLabelMap.get(href) ?? formatSegmentLabel(segment);
      const isCurrent = index === tailSegments.length - 1;

      crumbs.push({ label, href: isCurrent ? undefined : href, isCurrent });
    });
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={`${crumb.label}-${index}`}>
            <BreadcrumbItem>
              {crumb.isCurrent ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href ?? ADMIN_ROOT_PATH}>
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {index < crumbs.length - 1 ? <BreadcrumbSeparator /> : null}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

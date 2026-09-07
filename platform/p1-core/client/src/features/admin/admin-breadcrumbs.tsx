import React from "react";
import { Link, useLocation } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { AdminCommandItem } from "@/features/admin/admin-command-palette";

interface AdminBreadcrumbsProps {
  items: AdminCommandItem[];
}

export function findAdminBreadcrumbTarget(items: AdminCommandItem[], location: string) {
  const pathname = location.split("?")[0];
  return items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

export function AdminBreadcrumbs({ items }: AdminBreadcrumbsProps) {
  const [location] = useLocation();
  const current = findAdminBreadcrumbTarget(items, location);

  if (!current || current.href === "/admin") {
    return null;
  }

  return (
    <div className="admin-breadcrumbs border-b bg-background/80 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/admin">Admin</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <span>{current.groupLabel}</span>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{current.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

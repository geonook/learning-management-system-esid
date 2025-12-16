"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ElementType;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Breadcrumb navigation component
 *
 * @example
 * <Breadcrumb items={[
 *   { label: "Head Teacher", href: "/head/overview", icon: Home },
 *   { label: "GradeBand Statistics", href: "/head/gradeband" },
 *   { label: "Class Statistics" }
 * ]} />
 */
export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn("flex items-center text-sm text-text-secondary", className)}
    >
      <ol className="flex items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-text-tertiary flex-shrink-0" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 hover:text-text-primary transition-colors"
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "flex items-center gap-1.5",
                    isLast && "text-text-primary font-medium"
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Pre-configured breadcrumb for Head Teacher GradeBand pages
 */
interface HeadBreadcrumbProps {
  currentPage: string;
  gradeBandDisplay?: string;
  className?: string;
}

export function HeadGradeBandBreadcrumb({
  currentPage,
  gradeBandDisplay,
  className,
}: HeadBreadcrumbProps) {
  const items: BreadcrumbItem[] = [
    { label: "Head Teacher", href: "/head/overview", icon: Home },
    {
      label: gradeBandDisplay ? `GradeBand Statistics (${gradeBandDisplay})` : "GradeBand Statistics",
      href: "/head/gradeband"
    },
    { label: currentPage },
  ];

  return <Breadcrumb items={items} className={className} />;
}

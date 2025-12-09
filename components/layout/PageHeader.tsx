"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  backHref,
  backLabel = "Back",
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "bg-surface-primary/80 dark:bg-slate-900/60 backdrop-blur-sm border-b border-[rgb(var(--border-default))] px-6 py-4",
        className
      )}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-text-secondary mb-2">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-3.5 h-3.5 mx-1 text-text-tertiary" />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-text-primary transition-colors duration-normal ease-apple"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-text-primary font-medium">
                  {crumb.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Back link */}
          {backHref && (
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors duration-normal ease-apple mb-1"
            >
              <ChevronLeft className="w-4 h-4" />
              {backLabel}
            </Link>
          )}

          {/* Title */}
          <h1 className="text-xl font-semibold text-text-primary truncate">
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-sm text-text-secondary mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Actions */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

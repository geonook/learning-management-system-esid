"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface StatNavCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

export function StatNavCard({
  title,
  description,
  icon: Icon,
  href,
  color,
}: StatNavCardProps) {
  return (
    <Link href={href}>
      <div className="group bg-surface-secondary hover:bg-surface-hover border border-border-default rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:border-border-hover cursor-pointer h-full">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center mb-4`}>
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-text-secondary line-clamp-2">
          {description}
        </p>
        <div className="mt-4 text-sm text-indigo-500 dark:text-indigo-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          View →
        </div>
      </div>
    </Link>
  );
}

interface QuickStatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  subtitle?: string;
}

export function QuickStatCard({
  label,
  value,
  icon: Icon,
  color,
  subtitle,
}: QuickStatCardProps) {
  return (
    <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-text-secondary text-sm">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-text-primary">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-text-tertiary mt-1">{subtitle}</div>
      )}
    </div>
  );
}

"use client";

/**
 * PeriodTree Component
 *
 * Displays academic periods in a hierarchical tree structure:
 * Year > Semester > Term
 */

import { useState, useMemo } from "react";
import { PeriodCard } from "./PeriodCard";
import type { AcademicPeriod, PeriodTreeNode } from "@/types/academic-period";

interface PeriodTreeProps {
  periods: AcademicPeriod[];
  onLock: (period: AcademicPeriod) => void;
  onUnlock: (period: AcademicPeriod) => void;
  onSetDeadline: (period: AcademicPeriod) => void;
  onConfigureDates?: (period: AcademicPeriod) => void;
}

export function PeriodTree({
  periods,
  onLock,
  onUnlock,
  onSetDeadline,
  onConfigureDates,
}: PeriodTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Build tree structure
  const tree = useMemo(() => buildTree(periods), [periods]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Expand all by default on first render
  useMemo(() => {
    const allIds = new Set(periods.map((p) => p.id));
    setExpandedIds(allIds);
  }, [periods]);

  if (tree.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No academic year data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tree.map((node) => (
        <PeriodTreeNode
          key={node.period.id}
          node={node}
          expandedIds={expandedIds}
          onToggleExpand={toggleExpand}
          onLock={onLock}
          onUnlock={onUnlock}
          onSetDeadline={onSetDeadline}
          onConfigureDates={onConfigureDates}
          depth={0}
        />
      ))}
    </div>
  );
}

interface PeriodTreeNodeProps {
  node: PeriodTreeNode;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onLock: (period: AcademicPeriod) => void;
  onUnlock: (period: AcademicPeriod) => void;
  onSetDeadline: (period: AcademicPeriod) => void;
  onConfigureDates?: (period: AcademicPeriod) => void;
  depth: number;
}

function PeriodTreeNode({
  node,
  expandedIds,
  onToggleExpand,
  onLock,
  onUnlock,
  onSetDeadline,
  onConfigureDates,
  depth,
}: PeriodTreeNodeProps) {
  const isExpanded = expandedIds.has(node.period.id);
  const hasChildren = node.children.length > 0;

  return (
    <PeriodCard
      period={node.period}
      isExpanded={isExpanded}
      onToggleExpand={hasChildren ? () => onToggleExpand(node.period.id) : undefined}
      onLock={() => onLock(node.period)}
      onUnlock={() => onUnlock(node.period)}
      onSetDeadline={() => onSetDeadline(node.period)}
      onConfigureDates={onConfigureDates ? () => onConfigureDates(node.period) : undefined}
      depth={depth}
    >
      {hasChildren &&
        isExpanded &&
        node.children.map((child) => (
          <PeriodTreeNode
            key={child.period.id}
            node={child}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onLock={onLock}
            onUnlock={onUnlock}
            onSetDeadline={onSetDeadline}
            onConfigureDates={onConfigureDates}
            depth={depth + 1}
          />
        ))}
    </PeriodCard>
  );
}

/**
 * Build tree structure from flat list of periods
 */
function buildTree(periods: AcademicPeriod[]): PeriodTreeNode[] {
  // Group by type
  const years = periods.filter((p) => p.periodType === "year");
  const semesters = periods.filter((p) => p.periodType === "semester");
  const terms = periods.filter((p) => p.periodType === "term");

  // Build tree for each year
  return years.map((year) => {
    const yearSemesters = semesters
      .filter((s) => s.academicYear === year.academicYear)
      .sort((a, b) => (a.semester || 0) - (b.semester || 0));

    return {
      period: year,
      children: yearSemesters.map((semester) => {
        const semesterTerms = terms
          .filter(
            (t) =>
              t.academicYear === semester.academicYear &&
              t.semester === semester.semester
          )
          .sort((a, b) => (a.term || 0) - (b.term || 0));

        return {
          period: semester,
          children: semesterTerms.map((term) => ({
            period: term,
            children: [],
          })),
        };
      }),
    };
  });
}

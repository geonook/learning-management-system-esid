"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Clock, UserX, Stethoscope, TrendingUp } from "lucide-react";
import type { AttendanceSummary } from "@/lib/api/attendance";

interface AttendanceStatsProps {
  summary: AttendanceSummary;
  compact?: boolean;
}

export function AttendanceStats({
  summary,
  compact = false,
}: AttendanceStatsProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-4 text-sm">
        <span className="text-green-600 dark:text-green-400">
          {summary.present} Present
        </span>
        <span className="text-yellow-600 dark:text-yellow-400">
          {summary.late} Late
        </span>
        <span className="text-red-600 dark:text-red-400">
          {summary.absent} Absent
        </span>
        <span className="text-blue-600 dark:text-blue-400">
          {summary.sick} Sick
        </span>
        <span className="text-muted-foreground">
          ({summary.presentRate}% attendance)
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Users className="w-4 h-4" />
            Present
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {summary.present}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Late
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {summary.late}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <UserX className="w-4 h-4" />
            Absent
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {summary.absent}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Stethoscope className="w-4 h-4" />
            Sick
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {summary.sick}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.presentRate}%</div>
        </CardContent>
      </Card>
    </div>
  );
}

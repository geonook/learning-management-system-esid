"use client";

/**
 * Academic Period Management Page
 *
 * Admin page for managing academic periods (lock/unlock, set deadlines).
 */

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  PeriodTree,
  LockModal,
  UnlockModal,
  DeadlineEditor,
} from "@/components/academic-period";
import { DateConfigEditor } from "@/components/academic-period/DateConfigEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Calendar, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type {
  AcademicPeriod,
  AcademicPeriodRow,
} from "@/types/academic-period";
import { getCurrentAcademicYear } from "@/types/academic-year";
import {
  changePeriodStatus,
  unlockPeriod as unlockPeriodAction,
  setLockDeadline,
  toggleAutoLock,
  createAcademicYearPeriods,
} from "@/lib/actions/academic-period";

export default function PeriodsPage() {
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Modal states
  const [lockModalPeriod, setLockModalPeriod] = useState<AcademicPeriod | null>(
    null
  );
  const [unlockModalPeriod, setUnlockModalPeriod] =
    useState<AcademicPeriod | null>(null);
  const [deadlineModalPeriod, setDeadlineModalPeriod] =
    useState<AcademicPeriod | null>(null);
  const [dateConfigPeriod, setDateConfigPeriod] =
    useState<AcademicPeriod | null>(null);

  // Fetch academic years
  const fetchAcademicYears = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("academic_periods")
      .select("academic_year")
      .order("academic_year", { ascending: false });

    const years = [...new Set((data || []).map((d) => d.academic_year))];

    // If no years exist, add current year
    if (years.length === 0) {
      const currentYear = getCurrentAcademicYear();
      years.push(currentYear);
    }

    setAcademicYears(years);

    // Select current year or first available
    if (!selectedYear) {
      const currentYear = getCurrentAcademicYear();
      setSelectedYear(years.includes(currentYear) ? currentYear : years[0]);
    }
  }, [selectedYear]);

  // Fetch periods for selected year
  const fetchPeriods = useCallback(async () => {
    if (!selectedYear) return;

    setIsLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("academic_periods")
      .select("*")
      .eq("academic_year", selectedYear)
      .order("period_type", { ascending: true })
      .order("semester", { ascending: true, nullsFirst: true })
      .order("term", { ascending: true, nullsFirst: true });

    if (error) {
      toast({
        title: "Load Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Convert to typed objects
    const typedPeriods = (data || []).map((row) =>
      toAcademicPeriod(row as AcademicPeriodRow)
    );

    setPeriods(typedPeriods);
    setIsLoading(false);
  }, [selectedYear, toast]);

  useEffect(() => {
    fetchAcademicYears();
  }, [fetchAcademicYears]);

  useEffect(() => {
    if (selectedYear) {
      fetchPeriods();
    }
  }, [selectedYear, fetchPeriods]);

  // Handle lock
  const handleLock = async (reason?: string) => {
    if (!lockModalPeriod) return;

    const result = await changePeriodStatus({
      periodId: lockModalPeriod.id,
      newStatus: "locked",
      reason,
    });

    if (result.success) {
      toast({
        title: "Locked Successfully",
        description: "Period has been locked",
      });
      fetchPeriods();
    } else {
      toast({
        title: "Lock Failed",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  // Handle unlock
  const handleUnlock = async (reason: string) => {
    if (!unlockModalPeriod) return;

    const result = await unlockPeriodAction({
      periodId: unlockModalPeriod.id,
      reason,
    });

    if (result.success) {
      toast({
        title: "Unlocked Successfully",
        description: "Period has been unlocked",
      });
      fetchPeriods();
    } else {
      toast({
        title: "Unlock Failed",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  // Handle deadline save
  const handleDeadlineSave = async (
    deadline: string | null,
    autoLockEnabled: boolean
  ) => {
    if (!deadlineModalPeriod) return;

    // Save deadline
    if (deadline !== deadlineModalPeriod.lockDeadline) {
      const result = await setLockDeadline({
        periodId: deadlineModalPeriod.id,
        deadline: deadline || "",
      });

      if (!result.success) {
        toast({
          title: "Save Failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
    }

    // Save auto-lock setting
    if (autoLockEnabled !== deadlineModalPeriod.autoLockEnabled) {
      const result = await toggleAutoLock(
        deadlineModalPeriod.id,
        autoLockEnabled
      );

      if (!result.success) {
        toast({
          title: "Save Failed",
          description: result.error,
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Saved Successfully",
      description: "Deadline has been updated",
    });
    fetchPeriods();
  };

  // Create periods for new academic year
  const handleCreateYear = async () => {
    const currentYear = getCurrentAcademicYear();
    const result = await createAcademicYearPeriods(currentYear);

    if (result.success) {
      toast({
        title: "Created Successfully",
        description: `Created periods for ${currentYear} academic year`,
      });
      fetchAcademicYears();
      setSelectedYear(currentYear);
    } else {
      toast({
        title: "Create Failed",
        description: result.error,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Academic Period Management</h1>
          <p className="text-muted-foreground">
            Manage lock status and deadlines for academic years, semesters, and terms
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPeriods}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>

          <Button variant="outline" size="sm" onClick={handleCreateYear}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Year
          </Button>
        </div>
      </div>

      {/* Year selector */}
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Select Academic Year
            </CardTitle>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Period tree */}
      <Card>
        <CardHeader>
          <CardTitle>Period Management</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : periods.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No period data available</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleCreateYear}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create {selectedYear || getCurrentAcademicYear()} Year
              </Button>
            </div>
          ) : (
            <PeriodTree
              periods={periods}
              onLock={setLockModalPeriod}
              onUnlock={setUnlockModalPeriod}
              onSetDeadline={setDeadlineModalPeriod}
              onConfigureDates={setDateConfigPeriod}
            />
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <LockModal
        period={lockModalPeriod}
        isOpen={!!lockModalPeriod}
        onClose={() => setLockModalPeriod(null)}
        onConfirm={handleLock}
      />

      <UnlockModal
        period={unlockModalPeriod}
        isOpen={!!unlockModalPeriod}
        onClose={() => setUnlockModalPeriod(null)}
        onConfirm={handleUnlock}
      />

      <DeadlineEditor
        period={deadlineModalPeriod}
        isOpen={!!deadlineModalPeriod}
        onClose={() => setDeadlineModalPeriod(null)}
        onSave={handleDeadlineSave}
      />

      <DateConfigEditor
        period={dateConfigPeriod}
        isOpen={!!dateConfigPeriod}
        onClose={() => setDateConfigPeriod(null)}
        onSave={fetchPeriods}
      />
    </div>
  );
}

// Helper function for this page (re-export from types)
function toAcademicPeriod(row: AcademicPeriodRow): AcademicPeriod {
  return {
    id: row.id,
    academicYear: row.academic_year,
    periodType: row.period_type,
    semester: row.semester,
    term: row.term,
    status: row.status,
    statusChangedAt: row.status_changed_at,
    statusChangedBy: row.status_changed_by,
    startDate: row.start_date,
    endDate: row.end_date,
    lockDeadline: row.lock_deadline,
    warningDays: row.warning_days,
    fallStartDate: row.fall_start_date,
    fallEndDate: row.fall_end_date,
    springStartDate: row.spring_start_date,
    springEndDate: row.spring_end_date,
    autoLockEnabled: row.auto_lock_enabled,
    autoLockedAt: row.auto_locked_at,
    statusHistory: row.status_history || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

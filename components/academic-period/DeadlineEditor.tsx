"use client";

/**
 * DeadlineEditor Component
 *
 * Dialog for setting lock deadline.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock } from "lucide-react";
import type { AcademicPeriod } from "@/types/academic-period";
import { getPeriodDisplayName } from "@/types/academic-period";

interface DeadlineEditorProps {
  period: AcademicPeriod | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (deadline: string | null, autoLockEnabled: boolean) => Promise<void>;
}

export function DeadlineEditor({
  period,
  isOpen,
  onClose,
  onSave,
}: DeadlineEditorProps) {
  const [deadline, setDeadline] = useState("");
  const [time, setTime] = useState("23:59");
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize from period data
  useEffect(() => {
    if (period?.lockDeadline) {
      const date = new Date(period.lockDeadline);
      const dateStr = date.toISOString().split("T")[0];
      const timeStr = date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setDeadline(dateStr || "");
      setTime(timeStr || "23:59");
    } else {
      // Default to 2 weeks from now
      const twoWeeks = new Date();
      twoWeeks.setDate(twoWeeks.getDate() + 14);
      const dateStr = twoWeeks.toISOString().split("T")[0];
      setDeadline(dateStr || "");
      setTime("23:59");
    }
    setAutoLockEnabled(period?.autoLockEnabled ?? true);
  }, [period]);

  if (!period) return null;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      let deadlineISO: string | null = null;

      if (deadline) {
        const dateTime = new Date(`${deadline}T${time}:00`);
        deadlineISO = dateTime.toISOString();
      }

      await onSave(deadlineISO, autoLockEnabled);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearDeadline = async () => {
    setIsLoading(true);
    try {
      await onSave(null, false);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Set Deadline
          </DialogTitle>
          <DialogDescription>
            Set lock deadline for <strong>{getPeriodDisplayName(period)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Date input */}
          <div className="space-y-2">
            <Label htmlFor="deadline-date">Deadline Date</Label>
            <Input
              id="deadline-date"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* Time input */}
          <div className="space-y-2">
            <Label htmlFor="deadline-time">Deadline Time</Label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                id="deadline-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-32"
              />
            </div>
          </div>

          {/* Auto-lock toggle */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <Label htmlFor="auto-lock" className="font-medium">
                Auto-lock
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically lock this period after the deadline
              </p>
            </div>
            <Checkbox
              id="auto-lock"
              checked={autoLockEnabled}
              onCheckedChange={(checked) => setAutoLockEnabled(checked === true)}
            />
          </div>

          {/* Preview */}
          {deadline && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
              <p className="text-blue-700">
                Deadline:{" "}
                {new Date(`${deadline}T${time}:00`).toLocaleString("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              {autoLockEnabled && (
                <p className="text-blue-600 mt-1">
                  Will auto-lock after the deadline
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={handleClearDeadline}
            disabled={isLoading}
            className="mr-auto"
          >
            Clear Deadline
          </Button>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

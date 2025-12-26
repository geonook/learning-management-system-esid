"use client";

/**
 * LockModal Component
 *
 * Confirmation dialog for locking a period.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Lock } from "lucide-react";
import type { AcademicPeriod } from "@/types/academic-period";
import { getPeriodDisplayName } from "@/types/academic-period";

interface LockModalProps {
  period: AcademicPeriod | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
}

export function LockModal({
  period,
  isOpen,
  onClose,
  onConfirm,
}: LockModalProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!period) return null;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm(reason || undefined);
      setReason("");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-red-500" />
            Confirm Lock
          </DialogTitle>
          <DialogDescription>
            You are about to lock <strong>{getPeriodDisplayName(period)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Important Notes</p>
              <ul className="mt-1 text-amber-700 space-y-1">
                <li>Once locked, teachers cannot edit grades, attendance, etc. for this period</li>
                <li>Only administrators can unlock</li>
                {period.periodType === "semester" && (
                  <li>Locking a semester will also lock all its terms</li>
                )}
                {period.periodType === "year" && (
                  <li>Locking a year will also lock all semesters and terms</li>
                )}
              </ul>
            </div>
          </div>

          {/* Optional reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter lock reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing..." : "Confirm Lock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

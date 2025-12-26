"use client";

/**
 * UnlockModal Component
 *
 * Dialog for unlocking a period (requires reason).
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
import { Unlock, Info } from "lucide-react";
import type { AcademicPeriod } from "@/types/academic-period";
import { getPeriodDisplayName } from "@/types/academic-period";

interface UnlockModalProps {
  period: AcademicPeriod | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function UnlockModal({
  period,
  isOpen,
  onClose,
  onConfirm,
}: UnlockModalProps) {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!period) return null;

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError("Please enter a reason for unlocking");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setReason("");
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-green-500" />
            Unlock Period
          </DialogTitle>
          <DialogDescription>
            You are about to unlock <strong>{getPeriodDisplayName(period)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p>After unlocking, teachers can continue editing data for this period.</p>
              <p className="mt-1">Unlock history will be saved for future reference.</p>
            </div>
          </div>

          {/* Required reason */}
          <div className="space-y-2">
            <Label htmlFor="unlock-reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="unlock-reason"
              placeholder="Enter reason for unlocking..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError(null);
              }}
              rows={3}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "Processing..." : "Confirm Unlock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
      setError("請輸入解鎖原因");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "解鎖失敗");
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
            解鎖時間段
          </DialogTitle>
          <DialogDescription>
            您即將解鎖 <strong>{getPeriodDisplayName(period)}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info */}
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p>解鎖後，老師可以繼續編輯該時間段的資料。</p>
              <p className="mt-1">解鎖記錄將被保存以供日後查閱。</p>
            </div>
          </div>

          {/* Required reason */}
          <div className="space-y-2">
            <Label htmlFor="unlock-reason">
              解鎖原因 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="unlock-reason"
              placeholder="請說明解鎖原因..."
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
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? "處理中..." : "確認解鎖"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

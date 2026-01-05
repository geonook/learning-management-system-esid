"use client"

/**
 * DateConfigEditor Component
 *
 * Admin-only modal for editing academic year date configuration.
 * Allows setting start/end dates for:
 * - Academic year (Aug 1 - Jul 31)
 * - Fall semester (Sep - Jan)
 * - Spring semester (Feb - Jun)
 */

import { useState, useEffect } from "react"
import { Calendar, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  updateAcademicYearDates,
  getAcademicYearDates,
  type UpdateYearDatesInput,
} from "@/lib/actions/academic-year-config"
import type { AcademicPeriod } from "@/types/academic-period"

interface DateConfigEditorProps {
  period: AcademicPeriod | null
  isOpen: boolean
  onClose: () => void
  onSave?: () => void
}

export function DateConfigEditor({
  period,
  isOpen,
  onClose,
  onSave,
}: DateConfigEditorProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<UpdateYearDatesInput>({
    academicYear: "",
    startDate: "",
    endDate: "",
    fallStartDate: "",
    fallEndDate: "",
    springStartDate: "",
    springEndDate: "",
  })

  // Load current dates when modal opens
  useEffect(() => {
    if (isOpen && period?.academicYear) {
      loadDates(period.academicYear)
    }
  }, [isOpen, period?.academicYear])

  async function loadDates(academicYear: string) {
    setLoading(true)
    try {
      const result = await getAcademicYearDates(academicYear)
      if (result.success && result.data) {
        setFormData(result.data)
      } else {
        // Set defaults based on academic year
        const [startYearStr] = academicYear.split("-")
        const startYear = parseInt(startYearStr ?? "2025", 10)
        setFormData({
          academicYear,
          startDate: `${startYear}-08-01`,
          endDate: `${startYear + 1}-07-31`,
          fallStartDate: `${startYear}-09-01`,
          fallEndDate: `${startYear + 1}-01-31`,
          springStartDate: `${startYear + 1}-02-01`,
          springEndDate: `${startYear + 1}-06-30`,
        })
      }
    } catch (error) {
      console.error("Failed to load dates:", error)
      toast.error("Failed to load date configuration")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const result = await updateAcademicYearDates(formData)
      if (result.success) {
        toast.success("Date configuration saved successfully")
        onSave?.()
        onClose()
      } else {
        toast.error(result.error || "Failed to save configuration")
      }
    } catch (error) {
      console.error("Failed to save dates:", error)
      toast.error("Failed to save date configuration")
    } finally {
      setSaving(false)
    }
  }

  function handleChange(field: keyof UpdateYearDatesInput, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (!period) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configure Dates: {period.academicYear}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Academic Year Range */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                Academic Year Range
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => handleChange("endDate", e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Typically Aug 1 to Jul 31 of the following year
              </p>
            </div>

            {/* Fall Semester */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                Fall Semester (上學期)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fallStartDate">Start Date</Label>
                  <Input
                    id="fallStartDate"
                    type="date"
                    value={formData.fallStartDate}
                    onChange={(e) =>
                      handleChange("fallStartDate", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fallEndDate">End Date</Label>
                  <Input
                    id="fallEndDate"
                    type="date"
                    value={formData.fallEndDate}
                    onChange={(e) =>
                      handleChange("fallEndDate", e.target.value)
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Typically early September to late January
              </p>
            </div>

            {/* Spring Semester */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground">
                Spring Semester (下學期)
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="springStartDate">Start Date</Label>
                  <Input
                    id="springStartDate"
                    type="date"
                    value={formData.springStartDate}
                    onChange={(e) =>
                      handleChange("springStartDate", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="springEndDate">End Date</Label>
                  <Input
                    id="springEndDate"
                    type="date"
                    value={formData.springEndDate}
                    onChange={(e) =>
                      handleChange("springEndDate", e.target.value)
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Typically mid-February to late June
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

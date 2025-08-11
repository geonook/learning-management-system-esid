"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { useAppStore, type AssessmentTitles } from "@/lib/store"
import { Settings } from "lucide-react"

export default function AssessmentTitlesDialog() {
  const [open, setOpen] = useState(false)
  const assessmentTitles = useAppStore((s) => s.assessmentTitles)
  const setAssessmentTitles = useAppStore((s) => s.setAssessmentTitles)
  const resetAssessmentTitles = useAppStore((s) => s.resetAssessmentTitles)

  const [localTitles, setLocalTitles] = useState<AssessmentTitles>(assessmentTitles)

  const handleSave = () => {
    setAssessmentTitles(localTitles)
    setOpen(false)
  }

  const handleReset = () => {
    resetAssessmentTitles()
    setLocalTitles({
      FA: Array.from({ length: 8 }, (_, i) => `F.A.${i + 1}`),
      SA: Array.from({ length: 4 }, (_, i) => `S.A.${i + 1}`),
      final: "Final",
    })
  }

  const updateFATitle = (index: number, value: string) => {
    setLocalTitles(prev => ({
      ...prev,
      FA: prev.FA.map((title, i) => i === index ? value : title)
    }))
  }

  const updateSATitle = (index: number, value: string) => {
    setLocalTitles(prev => ({
      ...prev,
      SA: prev.SA.map((title, i) => i === index ? value : title)
    }))
  }

  const updateFinalTitle = (value: string) => {
    setLocalTitles(prev => ({ ...prev, final: value }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" /> Assessment Titles
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize Assessment Titles</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <Label className="text-base font-semibold">Formative Assessments (F.A.)</Label>
            <div className="grid gap-3 md:grid-cols-2 mt-2">
              {localTitles.FA.map((title, index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`fa-${index}`}>F.A.{index + 1}</Label>
                  <Input
                    id={`fa-${index}`}
                    value={title}
                    onChange={(e) => updateFATitle(index, e.target.value)}
                    placeholder={`F.A.${index + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold">Summative Assessments (S.A.)</Label>
            <div className="grid gap-3 md:grid-cols-2 mt-2">
              {localTitles.SA.map((title, index) => (
                <div key={index} className="space-y-2">
                  <Label htmlFor={`sa-${index}`}>S.A.{index + 1}</Label>
                  <Input
                    id={`sa-${index}`}
                    value={title}
                    onChange={(e) => updateSATitle(index, e.target.value)}
                    placeholder={`S.A.${index + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold">Final Assessment</Label>
            <div className="mt-2">
              <Input
                value={localTitles.final}
                onChange={(e) => updateFinalTitle(e.target.value)}
                placeholder="Final"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handleReset} suppressHydrationWarning>
            Reset to Default
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)} suppressHydrationWarning>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
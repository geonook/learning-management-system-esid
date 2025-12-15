"use client"

import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { useTheme } from "next-themes"

export default function SettingsPage() {
  const passThreshold = useAppStore((s) => s.passThreshold)
  const setPassThreshold = useAppStore((s) => s.setPassThreshold)
  const { theme, setTheme } = useTheme()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Term / Year</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Label>Term</Label>
            <Select defaultValue="Term 1">
              <SelectTrigger>
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                {["Term 1", "Term 2", "Term 3"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Year</Label>
            <Select defaultValue="2025">
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {["2024", "2025", "2026"].map((y) => (
                  <SelectItem key={y} value={y}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pass Threshold</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-2">Affects pass rate visuals only.</div>
            <Slider value={[passThreshold]} onValueChange={(v) => setPassThreshold(v[0] || 60)} min={0} max={100} step={1} />
            <div className="mt-2 text-sm">
              Current: <b>{passThreshold}</b>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Select value={theme} onValueChange={(v) => setTheme(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Theme" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">Light/Dark/System toggle</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
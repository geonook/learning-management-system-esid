"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

type Role = "admin" | "head" | "teacher"
type Track = "local" | "international"

type Selections = { 
  grade: string
  klass: string
  track: Track
}

export type AssessmentTitles = {
  FA: string[]
  SA: string[]
  final: string
}

const defaultAssessmentTitles: AssessmentTitles = {
  FA: Array.from({ length: 8 }, (_, i) => `F.A.${i + 1}`),
  SA: Array.from({ length: 4 }, (_, i) => `S.A.${i + 1}`),
  final: "Final",
}

type State = {
  role: Role | null
  selections: Selections
  passThreshold: number
  assessmentTitles: AssessmentTitles
  setRole: (r: Role) => void
  setSelections: (p: Partial<Selections>) => void
  setPassThreshold: (v: number) => void
  setAssessmentTitle: (t: "FA" | "SA" | "Final", index: number, label: string) => void
  setAssessmentTitles: (titles: AssessmentTitles) => void
  resetAssessmentTitles: () => void
}

export const useAppStore = create<State>()(
  persist(
    (set, get) => ({
      role: null,
      selections: { grade: "1", klass: "Trailblazers", track: "local" },
      passThreshold: 60,
      assessmentTitles: defaultAssessmentTitles,
      setRole: (role) => set({ role }),
      setSelections: (p) => set((s) => ({ selections: { ...s.selections, ...p } })),
      setPassThreshold: (v) => set({ passThreshold: v }),
      setAssessmentTitle: (t, index, label) =>
        set((s) => {
          if (t === "Final") return { assessmentTitles: { ...s.assessmentTitles, final: label || "Final" } }
          const key = t as "FA" | "SA"
          const arr = [...s.assessmentTitles[key]]
          if (index >= 0 && index < arr.length) arr[index] = label || arr[index] || ""
          return { assessmentTitles: { ...s.assessmentTitles, [key]: arr } as AssessmentTitles }
        }),
      setAssessmentTitles: (titles) => set({ assessmentTitles: titles }),
      resetAssessmentTitles: () => set({ assessmentTitles: defaultAssessmentTitles }),
    }),
    {
      name: "lms-esid-store",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
)
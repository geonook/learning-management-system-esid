"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Term } from "@/types/academic-year"
import { getCurrentAcademicYear } from "@/types/academic-year"

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
  // Academic Year + Term state
  selectedAcademicYear: string
  selectedTerm: Term | "all"
  setRole: (r: Role) => void
  setSelections: (p: Partial<Selections>) => void
  setPassThreshold: (v: number) => void
  setAssessmentTitle: (t: "FA" | "SA" | "Final", index: number, label: string) => void
  setAssessmentTitles: (titles: AssessmentTitles) => void
  resetAssessmentTitles: () => void
  // Academic Year + Term setters
  setSelectedAcademicYear: (year: string) => void
  setSelectedTerm: (term: Term | "all") => void
}

export const useAppStore = create<State>()(
  persist(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (set, get) => ({
      role: null,
      selections: { grade: "1", klass: "Trailblazers", track: "local" },
      passThreshold: 60,
      assessmentTitles: defaultAssessmentTitles,
      // Academic Year + Term: default to current values
      // Note: Default term to "all" instead of getCurrentTerm() because:
      // 1. Database may only have data for specific terms (e.g., Term 1 only)
      // 2. getCurrentTerm() returns Term 2 in Dec-Jan, but data may not exist yet
      // 3. Head Overview page relies on fetching exam data by term
      selectedAcademicYear: getCurrentAcademicYear(),
      selectedTerm: "all" as Term | "all",
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
      // Academic Year + Term setters
      setSelectedAcademicYear: (year) => set({ selectedAcademicYear: year }),
      setSelectedTerm: (term) => set({ selectedTerm: term }),
    }),
    {
      name: "lms-esid-store",
      storage: createJSONStorage(() => localStorage),
      version: 4, // Bumped to fix academic year selection (2026-2027 has no data)
      migrate: (persistedState, version) => {
        const state = persistedState as State
        if (version < 2) {
          // Add default values for new fields
          return {
            ...state,
            selectedAcademicYear: getCurrentAcademicYear(),
            selectedTerm: "all" as Term | "all",
          }
        }
        if (version < 3) {
          // Force reset selectedTerm to "all" (fix for Term 2 default causing "No Data")
          return {
            ...state,
            selectedTerm: "all" as Term | "all",
          }
        }
        if (version < 4) {
          // Force reset academic year to current year (fix for 2026-2027 having no data)
          return {
            ...state,
            selectedAcademicYear: getCurrentAcademicYear(),
          }
        }
        return state
      },
    },
  ),
)
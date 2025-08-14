import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import GradeCalculatorPanel from '@/components/grade-calculator-panel'

// Mock the grade calculation functions
vi.mock('@/lib/grade/calculations', () => ({
  calculateGrades: vi.fn((input) => ({
    formativeAvg: 85.0,
    summativeAvg: 90.0,
    semesterGrade: 89.22,
    totalScoresUsed: 5,
    formativeScoresUsed: 2,
    summativeScoresUsed: 2,
    finalScoreUsed: true
  })),
  isValidScore: vi.fn((score) => score !== null && score > 0)
}))

describe('GradeCalculatorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<GradeCalculatorPanel />)
    
    // Check for basic elements
    expect(screen.getByText('Grade Calculation')).toBeInTheDocument()
    expect(screen.getByText(/Weighted calculation using FA\/SA\/FINAL codes/)).toBeInTheDocument()
  })

  it('displays formulas for transparency', () => {
    render(<GradeCalculatorPanel />)
    
    // Should show the calculation formula
    expect(screen.getByText(/Formative Avg = Average of FA scores > 0/)).toBeInTheDocument()
    expect(screen.getByText(/Summative Avg = Average of SA scores > 0/)).toBeInTheDocument()
    expect(screen.getByText(/Semester = \(Formative×0\.15 \+ Summative×0\.2 \+ Final×0\.1\) ÷ 0\.45/)).toBeInTheDocument()
  })

  it('shows student selection', () => {
    render(<GradeCalculatorPanel />)
    
    // Should show student selector
    expect(screen.getByText('Student')).toBeInTheDocument()
    // Check for the student name in the Select component
    expect(screen.getByText(/Alice Chen \(STU-7001\)/)).toBeInTheDocument()
  })

  it('displays formative assessments', () => {
    render(<GradeCalculatorPanel />)
    
    // Should show formative section
    expect(screen.getByText('Formative Assessments')).toBeInTheDocument()
    expect(screen.getByText(/FA1:/)).toBeInTheDocument()
    expect(screen.getByText(/FA2:/)).toBeInTheDocument()
  })

  it('displays summative assessments', () => {
    render(<GradeCalculatorPanel />)
    
    // Should show summative section
    expect(screen.getByText('Summative Assessments')).toBeInTheDocument()
    expect(screen.getByText(/SA1:/)).toBeInTheDocument()
    expect(screen.getByText(/SA2:/)).toBeInTheDocument()
  })

  it('displays final examination', () => {
    render(<GradeCalculatorPanel />)
    
    // Should show final section
    expect(screen.getByText('Final Examination')).toBeInTheDocument()
    expect(screen.getByText(/FINAL:/)).toBeInTheDocument()
  })

  it('displays calculation results', () => {
    render(<GradeCalculatorPanel />)
    
    // Should show result sections
    expect(screen.getByText('Formative')).toBeInTheDocument()
    expect(screen.getByText('Summative')).toBeInTheDocument()
    expect(screen.getByText('Semester')).toBeInTheDocument()
  })

  it('shows score usage statistics', () => {
    render(<GradeCalculatorPanel />)
    
    // Should show usage statistics
    expect(screen.getByText(/Total scores used:/)).toBeInTheDocument()
    expect(screen.getByText(/Only scores > 0 are averaged/)).toBeInTheDocument()
  })

  it('displays weights distribution', () => {
    render(<GradeCalculatorPanel />)
    
    // Should show weight badges
    expect(screen.getByText('Formative 15%')).toBeInTheDocument()
    expect(screen.getByText('Summative 20%')).toBeInTheDocument()
    expect(screen.getByText('Final 10%')).toBeInTheDocument()
  })

  it('renders weights distribution section', () => {
    render(<GradeCalculatorPanel />)
    
    // Should render weights distribution section
    expect(screen.getByText('Weights Distribution')).toBeInTheDocument()
  })
})
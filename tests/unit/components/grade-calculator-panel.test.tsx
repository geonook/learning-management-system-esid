import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
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

  it('renders all assessment input fields', () => {
    render(<GradeCalculatorPanel />)
    
    // Formative assessments
    expect(screen.getByLabelText(/FA1/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/FA2/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/FA3/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/FA4/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/FA5/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/FA6/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/FA7/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/FA8/i)).toBeInTheDocument()
    
    // Summative assessments
    expect(screen.getByLabelText(/SA1/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/SA2/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/SA3/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/SA4/i)).toBeInTheDocument()
    
    // Final assessment
    expect(screen.getByLabelText(/FINAL/i)).toBeInTheDocument()
  })

  it('calculates grades in real-time as user inputs scores', async () => {
    render(<GradeCalculatorPanel />)
    
    // Enter some scores
    const fa1Input = screen.getByLabelText(/FA1/i)
    const sa1Input = screen.getByLabelText(/SA1/i)
    const finalInput = screen.getByLabelText(/FINAL/i)
    
    fireEvent.change(fa1Input, { target: { value: '85' } })
    fireEvent.change(sa1Input, { target: { value: '90' } })
    fireEvent.change(finalInput, { target: { value: '88' } })
    
    // Wait for calculations to update
    await waitFor(() => {
      expect(screen.getByTestId('formative-avg')).toHaveTextContent('85.00')
      expect(screen.getByTestId('summative-avg')).toHaveTextContent('90.00')
      expect(screen.getByTestId('semester-grade')).toHaveTextContent('89.22')
    })
  })

  it('validates score input ranges (0-100)', async () => {
    render(<GradeCalculatorPanel />)
    
    const fa1Input = screen.getByLabelText(/FA1/i)
    
    // Test invalid high score
    fireEvent.change(fa1Input, { target: { value: '150' } })
    fireEvent.blur(fa1Input)
    
    await waitFor(() => {
      expect(screen.getByText(/Score must be between 0 and 100/i)).toBeInTheDocument()
    })
    
    // Test invalid negative score
    fireEvent.change(fa1Input, { target: { value: '-10' } })
    fireEvent.blur(fa1Input)
    
    await waitFor(() => {
      expect(screen.getByText(/Score must be between 0 and 100/i)).toBeInTheDocument()
    })
    
    // Test valid score
    fireEvent.change(fa1Input, { target: { value: '85' } })
    fireEvent.blur(fa1Input)
    
    await waitFor(() => {
      expect(screen.queryByText(/Score must be between 0 and 100/i)).not.toBeInTheDocument()
    })
  })

  it('handles zero scores correctly (excluded from averages)', async () => {
    render(<GradeCalculatorPanel />)
    
    // Enter mix of valid scores and zeros
    const fa1Input = screen.getByLabelText(/FA1/i)
    const fa2Input = screen.getByLabelText(/FA2/i)
    const fa3Input = screen.getByLabelText(/FA3/i)
    
    fireEvent.change(fa1Input, { target: { value: '85' } })
    fireEvent.change(fa2Input, { target: { value: '95' } })
    fireEvent.change(fa3Input, { target: { value: '0' } }) // Should be excluded
    
    await waitFor(() => {
      // Should show that only 2 scores are used in calculation
      expect(screen.getByTestId('formative-scores-used')).toHaveTextContent('2')
    })
  })

  it('displays null averages when no valid scores', async () => {
    render(<GradeCalculatorPanel />)
    
    // Enter only zeros and empty values
    const fa1Input = screen.getByLabelText(/FA1/i)
    const fa2Input = screen.getByLabelText(/FA2/i)
    
    fireEvent.change(fa1Input, { target: { value: '0' } })
    fireEvent.change(fa2Input, { target: { value: '0' } })
    
    await waitFor(() => {
      expect(screen.getByTestId('formative-avg')).toHaveTextContent('--')
      expect(screen.getByTestId('summative-avg')).toHaveTextContent('--')
      expect(screen.getByTestId('semester-grade')).toHaveTextContent('--')
    })
  })

  it('shows score usage statistics', async () => {
    render(<GradeCalculatorPanel />)
    
    // Enter various scores
    fireEvent.change(screen.getByLabelText(/FA1/i), { target: { value: '85' } })
    fireEvent.change(screen.getByLabelText(/FA2/i), { target: { value: '90' } })
    fireEvent.change(screen.getByLabelText(/SA1/i), { target: { value: '88' } })
    fireEvent.change(screen.getByLabelText(/FINAL/i), { target: { value: '92' } })
    
    await waitFor(() => {
      expect(screen.getByTestId('total-scores-used')).toHaveTextContent('5')
      expect(screen.getByTestId('formative-scores-used')).toHaveTextContent('2')
      expect(screen.getByTestId('summative-scores-used')).toHaveTextContent('2')
      expect(screen.getByTestId('final-score-used')).toHaveTextContent('Yes')
    })
  })

  it('supports decimal scores with proper precision', async () => {
    render(<GradeCalculatorPanel />)
    
    const fa1Input = screen.getByLabelText(/FA1/i)
    
    // Test decimal input
    fireEvent.change(fa1Input, { target: { value: '85.75' } })
    
    await waitFor(() => {
      expect(fa1Input).toHaveValue('85.75')
    })
    
    // Test rounding to 2 decimal places
    fireEvent.change(fa1Input, { target: { value: '85.999' } })
    fireEvent.blur(fa1Input)
    
    await waitFor(() => {
      expect(fa1Input).toHaveValue('86.00') // Should round to 2 decimal places
    })
  })

  it('provides clear button to reset all scores', async () => {
    render(<GradeCalculatorPanel />)
    
    // Enter some scores
    fireEvent.change(screen.getByLabelText(/FA1/i), { target: { value: '85' } })
    fireEvent.change(screen.getByLabelText(/SA1/i), { target: { value: '90' } })
    fireEvent.change(screen.getByLabelText(/FINAL/i), { target: { value: '88' } })
    
    // Click clear button
    const clearButton = screen.getByRole('button', { name: /clear all/i })
    fireEvent.click(clearButton)
    
    // All inputs should be cleared
    await waitFor(() => {
      expect(screen.getByLabelText(/FA1/i)).toHaveValue('')
      expect(screen.getByLabelText(/SA1/i)).toHaveValue('')
      expect(screen.getByLabelText(/FINAL/i)).toHaveValue('')
    })
    
    // Results should show null
    expect(screen.getByTestId('formative-avg')).toHaveTextContent('--')
    expect(screen.getByTestId('summative-avg')).toHaveTextContent('--')
    expect(screen.getByTestId('semester-grade')).toHaveTextContent('--')
  })

  it('displays calculation formulas for transparency', () => {
    render(<GradeCalculatorPanel />)
    
    // Should show the calculation formula
    expect(screen.getByText(/Semester Grade = \(Formative × 0\.15 \+ Summative × 0\.2 \+ Final × 0\.1\) ÷ Total Weight/i)).toBeInTheDocument()
    
    // Should show exclusion rule
    expect(screen.getByText(/Only scores > 0 are included in calculations/i)).toBeInTheDocument()
  })

  it('supports keyboard navigation and accessibility', async () => {
    render(<GradeCalculatorPanel />)
    
    const fa1Input = screen.getByLabelText(/FA1/i)
    
    // Focus should be manageable
    fa1Input.focus()
    expect(document.activeElement).toBe(fa1Input)
    
    // Should have proper ARIA labels
    expect(fa1Input).toHaveAttribute('aria-label')
    expect(fa1Input).toHaveAttribute('role', 'spinbutton')
    
    // Should support keyboard input
    fireEvent.keyDown(fa1Input, { key: 'ArrowUp' })
    // Implementation would depend on your specific keyboard support
  })
})
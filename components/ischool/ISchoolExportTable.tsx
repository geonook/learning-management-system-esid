'use client'

import { useState, useCallback } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ISchoolExportRow } from '@/types/ischool'
import { termRequiresComments } from '@/types/ischool'
import type { Term } from '@/types/academic-year'

interface ISchoolExportTableProps {
  data: ISchoolExportRow[]
  term: Term
  onCommentChange?: (studentId: string, comment: string) => void
  isLoading?: boolean
}

export function ISchoolExportTable({
  data,
  term,
  onCommentChange,
  isLoading = false,
}: ISchoolExportTableProps) {
  const showComments = termRequiresComments(term)
  const examLabel = term === 1 || term === 3 ? 'MID' : 'FINAL'

  const formatScore = (score: number | null): string => {
    if (score === null) return '-'
    return score.toFixed(2)
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead className="w-[100px]">Student ID</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="w-[80px] text-center">FA Avg</TableHead>
            <TableHead className="w-[80px] text-center">SA Avg</TableHead>
            <TableHead className="w-[80px] text-center">{examLabel}</TableHead>
            {showComments && (
              <TableHead className="min-w-[250px]">Teacher Comment</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={showComments ? 7 : 6} className="text-center py-8 text-muted-foreground">
                Loading...
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showComments ? 7 : 6} className="text-center py-8 text-muted-foreground">
                No students found
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow key={row.studentId}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell className="font-mono text-xs">{row.studentNumber}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{row.studentName}</span>
                    {row.chineseName && (
                      <span className="text-xs text-muted-foreground">{row.chineseName}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <ScoreCell score={row.formativeAvg} />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreCell score={row.summativeAvg} />
                </TableCell>
                <TableCell className="text-center">
                  <ScoreCell score={row.examScore} />
                </TableCell>
                {showComments && (
                  <TableCell>
                    <CommentInput
                      value={row.teacherComment || ''}
                      onChange={(value) => onCommentChange?.(row.studentId, value)}
                    />
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function ScoreCell({ score }: { score: number | null }) {
  if (score === null) {
    return <span className="text-muted-foreground">-</span>
  }
  return <span className="font-mono">{score.toFixed(2)}</span>
}

function CommentInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [localValue, setLocalValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const maxLength = 400

  const handleBlur = useCallback(() => {
    if (localValue !== value) {
      setIsSaving(true)
      onChange(localValue)
      // Reset saving state after a short delay
      setTimeout(() => setIsSaving(false), 500)
    }
  }, [localValue, value, onChange])

  const charCount = localValue.length
  const isOverLimit = charCount > maxLength

  return (
    <div className="space-y-1">
      <Textarea
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="Enter comment for iSchool..."
        className={cn(
          "min-h-[60px] text-sm resize-none",
          isOverLimit && "border-red-500 focus-visible:ring-red-500"
        )}
        maxLength={maxLength + 50} // Allow some overflow for visual feedback
      />
      <div className="flex justify-between text-xs">
        <span className={cn(
          "text-muted-foreground",
          isOverLimit && "text-red-500 font-medium"
        )}>
          {charCount}/{maxLength}
        </span>
        {isSaving && (
          <span className="text-muted-foreground">Saving...</span>
        )}
      </div>
    </div>
  )
}

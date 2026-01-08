'use client'

import { useState, useCallback, useEffect } from 'react'
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
  isReadOnly?: boolean
}

export function ISchoolExportTable({
  data,
  term,
  onCommentChange,
  isLoading = false,
  isReadOnly = false,
}: ISchoolExportTableProps) {
  const showComments = termRequiresComments(term)
  const examLabel = term === 1 || term === 3 ? 'MID' : 'FINAL'

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px] text-center">#</TableHead>
            <TableHead className="w-[90px]">ID</TableHead>
            <TableHead className="min-w-[140px]">Student</TableHead>
            <TableHead className="w-[70px] text-center">FA Avg</TableHead>
            <TableHead className="w-[70px] text-center">SA Avg</TableHead>
            <TableHead className="w-[70px] text-center">{examLabel}</TableHead>
            {showComments && (
              <TableHead className="min-w-[320px]">
                Teacher Comment
                <span className="ml-1 text-xs font-normal text-muted-foreground">(400 chars max)</span>
              </TableHead>
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
              <TableRow key={row.studentId} className="align-top">
                <TableCell className="text-muted-foreground text-center py-3">{index + 1}</TableCell>
                <TableCell className="font-mono text-xs py-3">{row.studentNumber}</TableCell>
                <TableCell className="py-3">
                  <div className="flex flex-col">
                    <span className="font-medium">{row.studentName}</span>
                    {row.chineseName && (
                      <span className="text-xs text-muted-foreground">{row.chineseName}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center py-3">
                  <ScoreCell score={row.formativeAvg} />
                </TableCell>
                <TableCell className="text-center py-3">
                  <ScoreCell score={row.summativeAvg} />
                </TableCell>
                <TableCell className="text-center py-3">
                  <ScoreCell score={row.examScore} />
                </TableCell>
                {showComments && (
                  <TableCell className="py-2">
                    <CommentInput
                      value={row.teacherComment || ''}
                      onChange={(value) => onCommentChange?.(row.studentId, value)}
                      disabled={isReadOnly}
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

const MAX_COMMENT_LENGTH = 400
const WARNING_THRESHOLD = 350

function CommentInput({
  value,
  onChange,
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [localValue, setLocalValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)

  // Sync localValue when prop changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (disabled) return
    const newValue = e.target.value
    // Hard limit at 400 characters
    if (newValue.length <= MAX_COMMENT_LENGTH) {
      setLocalValue(newValue)
    }
  }, [disabled])

  const handleBlur = useCallback(() => {
    if (disabled) return
    if (localValue !== value) {
      setIsSaving(true)
      onChange(localValue)
      // Reset saving state after a short delay
      setTimeout(() => setIsSaving(false), 500)
    }
  }, [localValue, value, onChange, disabled])

  const charCount = localValue.length
  const isNearLimit = charCount >= WARNING_THRESHOLD
  const isAtLimit = charCount >= MAX_COMMENT_LENGTH

  return (
    <div className="space-y-1">
      <Textarea
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={disabled ? "" : "Enter comment..."}
        disabled={disabled}
        className={cn(
          "min-h-[100px] text-sm resize-none w-full",
          disabled && "bg-muted/50 cursor-not-allowed opacity-70",
          !disabled && isAtLimit && "border-red-500 focus-visible:ring-red-500",
          !disabled && isNearLimit && !isAtLimit && "border-yellow-500 focus-visible:ring-yellow-500"
        )}
      />
      {!disabled && (
        <div className="flex justify-between items-center text-xs">
          <span className={cn(
            "tabular-nums",
            isAtLimit && "text-red-500 font-medium",
            isNearLimit && !isAtLimit && "text-yellow-600 font-medium",
            !isNearLimit && "text-muted-foreground"
          )}>
            {charCount}/{MAX_COMMENT_LENGTH}
          </span>
          {isSaving && (
            <span className="text-emerald-600">Saving...</span>
          )}
        </div>
      )}
    </div>
  )
}

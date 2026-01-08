'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ISchoolExportRow, ISchoolExportField } from '@/types/ischool'
import { getISchoolTermConfig, termRequiresComments } from '@/types/ischool'
import { generateExportText } from '@/lib/api/ischool'
import type { Term } from '@/types/academic-year'

interface ISchoolExportPreviewProps {
  data: ISchoolExportRow[]
  term: Term
  isCollapsible?: boolean
  isOpen?: boolean
  onToggle?: () => void
}

export function ISchoolExportPreview({
  data,
  term,
  isCollapsible = false,
  isOpen = true,
  onToggle,
}: ISchoolExportPreviewProps) {
  const [selectedField, setSelectedField] = useState<ISchoolExportField>('formative')
  const [copied, setCopied] = useState(false)

  const config = getISchoolTermConfig(term)
  const showComments = termRequiresComments(term)

  const exportText = useMemo(() => {
    return generateExportText(data, selectedField, term)
  }, [data, selectedField, term])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const getFieldLabel = (field: ISchoolExportField): string => {
    switch (field) {
      case 'formative':
        return 'LT Formative Assessment (FA Avg)'
      case 'summative':
        return 'LT Summative Assessment Term Work (SA Avg)'
      case 'exam':
        return `LT Summative Assessment Final Exam (${config.examCode})`
      case 'comment':
        return 'Teacher Comments'
      case 'all':
        return 'All Fields (Tab-separated)'
      default:
        return field
    }
  }

  const lineCount = data.length

  // Collapsible header component
  const CollapsibleHeader = () => (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors"
    >
      {isOpen ? (
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      ) : (
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      )}
      <span className="font-medium">Export Tools</span>
      <span className="text-xs text-muted-foreground">
        ({lineCount} {lineCount === 1 ? 'student' : 'students'})
      </span>
    </button>
  )

  return (
    <div className="bg-card rounded-lg border shadow-sm p-4">
      {isCollapsible && <CollapsibleHeader />}

      {(!isCollapsible || isOpen) && (
        <div className={cn("space-y-4", isCollapsible && "mt-3")}>
          {/* Export Controls Row */}
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Export Field</label>
              <Select
                value={selectedField}
                onValueChange={(value) => setSelectedField(value as ISchoolExportField)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formative">
                    {getFieldLabel('formative')}
                  </SelectItem>
                  <SelectItem value="summative">
                    {getFieldLabel('summative')}
                  </SelectItem>
                  <SelectItem value="exam">
                    {getFieldLabel('exam')}
                  </SelectItem>
                  {showComments && (
                    <SelectItem value="comment">
                      {getFieldLabel('comment')}
                    </SelectItem>
                  )}
                  <SelectItem value="all">
                    {getFieldLabel('all')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCopy}
              variant={copied ? 'default' : 'secondary'}
              className={cn(
                "min-w-[140px] transition-colors",
                copied && "bg-green-600 hover:bg-green-600"
              )}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </>
              )}
            </Button>
          </div>

          {/* Export Preview */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium">Export Preview</label>
              <span className="text-xs text-muted-foreground">
                {lineCount} {lineCount === 1 ? 'line' : 'lines'}
              </span>
            </div>
            <Textarea
              value={exportText}
              readOnly
              className="font-mono text-sm min-h-[150px] bg-muted/50"
              placeholder="No data to export"
            />
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <p className="font-medium mb-1">Instructions:</p>
            <ol className="list-decimal list-inside space-y-0.5 ml-1">
              <li>Select the field you want to export</li>
              <li>Click &quot;Copy to Clipboard&quot;</li>
              <li>Go to iSchool → Gradebook → Tools → Import</li>
              <li>Select the matching field and paste</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

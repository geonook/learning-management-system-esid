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
import { Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ISchoolExportRow, ISchoolExportField } from '@/types/ischool'
import { getISchoolTermConfig, termRequiresComments } from '@/types/ischool'
import { generateExportText } from '@/lib/api/ischool'
import type { Term } from '@/types/academic-year'

interface ISchoolExportPreviewProps {
  data: ISchoolExportRow[]
  term: Term
}

export function ISchoolExportPreview({ data, term }: ISchoolExportPreviewProps) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-1 block">Export Field</label>
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

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium">Export Preview</label>
          <span className="text-xs text-muted-foreground">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
        </div>
        <Textarea
          value={exportText}
          readOnly
          className="font-mono text-sm min-h-[200px] bg-muted/50"
          placeholder="No data to export"
        />
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          <strong>Instructions:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-0.5 ml-2">
          <li>Select the field you want to export</li>
          <li>Click &quot;Copy to Clipboard&quot;</li>
          <li>Go to iSchool → Gradebook → Tools → Import</li>
          <li>Select the matching field from the dropdown</li>
          <li>Paste in the textbox and click &quot;Parse&quot;</li>
          <li>Verify the preview and click &quot;Import&quot;</li>
        </ol>
      </div>
    </div>
  )
}

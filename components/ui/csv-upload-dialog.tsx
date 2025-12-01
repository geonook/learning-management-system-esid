"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { UploadCloud, CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  readFileAsText, 
  validateScoresCSV, 
  generateSampleScoresCSV 
} from "@/lib/import/csv-parser"
import type { ImportValidationResult, ScoreImport } from "@/lib/import/types"

interface CsvUploadDialogProps {
  onConfirm?: (validData: ScoreImport[]) => void
  stage?: 'users' | 'classes' | 'students' | 'scores'
  title?: string
  description?: string
}

export default function CsvUploadDialog({
  onConfirm,
  stage: _stage = 'scores', // eslint-disable-line @typescript-eslint/no-unused-vars
  title = 'Upload CSV Scores',
  description = 'Upload CSV with student scores. Preview and validate before import.'
}: CsvUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validation, setValidation] = useState<ImportValidationResult<ScoreImport> | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setSelectedFile(file)
    setIsValidating(true)
    setValidation(null)
    
    try {
      const content = await readFileAsText(file)
      const validationResult = await validateScoresCSV(content)
      setValidation(validationResult)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Validation error:', error)
      // Create a mock validation result with error
      setValidation({
        valid: [],
        invalid: [{
          row: 1,
          data: { file: file.name },
          errors: [`File processing error: ${error.message}`]
        }],
        summary: {
          total: 1,
          valid: 0,
          invalid: 1,
          validPercent: 0
        }
      })
    } finally {
      setIsValidating(false)
    }
  }

  function confirm() {
    if (validation?.valid) {
      onConfirm?.(validation.valid)
    }
    setOpen(false)
    // Reset state
    setValidation(null)
    setSelectedFile(null)
  }

  function downloadTemplate() {
    const content = generateSampleScoresCSV()
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "scores-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  function clearFile() {
    setSelectedFile(null)
    setValidation(null)
    setIsValidating(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <UploadCloud className="w-4 h-4" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl" aria-describedby="csv-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            {isValidating && <Loader2 className="h-4 w-4 animate-spin" />}
            {validation && !isValidating && (
              validation.summary.invalid === 0 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )
            )}
          </DialogTitle>
          <DialogDescription id="csv-desc">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {/* File Upload Area */}
          {!selectedFile ? (
            <label className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors">
              <input type="file" accept=".csv" className="hidden" onChange={onFile} />
              <UploadCloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <div className="text-lg font-medium mb-2">Drop CSV file here or click to browse</div>
              <div className="text-sm text-muted-foreground">
                Accepts CSV files up to 10MB
              </div>
            </label>
          ) : (
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-medium">{selectedFile.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={clearFile}>
                  Remove
                </Button>
              </div>
              
              {validation && (
                <div className="flex gap-2 mt-2">
                  <Badge variant={validation.summary.invalid === 0 ? "default" : "secondary"}>
                    {validation.summary.valid} valid
                  </Badge>
                  {validation.summary.invalid > 0 && (
                    <Badge variant="destructive">
                      {validation.summary.invalid} invalid
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {validation.summary.validPercent}% success rate
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Template Download */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <div>
              <div className="text-sm font-medium">Need a template?</div>
              <div className="text-xs text-muted-foreground">
                Download a sample CSV file with the correct format
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={downloadTemplate}>
              Download Template
            </Button>
          </div>

          {/* Validation Status */}
          {isValidating && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Validating CSV data... Please wait.
              </AlertDescription>
            </Alert>
          )}

          {validation && !isValidating && (
            <>
              {/* Validation Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                  <div className="text-xl font-semibold text-green-700 dark:text-green-400">
                    {validation.summary.valid}
                  </div>
                  <div className="text-sm text-green-600">Valid Records</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                  <div className="text-xl font-semibold text-red-700 dark:text-red-400">
                    {validation.summary.invalid}
                  </div>
                  <div className="text-sm text-red-600">Invalid Records</div>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                  <div className="text-xl font-semibold text-blue-700 dark:text-blue-400">
                    {validation.summary.validPercent}%
                  </div>
                  <div className="text-sm text-blue-600">Success Rate</div>
                </div>
              </div>

              {/* Error Details */}
              {validation.invalid.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium mb-2">
                      Found {validation.invalid.length} validation errors:
                    </div>
                    <ScrollArea className="h-32 mt-2">
                      <div className="space-y-1">
                        {validation.invalid.slice(0, 10).map((error, index) => (
                          <div key={index} className="text-xs p-2 bg-red-100 dark:bg-red-950/30 rounded">
                            <div className="font-medium">Row {error.row}:</div>
                            <div>{error.errors.join(', ')}</div>
                          </div>
                        ))}
                        {validation.invalid.length > 10 && (
                          <div className="text-xs text-muted-foreground text-center py-2">
                            ... and {validation.invalid.length - 10} more errors
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              {/* Valid Data Preview */}
              {validation.valid.length > 0 && (
                <div>
                  <div className="font-medium mb-2">Preview of Valid Data (First 5 records):</div>
                  <ScrollArea className="h-40 border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Exam</TableHead>
                          <TableHead>Assessment</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Teacher</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validation.valid.slice(0, 5).map((record, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">{record.student_id}</TableCell>
                            <TableCell className="text-sm">{record.exam_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {record.assessment_code}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{record.score}</TableCell>
                            <TableCell className="text-sm">{record.entered_by_email}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirm} 
              disabled={!validation || validation.summary.valid === 0 || isValidating}
            >
              {validation ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Import {validation.summary.valid} Valid Records
                </>
              ) : (
                'Select File First'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
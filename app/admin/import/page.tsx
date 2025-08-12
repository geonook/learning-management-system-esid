"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Loader2,
  Users,
  GraduationCap,
  UserCheck,
  BarChart,
  BookOpen
} from "lucide-react"
import { useAuth } from "@/lib/supabase/auth-context"
import { useAppStore } from "@/lib/store"
import {
  readFileAsText,
  validateUsersCSV,
  validateClassesCSV,
  validateCoursesCSV,
  validateStudentsCSV,
  validateScoresCSV,
  generateSampleUsersCSV,
  generateSampleClassesCSV,
  generateSampleCoursesCSV,
  generateSampleStudentsCSV,
  generateSampleScoresCSV,
  getValidationSummary
} from "@/lib/import/csv-parser"
import { executeImport, executeDryRun } from "@/lib/import/import-executor"
import type {
  ImportValidationResult,
  ImportExecutionResult,
  UserImport,
  ClassImport,
  CourseImport,
  StudentImport,
  ScoreImport,
  ImportFileInfo,
  ImportSession
} from "@/lib/import/types"
import { NoSSR } from "@/components/no-ssr"

interface FileUploadState {
  file?: File
  validation?: ImportValidationResult<any>
  status: 'idle' | 'validating' | 'valid' | 'invalid'
}

interface ImportStage {
  name: string
  icon: React.ReactNode
  description: string
  upload: FileUploadState
  required: boolean
}

export default function AdminImportPage() {
  const { user, userPermissions } = useAuth()
  const storeRole = useAppStore(state => state.role)
  const [currentTab, setCurrentTab] = useState('upload')
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportExecutionResult | null>(null)
  const [importProgress, setImportProgress] = useState(0)
  
  // Import stages state
  const [importStages, setImportStages] = useState<Record<string, ImportStage>>({
    users: {
      name: 'Users (Teachers)',
      icon: <Users className="h-4 w-4" />,
      description: 'Teacher and admin user accounts',
      upload: { status: 'idle' },
      required: false
    },
    classes: {
      name: 'Classes',
      icon: <GraduationCap className="h-4 w-4" />,
      description: 'Class information (without specific teachers)',
      upload: { status: 'idle' },
      required: false
    },
    courses: {
      name: 'Courses',
      icon: <BookOpen className="h-4 w-4" />,
      description: 'Independent English courses (LT/IT/KCFS) for each class',
      upload: { status: 'idle' },
      required: false
    },
    students: {
      name: 'Students',
      icon: <UserCheck className="h-4 w-4" />,
      description: 'Student information and class assignments',
      upload: { status: 'idle' },
      required: false
    },
    scores: {
      name: 'Scores',
      icon: <BarChart className="h-4 w-4" />,
      description: 'Assessment scores for specific courses (LT/IT/KCFS)',
      upload: { status: 'idle' },
      required: false
    }
  })
  
  // Check if user has import permissions
  // In development: allow access regardless of permissions
  const isDevelopment = process.env.NODE_ENV !== 'production'
  const hasAdminAccess = userPermissions?.role === 'admin' || 
    (isDevelopment && storeRole === 'admin') ||
    isDevelopment // Temporary: allow all access in dev
  
  if (!hasAdminAccess) {
    return (
      <div className="container max-w-2xl mx-auto py-20 text-center">
        <Card>
          <CardHeader>
            <CardTitle>Access Restricted</CardTitle>
            <CardDescription>
              Only administrators can access the data import feature
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/admin">Return to Admin Dashboard</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Handle file upload for a stage
  const handleFileUpload = async (stage: string, file: File) => {
    setImportStages(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        upload: { file, status: 'validating' }
      }
    }))
    
    try {
      const content = await readFileAsText(file)
      let validation: ImportValidationResult<any>
      
      switch (stage) {
        case 'users':
          validation = await validateUsersCSV(content)
          break
        case 'classes':
          validation = await validateClassesCSV(content)
          break
        case 'courses':
          validation = await validateCoursesCSV(content)
          break
        case 'students':
          validation = await validateStudentsCSV(content)
          break
        case 'scores':
          validation = await validateScoresCSV(content)
          break
        default:
          throw new Error(`Unknown stage: ${stage}`)
      }
      
      setImportStages(prev => ({
        ...prev,
        [stage]: {
          ...prev[stage],
          upload: {
            file,
            validation,
            status: validation.summary.invalid > 0 ? 'invalid' : 'valid'
          }
        }
      }))
      
    } catch (error: any) {
      console.error(`Validation error for ${stage}:`, error)
      setImportStages(prev => ({
        ...prev,
        [stage]: {
          ...prev[stage],
          upload: { file, status: 'invalid' }
        }
      }))
    }
  }
  
  // Remove uploaded file
  const removeFile = (stage: string) => {
    setImportStages(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        upload: { status: 'idle' }
      }
    }))
  }
  
  // Download sample templates
  const downloadTemplate = (stage: string) => {
    let content: string
    let filename: string
    
    switch (stage) {
      case 'users':
        content = generateSampleUsersCSV()
        filename = 'users-template.csv'
        break
      case 'classes':
        content = generateSampleClassesCSV()
        filename = 'classes-template.csv'
        break
      case 'courses':
        content = generateSampleCoursesCSV()
        filename = 'courses-template.csv'
        break
      case 'students':
        content = generateSampleStudentsCSV()
        filename = 'students-template.csv'
        break
      case 'scores':
        content = generateSampleScoresCSV()
        filename = 'scores-template.csv'
        break
      default:
        return
    }
    
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
  
  // Get validation summary
  const getImportSummary = () => {
    const validations = Object.values(importStages)
      .map(stage => stage.upload.validation)
      .filter(Boolean)
    
    if (validations.length === 0) return null
    return getValidationSummary(validations)
  }
  
  // Execute dry run
  const executeDryRunImport = async () => {
    const validationResults: any = {}
    
    Object.entries(importStages).forEach(([stage, data]) => {
      if (data.upload.validation) {
        validationResults[stage] = data.upload.validation
      }
    })
    
    if (Object.keys(validationResults).length === 0) {
      alert('Please upload and validate at least one file first')
      return
    }
    
    try {
      setIsImporting(true)
      setImportProgress(50)
      
      const dryRunResult = await executeDryRun(validationResults)
      console.log('Dry run result:', dryRunResult)
      
      setImportProgress(100)
      setCurrentTab('preview')
      
      // Store dry run result for preview (you might want to create a separate state for this)
      console.log('Would create:', dryRunResult.wouldCreate)
      console.log('Potential warnings:', dryRunResult.potentialWarnings)
      
    } catch (error: any) {
      console.error('Dry run error:', error)
      alert(`Dry run failed: ${error.message}`)
    } finally {
      setIsImporting(false)
      setImportProgress(0)
    }
  }
  
  // Execute actual import
  const executeActualImport = async () => {
    const validationResults: any = {}
    
    Object.entries(importStages).forEach(([stage, data]) => {
      if (data.upload.validation) {
        validationResults[stage] = data.upload.validation
      }
    })
    
    if (Object.keys(validationResults).length === 0) {
      alert('Please upload and validate at least one file first')
      return
    }
    
    if (!user?.id) {
      alert('User not authenticated')
      return
    }
    
    try {
      setIsImporting(true)
      setImportProgress(25)
      
      const result = await executeImport(validationResults, user.id)
      
      setImportProgress(100)
      setImportResult(result)
      setCurrentTab('results')
      
    } catch (error: any) {
      console.error('Import error:', error)
      alert(`Import failed: ${error.message}`)
    } finally {
      setIsImporting(false)
      setImportProgress(0)
    }
  }
  
  const summary = getImportSummary()
  const hasValidFiles = Object.values(importStages).some(stage => 
    stage.upload.status === 'valid'
  )
  const hasInvalidFiles = Object.values(importStages).some(stage => 
    stage.upload.status === 'invalid'
  )
  
  return (
    <div className="container max-w-6xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Data Import</h1>
        <p className="text-muted-foreground">
          Import users, classes, students, and scores from CSV files
        </p>
      </div>
      
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">📁 Upload Files</TabsTrigger>
          <TabsTrigger value="validate">✅ Validation</TabsTrigger>
          <TabsTrigger value="preview" disabled={!hasValidFiles}>👁️ Preview</TabsTrigger>
          <TabsTrigger value="results" disabled={!importResult}>📊 Results</TabsTrigger>
        </TabsList>
        
        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(importStages).map(([stage, data]) => (
              <Card key={stage} className="relative">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {data.icon}
                    {data.name}
                    {data.upload.status === 'valid' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {data.upload.status === 'invalid' && <XCircle className="h-4 w-4 text-red-500" />}
                    {data.upload.status === 'validating' && <Loader2 className="h-4 w-4 animate-spin" />}
                  </CardTitle>
                  <CardDescription>{data.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.upload.file ? (
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{data.upload.file.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {(data.upload.file.size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(stage)}
                        >
                          Remove
                        </Button>
                      </div>
                      {data.upload.validation && (
                        <div className="mt-2 flex gap-2">
                          <Badge variant={data.upload.validation.summary.invalid === 0 ? "default" : "secondary"}>
                            {data.upload.validation.summary.valid} valid
                          </Badge>
                          {data.upload.validation.summary.invalid > 0 && (
                            <Badge variant="destructive">
                              {data.upload.validation.summary.invalid} invalid
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors block">
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(stage, file)
                        }}
                      />
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="font-medium">Upload CSV file</div>
                        <div className="text-muted-foreground">Click to browse or drag & drop</div>
                      </div>
                    </label>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadTemplate(stage)}
                    className="w-full"
                    suppressHydrationWarning
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {summary && (
            <Card>
              <CardHeader>
                <CardTitle>Upload Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{summary.validRecords}</div>
                    <div className="text-sm text-muted-foreground">Valid Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{summary.invalidRecords}</div>
                    <div className="text-sm text-muted-foreground">Invalid Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{summary.totalRecords}</div>
                    <div className="text-sm text-muted-foreground">Total Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{summary.overallValidPercent}%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Validation Tab */}
        <TabsContent value="validate" className="space-y-4">
          {Object.entries(importStages).map(([stage, data]) => {
            if (!data.upload.validation) return null
            
            return (
              <Card key={stage}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {data.icon}
                    {data.name} Validation
                    <Badge variant={data.upload.validation.summary.invalid === 0 ? "default" : "secondary"}>
                      {data.upload.validation.summary.validPercent}% valid
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <div className="text-lg font-semibold text-green-700 dark:text-green-400">
                        {data.upload.validation.summary.valid}
                      </div>
                      <div className="text-sm text-green-600">Valid</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <div className="text-lg font-semibold text-red-700 dark:text-red-400">
                        {data.upload.validation.summary.invalid}
                      </div>
                      <div className="text-sm text-red-600">Invalid</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                        {data.upload.validation.summary.total}
                      </div>
                      <div className="text-sm text-blue-600">Total</div>
                    </div>
                  </div>
                  
                  {data.upload.validation.invalid.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-red-700 dark:text-red-400">
                        Validation Errors ({data.upload.validation.invalid.length})
                      </h4>
                      <ScrollArea className="h-48 border rounded">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16">Row</TableHead>
                              <TableHead>Errors</TableHead>
                              <TableHead>Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.upload.validation.invalid.slice(0, 50).map((error, index) => (
                              <TableRow key={index}>
                                <TableCell>{error.row}</TableCell>
                                <TableCell>
                                  <div className="text-sm text-red-600">
                                    {error.errors.join(', ')}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="text-xs text-muted-foreground max-w-xs truncate">
                                    {JSON.stringify(error.data)}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                      {data.upload.validation.invalid.length > 50 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Showing first 50 errors. Please fix validation issues and re-upload.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
        
        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Preview</CardTitle>
              <CardDescription>
                Review what will be imported before executing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This preview shows what would be imported based on current data validation.
                  Click "Test Import (Dry Run)" to validate references and dependencies.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(importStages).map(([stage, data]) => {
                  if (!data.upload.validation) return null
                  
                  return (
                    <div key={stage} className="text-center p-4 border rounded-lg">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {data.icon}
                        <div className="font-medium">{data.name}</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {data.upload.validation.summary.valid}
                      </div>
                      <div className="text-sm text-muted-foreground">Records</div>
                    </div>
                  )
                })}
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={executeDryRunImport}
                  disabled={isImporting || !hasValidFiles}
                  className="flex-1"
                >
                  {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Test Import (Dry Run)
                </Button>
                
                <Button
                  onClick={executeActualImport}
                  disabled={isImporting || !hasValidFiles || hasInvalidFiles}
                  variant="default"
                  className="flex-1"
                >
                  {isImporting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Execute Import
                </Button>
              </div>
              
              {isImporting && (
                <div className="space-y-2">
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-sm text-center text-muted-foreground">
                    {importProgress < 50 ? 'Validating data...' : 
                     importProgress < 100 ? 'Processing import...' : 'Completing...'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Results Tab */}
        <TabsContent value="results" className="space-y-4">
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Import Results
                  {importResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  {importResult.success 
                    ? 'Import completed successfully!' 
                    : 'Import completed with errors'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(importResult.summary).map(([stage, counts]) => (
                    <div key={stage} className="text-center p-4 border rounded-lg">
                      <div className="font-medium capitalize mb-2">{stage}</div>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="text-green-600">Created: {counts.created}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-blue-600">Updated: {counts.updated}</span>
                        </div>
                        {counts.errors > 0 && (
                          <div className="text-sm">
                            <span className="text-red-600">Errors: {counts.errors}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {importResult.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Import Errors:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index} className="text-sm">
                            {error.stage}: {error.error}
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                
                {importResult.warnings.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-2">Warnings ({importResult.warnings.length}):</div>
                      <ScrollArea className="h-32">
                        <ul className="list-disc list-inside space-y-1">
                          {importResult.warnings.map((warning, index) => (
                            <li key={index} className="text-sm">
                              {warning.stage}: {warning.message}
                            </li>
                          ))}
                        </ul>
                      </ScrollArea>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-3">
                  <Button 
                    onClick={() => setCurrentTab('upload')}
                    variant="outline"
                    className="flex-1"
                    suppressHydrationWarning
                  >
                    Import More Data
                  </Button>
                  <Button asChild className="flex-1">
                    <a href="/admin">Return to Dashboard</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
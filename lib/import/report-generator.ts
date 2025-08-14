/**
 * Report Generator for LMS-ESID Import System
 * Generates detailed import reports and analytics
 */

import {
  type ImportExecutionResult,
  type ImportValidationResult,
  type ImportSession,
  type ImportValidationError,
  type ImportExecutionError,
  type ImportExecutionWarning
} from './types'

// Report formatting utilities
const formatTimestamp = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  })
}

const formatDuration = (startTime: Date, endTime: Date): string => {
  const durationMs = endTime.getTime() - startTime.getTime()
  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

// Validation report generator
export function generateValidationReport(
  validationResults: Record<string, ImportValidationResult<any>>,
  options: {
    includeErrorDetails?: boolean
    maxErrorsPerStage?: number
  } = {}
): string {
  const { includeErrorDetails = true, maxErrorsPerStage = 50 } = options
  const timestamp = new Date()
  
  let report = `
# LMS-ESID Data Validation Report
Generated: ${formatTimestamp(timestamp)}

## Summary
`

  const stages = Object.keys(validationResults)
  let totalValid = 0
  let totalInvalid = 0
  let totalRecords = 0

  // Calculate totals
  stages.forEach(stage => {
    const result = validationResults[stage]
    if (result) {
      totalValid += result.summary.valid
      totalInvalid += result.summary.invalid
      totalRecords += result.summary.total
    }
  })

  const overallValidPercent = totalRecords > 0 ? Math.round((totalValid / totalRecords) * 100) : 0

  report += `
| Metric | Value |
|--------|-------|
| Total Records | ${totalRecords} |
| Valid Records | ${totalValid} (${overallValidPercent}%) |
| Invalid Records | ${totalInvalid} (${100 - overallValidPercent}%) |
| Stages Processed | ${stages.length} |
`

  // Stage-by-stage breakdown
  report += `\n## Stage Breakdown\n`
  
  stages.forEach(stage => {
    const result = validationResults[stage]
    if (!result) return
    
    const stagePercent = result.summary.validPercent
    
    report += `
### ${stage.charAt(0).toUpperCase() + stage.slice(1)}
- **Total Records**: ${result.summary.total}
- **Valid Records**: ${result.summary.valid} (${stagePercent}%)
- **Invalid Records**: ${result.summary.invalid} (${100 - stagePercent}%)
- **Status**: ${result.summary.invalid === 0 ? '✅ PASSED' : '❌ FAILED'}
`
    
    if (includeErrorDetails && result.invalid.length > 0) {
      report += `\n#### Validation Errors\n`
      
      const errorsToShow = result.invalid.slice(0, maxErrorsPerStage)
      errorsToShow.forEach((error, index) => {
        report += `
**Row ${error.row}:**
- Errors: ${error.errors.join(', ')}
- Data: ${JSON.stringify(error.data, null, 2).substring(0, 200)}${JSON.stringify(error.data).length > 200 ? '...' : ''}
`
      })
      
      if (result.invalid.length > maxErrorsPerStage) {
        report += `\n*... and ${result.invalid.length - maxErrorsPerStage} more errors*\n`
      }
    }
  })

  // Recommendations
  report += `\n## Recommendations\n`
  
  if (totalInvalid === 0) {
    report += `✅ All data is valid and ready for import.`
  } else {
    report += `❌ ${totalInvalid} records require attention before import:\n`
    
    stages.forEach(stage => {
      const result = validationResults[stage]
      if (result && result.summary.invalid > 0) {
        const commonErrors = getCommonErrors(result.invalid)
        report += `\n**${stage}:**\n`
        commonErrors.forEach(({ error, count }) => {
          report += `- ${error} (${count} occurrences)\n`
        })
      }
    })
    
    report += `\n### Next Steps:
1. Fix validation errors in CSV files
2. Re-upload corrected files
3. Run validation again
4. Proceed with import once all stages pass`
  }
  
  return report
}

// Import execution report generator
export function generateExecutionReport(
  result: ImportExecutionResult,
  startTime: Date,
  endTime: Date,
  validationResults?: Record<string, ImportValidationResult<any>>
): string {
  const timestamp = formatTimestamp(endTime)
  const duration = formatDuration(startTime, endTime)
  
  let report = `
# LMS-ESID Data Import Report
Generated: ${timestamp}
Duration: ${duration}
Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}

## Executive Summary
`

  const totalCreated = Object.values(result.summary).reduce((sum, stage) => sum + stage.created, 0)
  const totalUpdated = Object.values(result.summary).reduce((sum, stage) => sum + stage.updated, 0)
  const totalErrors = Object.values(result.summary).reduce((sum, stage) => sum + stage.errors, 0)
  const totalProcessed = totalCreated + totalUpdated + totalErrors

  report += `
| Metric | Value |
|--------|-------|
| Records Processed | ${totalProcessed} |
| Records Created | ${totalCreated} |
| Records Updated | ${totalUpdated} |
| Records Failed | ${totalErrors} |
| Success Rate | ${totalProcessed > 0 ? Math.round(((totalCreated + totalUpdated) / totalProcessed) * 100) : 0}% |
| Warnings | ${result.warnings.length} |
`

  // Stage results
  report += `\n## Import Results by Stage\n`
  
  Object.entries(result.summary).forEach(([stage, counts]) => {
    const stageTotal = counts.created + counts.updated + counts.errors
    const stageSuccess = stageTotal > 0 ? Math.round(((counts.created + counts.updated) / stageTotal) * 100) : 0
    
    report += `
### ${stage.charAt(0).toUpperCase() + stage.slice(1)}
- **Created**: ${counts.created}
- **Updated**: ${counts.updated}
- **Errors**: ${counts.errors}
- **Success Rate**: ${stageSuccess}%
- **Status**: ${counts.errors === 0 ? '✅ SUCCESS' : '❌ PARTIAL'}
`
  })

  // Error details
  if (result.errors.length > 0) {
    report += `\n## Import Errors (${result.errors.length})\n`
    
    result.errors.forEach((error, index) => {
      report += `
${index + 1}. **${error.stage.toUpperCase()}** - ${error.operation.toUpperCase()}
   - Error: ${error.error}
   - Data: ${JSON.stringify(error.data, null, 2)}
`
    })
  }

  // Warnings
  if (result.warnings.length > 0) {
    report += `\n## Import Warnings (${result.warnings.length})\n`
    
    result.warnings.forEach((warning, index) => {
      report += `
${index + 1}. **${warning.stage.toUpperCase()}**: ${warning.message}
${warning.data ? `   - Data: ${JSON.stringify(warning.data)}` : ''}
`
    })
  }

  // Validation summary (if available)
  if (validationResults) {
    report += `\n## Pre-Import Validation Summary\n`
    
    Object.entries(validationResults).forEach(([stage, validation]) => {
      report += `
**${stage}**: ${validation.summary.valid} valid, ${validation.summary.invalid} invalid (${validation.summary.validPercent}% success)
`
    })
  }

  // Recommendations and next steps
  report += `\n## Recommendations\n`
  
  if (result.success) {
    report += `
✅ Import completed successfully!

### Verification Steps:
1. Verify data integrity in the application
2. Test user login functionality (for new users)
3. Verify class assignments and student enrollments
4. Check score calculations and grade reports
5. Monitor system performance with new data volume
`
  } else {
    report += `
❌ Import completed with errors.

### Immediate Actions Required:
1. Review error details above
2. Check data integrity for partially imported stages
3. Fix source data issues
4. Re-run import for failed stages only
5. Verify no duplicate or corrupted data exists

### Recovery Steps:
`

    if (totalErrors > 0) {
      Object.entries(result.summary).forEach(([stage, counts]) => {
        if (counts.errors > 0) {
          report += `- **${stage}**: ${counts.errors} failed records need attention\n`
        }
      })
    }
  }

  // Appendix with detailed statistics
  report += `\n## Detailed Statistics\n`
  
  report += `
### Performance Metrics
- **Total Duration**: ${duration}
- **Records per Second**: ${totalProcessed > 0 ? Math.round(totalProcessed / ((endTime.getTime() - startTime.getTime()) / 1000)) : 0}
- **Average Processing Time**: ${totalProcessed > 0 ? Math.round((endTime.getTime() - startTime.getTime()) / totalProcessed) : 0}ms per record

### Data Quality Metrics
- **Error Rate**: ${totalProcessed > 0 ? ((totalErrors / totalProcessed) * 100).toFixed(2) : 0}%
- **Warning Rate**: ${totalProcessed > 0 ? ((result.warnings.length / totalProcessed) * 100).toFixed(2) : 0}%
- **Data Integrity Score**: ${result.success && totalErrors === 0 ? '100%' : totalProcessed > 0 ? (((totalCreated + totalUpdated) / totalProcessed) * 100).toFixed(2) + '%' : 'N/A'}
`

  return report
}

// Session report generator (for tracking multiple import sessions)
export function generateSessionReport(session: ImportSession): string {
  const timestamp = formatTimestamp(session.created_at)
  const status = session.status.toUpperCase()
  
  let report = `
# LMS-ESID Import Session Report
Session ID: ${session.id}
Created: ${timestamp}
Status: ${status}
Created By: ${session.created_by}

## Session Overview
`

  report += `
| Property | Value |
|----------|-------|
| Session ID | ${session.id} |
| Status | ${status} |
| Files Uploaded | ${session.files.length} |
| Current Stage | ${session.progress.current_stage} |
| Overall Progress | ${session.progress.total_progress}% |
| Completed Stages | ${session.progress.completed_stages.join(', ') || 'None'} |
`

  // File details
  if (session.files.length > 0) {
    report += `\n## Uploaded Files\n`
    
    session.files.forEach((file, index) => {
      report += `
${index + 1}. **${file.name}**
   - Stage: ${file.stage}
   - Size: ${(file.size / 1024).toFixed(1)} KB
   - Type: ${file.type}
`
    })
  }

  // Validation results
  if (Object.keys(session.validation_results).length > 0) {
    report += `\n## Validation Results\n`
    
    Object.entries(session.validation_results).forEach(([stage, result]) => {
      const validation = result as ImportValidationResult<any>
      report += `
**${stage}**: ${validation.summary.valid} valid, ${validation.summary.invalid} invalid (${validation.summary.validPercent}% success)
`
    })
  }

  // Execution results
  if (session.execution_result) {
    const result = session.execution_result
    report += `\n## Execution Summary\n`
    
    Object.entries(result.summary).forEach(([stage, counts]) => {
      report += `
**${stage}**: Created: ${counts.created}, Updated: ${counts.updated}, Errors: ${counts.errors}
`
    })
  }

  return report
}

// Utility function to identify common errors
function getCommonErrors(errors: ImportValidationError[]): Array<{ error: string; count: number }> {
  const errorCounts = new Map<string, number>()
  
  errors.forEach(error => {
    error.errors.forEach(errorMsg => {
      // Extract the base error message (before the colon if present)
      const baseError = errorMsg.split(':')[0]?.trim() || errorMsg
      errorCounts.set(baseError, (errorCounts.get(baseError) || 0) + 1)
    })
  })
  
  return Array.from(errorCounts.entries())
    .map(([error, count]) => ({ error, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10 most common errors
}

// Export CSV report data
export function generateCSVReport(
  result: ImportExecutionResult,
  validationResults?: Record<string, ImportValidationResult<any>>
): string {
  const headers = [
    'Stage',
    'Status',
    'Records Created',
    'Records Updated', 
    'Records Failed',
    'Success Rate (%)',
    'Validation Errors',
    'Import Warnings'
  ]
  
  let csv = headers.join(',') + '\n'
  
  Object.entries(result.summary).forEach(([stage, counts]) => {
    const stageTotal = counts.created + counts.updated + counts.errors
    const successRate = stageTotal > 0 ? Math.round(((counts.created + counts.updated) / stageTotal) * 100) : 0
    const status = counts.errors === 0 ? 'SUCCESS' : 'PARTIAL'
    
    const validationErrors = validationResults?.[stage]?.summary.invalid || 0
    const stageWarnings = result.warnings.filter(w => w.stage === stage).length
    
    const row = [
      stage,
      status,
      counts.created,
      counts.updated,
      counts.errors,
      successRate,
      validationErrors,
      stageWarnings
    ]
    
    csv += row.join(',') + '\n'
  })
  
  return csv
}

// Generate comprehensive import analytics
export function generateImportAnalytics(
  results: ImportExecutionResult[],
  timeRange: { start: Date; end: Date }
): {
  summary: {
    totalImports: number
    successfulImports: number
    failedImports: number
    totalRecordsProcessed: number
    averageSuccessRate: number
    averageDuration: number
  }
  trends: {
    stage: string
    successRate: number
    errorRate: number
    avgProcessingTime: number
  }[]
  commonIssues: {
    issue: string
    frequency: number
    stages: string[]
  }[]
} {
  const totalImports = results.length
  const successfulImports = results.filter(r => r.success).length
  const failedImports = totalImports - successfulImports
  
  const totalRecordsProcessed = results.reduce((sum, result) => {
    return sum + Object.values(result.summary).reduce((stageSum, stage) => 
      stageSum + stage.created + stage.updated + stage.errors, 0
    )
  }, 0)
  
  const averageSuccessRate = totalImports > 0 ? (successfulImports / totalImports) * 100 : 0
  
  // Calculate stage-specific trends
  const stageTrends = new Map<string, { successes: number; errors: number; total: number }>()
  
  results.forEach(result => {
    Object.entries(result.summary).forEach(([stage, counts]) => {
      const current = stageTrends.get(stage) || { successes: 0, errors: 0, total: 0 }
      stageTrends.set(stage, {
        successes: current.successes + counts.created + counts.updated,
        errors: current.errors + counts.errors,
        total: current.total + counts.created + counts.updated + counts.errors
      })
    })
  })
  
  const trends = Array.from(stageTrends.entries()).map(([stage, data]) => ({
    stage,
    successRate: data.total > 0 ? (data.successes / data.total) * 100 : 0,
    errorRate: data.total > 0 ? (data.errors / data.total) * 100 : 0,
    avgProcessingTime: 0 // Would need timing data to calculate this
  }))
  
  // Identify common issues
  const issueMap = new Map<string, { frequency: number; stages: Set<string> }>()
  
  results.forEach(result => {
    result.errors.forEach(error => {
      const issue = error.error.split(':')[0]?.trim() || error.error // Extract base error message
      const current = issueMap.get(issue) || { frequency: 0, stages: new Set() }
      current.frequency++
      current.stages.add(error.stage)
      issueMap.set(issue, current)
    })
  })
  
  const commonIssues = Array.from(issueMap.entries())
    .map(([issue, data]) => ({
      issue,
      frequency: data.frequency,
      stages: Array.from(data.stages)
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10)
  
  return {
    summary: {
      totalImports,
      successfulImports,
      failedImports,
      totalRecordsProcessed,
      averageSuccessRate,
      averageDuration: 0 // Would need timing data
    },
    trends,
    commonIssues
  }
}
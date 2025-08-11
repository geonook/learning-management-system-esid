#!/usr/bin/env node

/**
 * Batch Import Script for LMS-ESID
 * Automated staged import: Users → Classes → Students → Scores
 * 
 * Usage:
 * npx tsx scripts/batch-import.ts --data-dir ./data --user-email admin@esid.edu
 * npx tsx scripts/batch-import.ts --users users.csv --students students.csv --dry-run
 */

import { promises as fs } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import {
  validateUsersCSV,
  validateClassesCSV,
  validateStudentsCSV,
  validateScoresCSV,
  generateSampleUsersCSV,
  generateSampleClassesCSV,
  generateSampleStudentsCSV,
  generateSampleScoresCSV
} from '../lib/import/csv-parser'
import { generateExecutionReport, generateValidationReport } from '../lib/import/report-generator'
import type { ImportValidationResult, ImportExecutionResult } from '../lib/import/types'

// Stage configuration
const IMPORT_STAGES = [
  { name: 'users', filename: 'users.csv', validator: validateUsersCSV, required: false },
  { name: 'classes', filename: 'classes.csv', validator: validateClassesCSV, required: false },
  { name: 'students', filename: 'students.csv', validator: validateStudentsCSV, required: false },
  { name: 'scores', filename: 'scores.csv', validator: validateScoresCSV, required: false }
] as const

interface BatchImportArgs {
  dataDir?: string
  users?: string
  classes?: string
  students?: string
  scores?: string
  userEmail?: string
  dryRun?: boolean
  verbose?: boolean
  help?: boolean
  generateSamples?: boolean
  reportDir?: string
  encoding?: 'utf8' | 'utf16le' | 'latin1'
  maxErrors?: number
  skipStagesOnError?: boolean
}

// Parse command line arguments
function parseArgs(): BatchImportArgs {
  const args: BatchImportArgs = {}
  const argv = process.argv.slice(2)
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const nextArg = argv[i + 1]
    
    switch (arg) {
      case '--data-dir':
        args.dataDir = nextArg
        i++
        break
      case '--users':
        args.users = nextArg
        i++
        break
      case '--classes':
        args.classes = nextArg
        i++
        break
      case '--students':
        args.students = nextArg
        i++
        break
      case '--scores':
        args.scores = nextArg
        i++
        break
      case '--user-email':
        args.userEmail = nextArg
        i++
        break
      case '--dry-run':
        args.dryRun = true
        break
      case '--verbose':
      case '-v':
        args.verbose = true
        break
      case '--help':
      case '-h':
        args.help = true
        break
      case '--generate-samples':
        args.generateSamples = true
        break
      case '--report-dir':
        args.reportDir = nextArg
        i++
        break
      case '--encoding':
        args.encoding = nextArg as 'utf8' | 'utf16le' | 'latin1'
        i++
        break
      case '--max-errors':
        args.maxErrors = parseInt(nextArg)
        i++
        break
      case '--skip-stages-on-error':
        args.skipStagesOnError = true
        break
    }
  }
  
  return args
}

// Show help information
function showHelp(): void {
  console.log(`
LMS-ESID Batch Import Tool

Description:
  Automated batch import tool that processes CSV files in the correct order:
  Users → Classes → Students → Scores

Usage:
  npx tsx scripts/batch-import.ts [options]

Options:
  --data-dir <path>         Directory containing all CSV files (users.csv, classes.csv, etc.)
  --users <file>            Specific users CSV file
  --classes <file>          Specific classes CSV file  
  --students <file>         Specific students CSV file
  --scores <file>           Specific scores CSV file
  
  --user-email <email>      User email for authentication (required for actual import)
  --dry-run                 Validate and preview without importing
  
  --generate-samples        Generate sample CSV files
  --report-dir <path>       Directory for reports (default: ./import-reports)
  --encoding <type>         File encoding: utf8, utf16le, latin1 (default: utf8)
  --max-errors <number>     Maximum validation errors to show per stage (default: 20)
  --skip-stages-on-error    Skip subsequent stages if current stage has errors
  
  --verbose, -v             Verbose output
  --help, -h                Show this help

Examples:
  # Generate sample files
  npx tsx scripts/batch-import.ts --generate-samples --data-dir ./sample-data
  
  # Import from data directory (auto-detects files)
  npx tsx scripts/batch-import.ts --data-dir ./data --user-email admin@esid.edu
  
  # Import specific files
  npx tsx scripts/batch-import.ts --users users.csv --students students.csv --user-email admin@esid.edu
  
  # Dry run validation
  npx tsx scripts/batch-import.ts --data-dir ./data --dry-run --verbose
  
  # Import with error handling
  npx tsx scripts/batch-import.ts --data-dir ./data --user-email admin@esid.edu --skip-stages-on-error

File Naming Convention:
  When using --data-dir, files should be named:
  - users.csv      (Teacher and admin accounts)
  - classes.csv    (Class information)  
  - students.csv   (Student information)
  - scores.csv     (Assessment scores)

Environment Variables:
  NEXT_PUBLIC_SUPABASE_URL      Supabase project URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY Supabase anonymous key
`)
}

// Initialize Supabase client
function initializeSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Missing Supabase environment variables')
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }
  
  return createClient(supabaseUrl, supabaseKey)
}

// Generate sample CSV files
async function generateSampleFiles(dataDir: string): Promise<void> {
  console.log(`📝 Generating sample CSV files in ${dataDir}...`)
  
  await fs.mkdir(dataDir, { recursive: true })
  
  const samples = [
    { name: 'users.csv', content: generateSampleUsersCSV() },
    { name: 'classes.csv', content: generateSampleClassesCSV() },
    { name: 'students.csv', content: generateSampleStudentsCSV() },
    { name: 'scores.csv', content: generateSampleScoresCSV() }
  ]
  
  for (const sample of samples) {
    const filePath = path.join(dataDir, sample.name)
    await fs.writeFile(filePath, sample.content, 'utf8')
    console.log(`✅ Created: ${filePath}`)
  }
  
  console.log(`\n📁 Sample files generated in: ${dataDir}`)
  console.log('Edit these files with your actual data, then run:')
  console.log(`npx tsx scripts/batch-import.ts --data-dir ${dataDir} --user-email your-admin@esid.edu`)
}

// Authenticate user
async function authenticateUser(supabase: any, userEmail: string): Promise<string> {
  console.log(`🔐 Authenticating user: ${userEmail}`)
  
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', userEmail)
    .single()
  
  if (error || !user) {
    throw new Error(`User not found or not authorized: ${userEmail}`)
  }
  
  if (user.role !== 'admin') {
    throw new Error(`User ${userEmail} does not have admin privileges`)
  }
  
  console.log(`✅ Authenticated as: ${user.role} (${user.email})`)
  return user.id
}

// Detect available files
async function detectFiles(args: BatchImportArgs): Promise<Record<string, string>> {
  const files: Record<string, string> = {}
  
  if (args.dataDir) {
    // Auto-detect files in directory
    for (const stage of IMPORT_STAGES) {
      const filePath = path.join(args.dataDir, stage.filename)
      try {
        await fs.access(filePath)
        files[stage.name] = filePath
        console.log(`📄 Found: ${filePath}`)
      } catch {
        // File doesn't exist, skip
      }
    }
  } else {
    // Use explicitly specified files
    if (args.users) files.users = args.users
    if (args.classes) files.classes = args.classes
    if (args.students) files.students = args.students
    if (args.scores) files.scores = args.scores
  }
  
  return files
}

// Validate all files
async function validateAllFiles(
  files: Record<string, string>,
  args: BatchImportArgs
): Promise<Record<string, ImportValidationResult<any>>> {
  const validationResults: Record<string, ImportValidationResult<any>> = {}
  const parseOptions = {
    encoding: args.encoding || 'utf8' as const,
    maxRows: undefined,
    skipLinesWithError: false
  }
  
  console.log('\n🔍 Validating CSV files...')
  
  for (const stage of IMPORT_STAGES) {
    const filePath = files[stage.name]
    if (!filePath) continue
    
    console.log(`📋 Validating ${stage.name}: ${filePath}`)
    
    try {
      const content = await fs.readFile(filePath, parseOptions.encoding)
      const validation = await stage.validator(content, parseOptions)
      validationResults[stage.name] = validation
      
      const { valid, invalid, validPercent } = validation.summary
      if (invalid === 0) {
        console.log(`✅ ${stage.name}: ${valid} records, all valid`)
      } else {
        console.log(`⚠️  ${stage.name}: ${valid} valid, ${invalid} invalid (${validPercent}% success)`)
        
        if (args.verbose) {
          const maxErrors = args.maxErrors || 20
          const errorsToShow = validation.invalid.slice(0, maxErrors)
          errorsToShow.forEach(error => {
            console.log(`   Row ${error.row}: ${error.errors.join(', ')}`)
          })
          if (validation.invalid.length > maxErrors) {
            console.log(`   ... and ${validation.invalid.length - maxErrors} more errors`)
          }
        }
      }
      
      // Stop if stage has errors and skip-stages-on-error is enabled
      if (args.skipStagesOnError && invalid > 0) {
        console.log(`⏸️  Stopping validation due to errors in ${stage.name}`)
        break
      }
      
    } catch (error: any) {
      console.error(`❌ Validation failed for ${stage.name}: ${error.message}`)
      
      if (args.skipStagesOnError) {
        console.log(`⏸️  Stopping validation due to error in ${stage.name}`)
        break
      }
    }
  }
  
  return validationResults
}

// Generate and save reports
async function saveReports(
  validationResults: Record<string, ImportValidationResult<any>>,
  executionResult: ImportExecutionResult | null,
  args: BatchImportArgs,
  startTime: Date,
  endTime: Date
): Promise<void> {
  const reportDir = args.reportDir || './import-reports'
  await fs.mkdir(reportDir, { recursive: true })
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  
  // Generate validation report
  const validationReport = generateValidationReport(validationResults, {
    includeErrorDetails: true,
    maxErrorsPerStage: args.maxErrors || 50
  })
  
  const validationReportPath = path.join(reportDir, `validation-report-${timestamp}.md`)
  await fs.writeFile(validationReportPath, validationReport, 'utf8')
  console.log(`📄 Validation report saved: ${validationReportPath}`)
  
  // Generate execution report if import was executed
  if (executionResult) {
    const executionReport = generateExecutionReport(
      executionResult,
      startTime,
      endTime,
      validationResults
    )
    
    const executionReportPath = path.join(reportDir, `execution-report-${timestamp}.md`)
    await fs.writeFile(executionReportPath, executionReport, 'utf8')
    console.log(`📄 Execution report saved: ${executionReportPath}`)
  }
}

// Main batch import function
async function main(): Promise<void> {
  const args = parseArgs()
  
  // Show help if requested or no arguments
  if (args.help || process.argv.length === 2) {
    showHelp()
    return
  }
  
  // Generate sample files if requested
  if (args.generateSamples) {
    const dataDir = args.dataDir || './sample-data'
    await generateSampleFiles(dataDir)
    return
  }
  
  console.log('🚀 Starting LMS-ESID Batch Import...')
  const startTime = new Date()
  
  try {
    // Initialize Supabase only if needed for actual import
    let supabase: any = null
    let userUUID = ''
    
    if (!args.dryRun) {
      supabase = initializeSupabase()
      if (!args.userEmail) {
        console.error('❌ Error: --user-email is required for actual imports')
        console.error('Use --dry-run for validation only')
        process.exit(1)
      }
      userUUID = await authenticateUser(supabase, args.userEmail)
    }
    
    // Detect available files
    const files = await detectFiles(args)
    
    if (Object.keys(files).length === 0) {
      console.error('❌ No CSV files found to process')
      console.error('Use --help to see available options')
      process.exit(1)
    }
    
    console.log(`\n📂 Found ${Object.keys(files).length} CSV files to process`)
    
    // Validate all files
    const validationResults = await validateAllFiles(files, args)
    
    if (Object.keys(validationResults).length === 0) {
      console.error('❌ No files were successfully validated')
      process.exit(1)
    }
    
    // Check overall validation status
    const totalInvalid = Object.values(validationResults).reduce(
      (sum, result) => sum + result.summary.invalid, 0
    )
    
    const totalValid = Object.values(validationResults).reduce(
      (sum, result) => sum + result.summary.valid, 0
    )
    
    console.log(`\n📊 Validation Summary: ${totalValid} valid, ${totalInvalid} invalid records`)
    
    let executionResult: ImportExecutionResult | null = null
    
    if (args.dryRun) {
      console.log('\n🧪 Dry run mode - validation only')
      
      if (totalInvalid > 0) {
        console.log('⚠️  Found validation errors. Fix these before running actual import.')
      } else {
        console.log('✅ All validations passed! Ready for import.')
      }
      
    } else {
      if (totalInvalid > 0) {
        console.log('\n❌ Cannot proceed with import due to validation errors')
        console.log('Fix the validation errors and run again, or use --dry-run to see detailed errors')
        process.exit(1)
      }
      
      console.log('\n🚀 Executing staged import...')
      console.log('📋 Import order: Users → Classes → Students → Scores')
      
      // Dynamically import the executor to avoid Supabase initialization issues
      const { executeImport } = await import('../lib/import/import-executor')
      executionResult = await executeImport(validationResults, userUUID)
      
      const endTime = new Date()
      const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000)
      
      console.log(`\n📊 Import completed in ${duration}s`)
      console.log(`Status: ${executionResult.success ? '✅ SUCCESS' : '❌ FAILED'}`)
      
      // Show summary
      Object.entries(executionResult.summary).forEach(([stage, counts]) => {
        if (counts.created > 0 || counts.updated > 0 || counts.errors > 0) {
          console.log(`${stage}: Created ${counts.created}, Updated ${counts.updated}, Errors ${counts.errors}`)
        }
      })
      
      if (executionResult.errors.length > 0) {
        console.log(`\n❌ Import Errors (${executionResult.errors.length}):`)
        executionResult.errors.forEach((error, index) => {
          console.log(`${index + 1}. [${error.stage.toUpperCase()}] ${error.error}`)
        })
      }
      
      if (executionResult.warnings.length > 0) {
        console.log(`\n⚠️  Import Warnings (${executionResult.warnings.length}):`)
        if (args.verbose) {
          executionResult.warnings.forEach((warning, index) => {
            console.log(`${index + 1}. [${warning.stage.toUpperCase()}] ${warning.message}`)
          })
        } else {
          console.log('Use --verbose to see warning details')
        }
      }
    }
    
    // Generate reports
    const endTime = new Date()
    await saveReports(validationResults, executionResult, args, startTime, endTime)
    
    if (!args.dryRun && executionResult) {
      if (executionResult.success) {
        console.log('\n🎉 Batch import completed successfully!')
        console.log('Next steps:')
        console.log('1. Verify data in the application')
        console.log('2. Test user authentication')
        console.log('3. Check class assignments and scores')
      } else {
        console.log('\n💥 Batch import completed with errors!')
        console.log('Check the execution report for detailed error analysis')
        process.exit(1)
      }
    } else {
      console.log('\n✅ Validation completed!')
      if (totalInvalid === 0) {
        console.log('All data is valid and ready for import.')
        console.log(`Run without --dry-run to execute the import.`)
      }
    }
    
  } catch (error: any) {
    console.error(`\n💥 Fatal error: ${error.message}`)
    if (args.verbose) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run the batch import
if (require.main === module) {
  main().catch(error => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })
}
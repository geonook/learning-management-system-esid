#!/usr/bin/env node

/**
 * CLI Import Tool for LMS-ESID
 * Command-line interface for batch CSV data import
 * 
 * Usage:
 * npx tsx scripts/import-cli.ts --users users.csv --classes classes.csv --students students.csv --scores scores.csv
 * npx tsx scripts/import-cli.ts --dry-run --users users.csv
 * npx tsx scripts/import-cli.ts --help
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
import { executeImport, executeDryRun } from '../lib/import/import-executor'
import type { ImportExecutionResult } from '../lib/import/types'

// CLI Arguments interface
interface CLIArgs {
  users?: string
  classes?: string
  students?: string
  scores?: string
  dryRun?: boolean
  help?: boolean
  generateTemplates?: boolean
  output?: string
  encoding?: 'utf8' | 'utf16le' | 'latin1'
  delimiter?: string
  maxRows?: number
  skipErrors?: boolean
  verbose?: boolean
  userEmail?: string // For authentication
}

// Parse command line arguments
function parseArgs(): CLIArgs {
  const args: CLIArgs = {}
  const argv = process.argv.slice(2)
  
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const nextArg = argv[i + 1]
    
    switch (arg) {
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
      case '--dry-run':
        args.dryRun = true
        break
      case '--help':
      case '-h':
        args.help = true
        break
      case '--generate-templates':
        args.generateTemplates = true
        break
      case '--output':
      case '-o':
        args.output = nextArg
        i++
        break
      case '--encoding':
        args.encoding = nextArg as 'utf8' | 'utf16le' | 'latin1'
        i++
        break
      case '--delimiter':
        args.delimiter = nextArg
        i++
        break
      case '--max-rows':
        args.maxRows = parseInt(nextArg || '0')
        i++
        break
      case '--skip-errors':
        args.skipErrors = true
        break
      case '--verbose':
      case '-v':
        args.verbose = true
        break
      case '--user-email':
        args.userEmail = nextArg
        i++
        break
    }
  }
  
  return args
}

// Display help information
function showHelp(): void {
  console.log(`
LMS-ESID CSV Import Tool

Usage:
  npx tsx scripts/import-cli.ts [options]

Options:
  --users <file>         Path to users CSV file
  --classes <file>       Path to classes CSV file  
  --students <file>      Path to students CSV file
  --scores <file>        Path to scores CSV file
  
  --dry-run              Validate files without importing (default: false)
  --generate-templates   Generate sample CSV templates
  --output <dir>         Output directory for reports and templates (default: ./import-output)
  
  --encoding <type>      File encoding: utf8, utf16le, latin1 (default: utf8)
  --delimiter <char>     CSV delimiter (auto-detected if not specified)
  --max-rows <number>    Maximum rows to process per file
  --skip-errors          Skip rows with validation errors
  
  --user-email <email>   User email for authentication (required for actual import)
  --verbose, -v          Verbose output
  --help, -h             Show this help message

Examples:
  # Generate sample templates
  npx tsx scripts/import-cli.ts --generate-templates
  
  # Validate files only (dry run)
  npx tsx scripts/import-cli.ts --dry-run --users data/users.csv --classes data/classes.csv
  
  # Import all data types
  npx tsx scripts/import-cli.ts --users users.csv --classes classes.csv --students students.csv --scores scores.csv --user-email admin@esid.edu
  
  # Import with custom settings
  npx tsx scripts/import-cli.ts --users users.csv --encoding utf16le --max-rows 1000 --skip-errors --verbose

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

// Generate sample template files
async function generateTemplates(outputDir: string): Promise<void> {
  console.log('📝 Generating sample CSV templates...')
  
  await fs.mkdir(outputDir, { recursive: true })
  
  const templates = [
    { name: 'users-sample.csv', content: generateSampleUsersCSV() },
    { name: 'classes-sample.csv', content: generateSampleClassesCSV() },
    { name: 'students-sample.csv', content: generateSampleStudentsCSV() },
    { name: 'scores-sample.csv', content: generateSampleScoresCSV() }
  ]
  
  for (const template of templates) {
    const filePath = path.join(outputDir, template.name)
    await fs.writeFile(filePath, template.content, 'utf8')
    console.log(`✅ Created: ${filePath}`)
  }
  
  console.log(`\n📁 Templates generated in: ${outputDir}`)
  console.log('Edit the CSV files with your data and run the import command.')
}

// Authenticate user
async function authenticateUser(supabase: any, userEmail: string): Promise<string> {
  console.log(`🔐 Authenticating user: ${userEmail}`)
  
  // In CLI context, we'll look up the user in the database directly
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, role')
    .eq('email', userEmail)
    .single()
  
  if (error || !user) {
    throw new Error(`User not found: ${userEmail}`)
  }
  
  console.log(`✅ Authenticated as: ${user.role} (${user.email})`)
  return user.id
}

// Create detailed report
async function generateReport(
  result: ImportExecutionResult,
  outputDir: string,
  filename: string
): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true })
  
  const reportPath = path.join(outputDir, filename)
  const timestamp = new Date().toISOString()
  
  const report = `
LMS-ESID Import Report
Generated: ${timestamp}
Status: ${result.success ? 'SUCCESS' : 'FAILED'}

== SUMMARY ==
Users    - Created: ${result.summary.users.created}, Updated: ${result.summary.users.updated}, Errors: ${result.summary.users.errors}
Classes  - Created: ${result.summary.classes.created}, Updated: ${result.summary.classes.updated}, Errors: ${result.summary.classes.errors}
Students - Created: ${result.summary.students.created}, Updated: ${result.summary.students.updated}, Errors: ${result.summary.students.errors}
Scores   - Created: ${result.summary.scores.created}, Updated: ${result.summary.scores.updated}, Errors: ${result.summary.scores.errors}

== ERRORS ==
${result.errors.length === 0 ? 'No errors' : result.errors.map(err => 
  `[${err.stage.toUpperCase()}] ${err.operation}: ${err.error}`
).join('\n')}

== WARNINGS ==
${result.warnings.length === 0 ? 'No warnings' : result.warnings.map(warn => 
  `[${warn.stage.toUpperCase()}] ${warn.message}${warn.data ? ' - ' + JSON.stringify(warn.data) : ''}`
).join('\n')}
`
  
  await fs.writeFile(reportPath, report, 'utf8')
  console.log(`📄 Report saved: ${reportPath}`)
}

// Main CLI function
async function main(): Promise<void> {
  const args = parseArgs()
  
  // Show help if requested or no arguments
  if (args.help || process.argv.length === 2) {
    showHelp()
    return
  }
  
  const outputDir = args.output || './import-output'
  
  // Generate templates if requested
  if (args.generateTemplates) {
    await generateTemplates(outputDir)
    return
  }
  
  // Check if any import files are specified
  const hasImportFiles = args.users || args.classes || args.students || args.scores
  if (!hasImportFiles) {
    console.error('❌ Error: No import files specified')
    console.error('Use --help to see available options')
    process.exit(1)
  }
  
  console.log('🚀 Starting LMS-ESID CSV Import...')
  
  try {
    // Initialize Supabase
    const supabase = initializeSupabase()
    
    // Authenticate user (required for actual imports)
    let userUUID = ''
    if (!args.dryRun) {
      if (!args.userEmail) {
        console.error('❌ Error: --user-email is required for actual imports')
        console.error('Use --dry-run for validation only')
        process.exit(1)
      }
      userUUID = await authenticateUser(supabase, args.userEmail)
    }
    
    const parseOptions = {
      encoding: args.encoding || 'utf8' as const,
      delimiter: args.delimiter,
      maxRows: args.maxRows,
      skipLinesWithError: args.skipErrors || false
    }
    
    const validationResults: any = {}
    
    // Validate each file type
    if (args.users) {
      console.log(`📋 Validating users: ${args.users}`)
      const content = await fs.readFile(args.users, parseOptions.encoding)
      validationResults.users = await validateUsersCSV(content, parseOptions)
      const { valid, invalid } = validationResults.users.summary
      console.log(`✅ Users: ${valid} valid, ${invalid} invalid`)
      
      if (args.verbose && invalid > 0) {
        validationResults.users.invalid.forEach((err: any) => {
          console.log(`   Row ${err.row}: ${err.errors.join(', ')}`)
        })
      }
    }
    
    if (args.classes) {
      console.log(`📋 Validating classes: ${args.classes}`)
      const content = await fs.readFile(args.classes, parseOptions.encoding)
      validationResults.classes = await validateClassesCSV(content, parseOptions)
      const { valid, invalid } = validationResults.classes.summary
      console.log(`✅ Classes: ${valid} valid, ${invalid} invalid`)
    }
    
    if (args.students) {
      console.log(`📋 Validating students: ${args.students}`)
      const content = await fs.readFile(args.students, parseOptions.encoding)
      validationResults.students = await validateStudentsCSV(content, parseOptions)
      const { valid, invalid } = validationResults.students.summary
      console.log(`✅ Students: ${valid} valid, ${invalid} invalid`)
    }
    
    if (args.scores) {
      console.log(`📋 Validating scores: ${args.scores}`)
      const content = await fs.readFile(args.scores, parseOptions.encoding)
      validationResults.scores = await validateScoresCSV(content, parseOptions)
      const { valid, invalid } = validationResults.scores.summary
      console.log(`✅ Scores: ${valid} valid, ${invalid} invalid`)
    }
    
    // Execute dry run or actual import
    if (args.dryRun) {
      console.log('\n🧪 Executing dry run...')
      const dryRunResult = await executeDryRun(validationResults)
      
      console.log('\n📊 Dry Run Results:')
      console.log(`Would Create: ${JSON.stringify(dryRunResult.wouldCreate, null, 2)}`)
      console.log(`Potential Warnings: ${dryRunResult.potentialWarnings.length}`)
      
      if (dryRunResult.potentialWarnings.length > 0 && args.verbose) {
        dryRunResult.potentialWarnings.forEach(warning => {
          console.log(`⚠️  ${warning.stage}: ${warning.message}`)
        })
      }
      
      console.log('\n✅ Dry run completed successfully')
    } else {
      console.log('\n🚀 Executing import...')
      const importResult = await executeImport(validationResults, userUUID)
      
      console.log('\n📊 Import Results:')
      console.log(`Success: ${importResult.success}`)
      console.log(`Users: ${importResult.summary.users.created} created, ${importResult.summary.users.updated} updated`)
      console.log(`Classes: ${importResult.summary.classes.created} created, ${importResult.summary.classes.updated} updated`)
      console.log(`Students: ${importResult.summary.students.created} created, ${importResult.summary.students.updated} updated`)
      console.log(`Scores: ${importResult.summary.scores.created} created, ${importResult.summary.scores.updated} updated`)
      
      if (importResult.errors.length > 0) {
        console.log(`\n❌ Errors: ${importResult.errors.length}`)
        importResult.errors.forEach(error => {
          console.error(`   ${error.stage}: ${error.error}`)
        })
      }
      
      if (importResult.warnings.length > 0) {
        console.log(`\n⚠️  Warnings: ${importResult.warnings.length}`)
        if (args.verbose) {
          importResult.warnings.forEach(warning => {
            console.warn(`   ${warning.stage}: ${warning.message}`)
          })
        }
      }
      
      // Generate detailed report
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      await generateReport(importResult, outputDir, `import-report-${timestamp}.txt`)
      
      if (importResult.success) {
        console.log('\n✅ Import completed successfully!')
      } else {
        console.log('\n❌ Import completed with errors!')
        process.exit(1)
      }
    }
    
  } catch (error: any) {
    console.error(`\n❌ Fatal error: ${error.message}`)
    if (args.verbose) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('Unexpected error:', error)
    process.exit(1)
  })
}
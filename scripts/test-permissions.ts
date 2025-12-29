/**
 * Permission System Test Script
 *
 * This script tests the permission system to ensure all roles work correctly.
 * Run with: npx tsx scripts/test-permissions.ts
 *
 * Tests pure functions only (no database/auth dependencies)
 *
 * @date 2025-12-29
 */

// ============================================================================
// Inline pure function copies (to avoid Supabase import chain)
// ============================================================================

type UserRole = 'admin' | 'head' | 'teacher' | 'office_member'
type CourseType = 'LT' | 'IT' | 'KCFS'

interface CurrentUser {
  id: string
  role: UserRole
  gradeBand: string | null
  track: CourseType | null
  teacherType: CourseType | null
  fullName: string
}

interface PermissionResult {
  allowed: boolean
  reason: string
}

function parseGradeBand(gradeBand: string): number[] {
  if (gradeBand.includes('-')) {
    const [start, end] = gradeBand.split('-').map(Number)
    if (start === undefined || end === undefined || isNaN(start) || isNaN(end)) {
      return []
    }
    const grades: number[] = []
    for (let i = start; i <= end; i++) {
      grades.push(i)
    }
    return grades
  }
  const grade = Number(gradeBand)
  return isNaN(grade) ? [] : [grade]
}

function gradeInBand(grade: number, gradeBand: string): boolean {
  const grades = parseGradeBand(gradeBand)
  return grades.includes(grade)
}

function canAccessGrade(user: CurrentUser, targetGrade: number): PermissionResult {
  switch (user.role) {
    case 'admin':
      return { allowed: true, reason: 'Admin has full access' }
    case 'office_member':
      return { allowed: true, reason: 'Office member has read access to all grades' }
    case 'head':
      if (!user.gradeBand) {
        return { allowed: false, reason: 'Head teacher has no grade band assigned' }
      }
      if (gradeInBand(targetGrade, user.gradeBand)) {
        return { allowed: true, reason: `Head teacher can access grade ${targetGrade}` }
      }
      return { allowed: false, reason: `Head teacher cannot access grade ${targetGrade}` }
    case 'teacher':
      return { allowed: false, reason: 'Teachers should access data via course, not grade' }
    default:
      return { allowed: false, reason: 'Unknown role' }
  }
}

function canAccessCourseType(user: CurrentUser, targetType: CourseType): PermissionResult {
  switch (user.role) {
    case 'admin':
      return { allowed: true, reason: 'Admin has full access' }
    case 'office_member':
      return { allowed: true, reason: 'Office member has read access to all course types' }
    case 'head':
      if (!user.track) {
        return { allowed: false, reason: 'Head teacher has no track assigned' }
      }
      if (user.track === targetType) {
        return { allowed: true, reason: `Head teacher can access ${targetType}` }
      }
      return { allowed: false, reason: `Head teacher cannot access ${targetType}` }
    case 'teacher':
      if (!user.teacherType) {
        return { allowed: false, reason: 'Teacher has no teacher_type assigned' }
      }
      if (user.teacherType === targetType) {
        return { allowed: true, reason: `Teacher can access ${targetType}` }
      }
      return { allowed: false, reason: `Teacher cannot access ${targetType}` }
    default:
      return { allowed: false, reason: 'Unknown role' }
  }
}

function canWrite(user: CurrentUser): PermissionResult {
  switch (user.role) {
    case 'admin':
      return { allowed: true, reason: 'Admin has full write access' }
    case 'office_member':
      return { allowed: false, reason: 'Office member has read-only access' }
    case 'head':
      return { allowed: true, reason: 'Head teacher can write within their scope' }
    case 'teacher':
      return { allowed: true, reason: 'Teacher can write for their own courses' }
    default:
      return { allowed: false, reason: 'Unknown role' }
  }
}

function canAccessBrowse(user: CurrentUser): PermissionResult {
  switch (user.role) {
    case 'admin':
      return { allowed: true, reason: 'Admin can access browse' }
    case 'office_member':
      return { allowed: true, reason: 'Office member can access browse' }
    case 'head':
      return { allowed: true, reason: 'Head teacher can access browse (filtered)' }
    case 'teacher':
      return { allowed: false, reason: 'Teachers cannot access browse pages' }
    default:
      return { allowed: false, reason: 'Unknown role' }
  }
}

function canAccessAdmin(user: CurrentUser): PermissionResult {
  if (user.role === 'admin') {
    return { allowed: true, reason: 'Admin can access admin pages' }
  }
  return { allowed: false, reason: 'Only admin can access admin pages' }
}

function filterByRole<T>(
  data: T[],
  user: CurrentUser,
  options: {
    gradeField?: keyof T
    courseTypeField?: keyof T
    teacherIdField?: keyof T
  }
): T[] {
  const { gradeField, courseTypeField, teacherIdField } = options

  switch (user.role) {
    case 'admin':
    case 'office_member':
      return data
    case 'head':
      return data.filter(item => {
        const record = item as Record<string, unknown>
        if (gradeField && user.gradeBand) {
          const grade = record[gradeField as string] as number
          if (typeof grade === 'number' && !gradeInBand(grade, user.gradeBand)) {
            return false
          }
        }
        if (courseTypeField && user.track) {
          const courseType = record[courseTypeField as string] as string
          if (courseType !== user.track) {
            return false
          }
        }
        return true
      })
    case 'teacher':
      if (!teacherIdField) {
        return []
      }
      return data.filter(item => {
        const record = item as Record<string, unknown>
        return record[teacherIdField as string] === user.id
      })
    default:
      return []
  }
}

function getPermissionSummary(user: CurrentUser): string[] {
  const summary: string[] = []
  summary.push(`Role: ${user.role}`)
  switch (user.role) {
    case 'admin':
      summary.push('- Full access to all data')
      summary.push('- Can write to all tables')
      summary.push('- Can access admin pages')
      break
    case 'office_member':
      summary.push('- Read access to all data')
      summary.push('- Cannot write/modify data')
      summary.push('- Can access browse pages')
      break
    case 'head':
      summary.push(`- Grade band: ${user.gradeBand || 'None'}`)
      summary.push(`- Track: ${user.track || 'None'}`)
      if (user.gradeBand) {
        summary.push(`- Can access grades: ${parseGradeBand(user.gradeBand).join(', ')}`)
      }
      summary.push('- Can write within scope')
      summary.push('- Can access browse pages (filtered)')
      break
    case 'teacher':
      summary.push(`- Teacher type: ${user.teacherType || 'None'}`)
      summary.push('- Can only access own courses')
      summary.push('- Cannot access browse pages')
      break
  }
  return summary
}

// Test data: mock users
const mockUsers: Record<string, CurrentUser> = {
  admin: {
    id: 'admin-uuid',
    role: 'admin',
    gradeBand: null,
    track: null,
    teacherType: null,
    fullName: 'Admin User'
  },
  officeStaff: {
    id: 'office-uuid',
    role: 'office_member',
    gradeBand: null,
    track: null,
    teacherType: null,
    fullName: 'Office Staff'
  },
  headG34LT: {
    id: 'head-g34-lt-uuid',
    role: 'head',
    gradeBand: '3-4',
    track: 'LT',
    teacherType: 'LT',
    fullName: 'Head Teacher G3-4 LT'
  },
  headG56IT: {
    id: 'head-g56-it-uuid',
    role: 'head',
    gradeBand: '5-6',
    track: 'IT',
    teacherType: 'IT',
    fullName: 'Head Teacher G5-6 IT'
  },
  teacherLT: {
    id: 'teacher-lt-uuid',
    role: 'teacher',
    gradeBand: null,
    track: null,
    teacherType: 'LT',
    fullName: 'LT Teacher'
  },
  teacherKCFS: {
    id: 'teacher-kcfs-uuid',
    role: 'teacher',
    gradeBand: null,
    track: null,
    teacherType: 'KCFS',
    fullName: 'KCFS Teacher'
  }
}

// Test utilities
let passed = 0
let failed = 0

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✅ ${message}`)
    passed++
  } else {
    console.log(`  ❌ ${message}`)
    failed++
  }
}

function section(name: string): void {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${name}`)
  console.log('='.repeat(60))
}

// ============================================================================
// Tests
// ============================================================================

function testParseGradeBand(): void {
  section('Testing parseGradeBand()')

  assert(
    JSON.stringify(parseGradeBand('1')) === '[1]',
    'parseGradeBand("1") should return [1]'
  )

  assert(
    JSON.stringify(parseGradeBand('3-4')) === '[3,4]',
    'parseGradeBand("3-4") should return [3,4]'
  )

  assert(
    JSON.stringify(parseGradeBand('5-6')) === '[5,6]',
    'parseGradeBand("5-6") should return [5,6]'
  )

  assert(
    JSON.stringify(parseGradeBand('1-6')) === '[1,2,3,4,5,6]',
    'parseGradeBand("1-6") should return [1,2,3,4,5,6]'
  )
}

function testGradeInBand(): void {
  section('Testing gradeInBand()')

  assert(
    gradeInBand(3, '3-4') === true,
    'Grade 3 should be in band "3-4"'
  )

  assert(
    gradeInBand(4, '3-4') === true,
    'Grade 4 should be in band "3-4"'
  )

  assert(
    gradeInBand(5, '3-4') === false,
    'Grade 5 should NOT be in band "3-4"'
  )

  assert(
    gradeInBand(2, '3-4') === false,
    'Grade 2 should NOT be in band "3-4"'
  )

  assert(
    gradeInBand(1, '1') === true,
    'Grade 1 should be in band "1"'
  )
}

function testCanAccessGrade(): void {
  section('Testing canAccessGrade()')

  // Admin
  const adminResult = canAccessGrade(mockUsers.admin!, 5)
  assert(adminResult.allowed === true, 'Admin can access grade 5')

  // Office Member
  const officeResult = canAccessGrade(mockUsers.officeStaff!, 5)
  assert(officeResult.allowed === true, 'Office member can access grade 5')

  // Head G3-4 LT
  const headG34Result3 = canAccessGrade(mockUsers.headG34LT!, 3)
  assert(headG34Result3.allowed === true, 'Head G3-4 can access grade 3')

  const headG34Result5 = canAccessGrade(mockUsers.headG34LT!, 5)
  assert(headG34Result5.allowed === false, 'Head G3-4 cannot access grade 5')

  // Teacher
  const teacherResult = canAccessGrade(mockUsers.teacherLT!, 3)
  assert(teacherResult.allowed === false, 'Teacher cannot access by grade (use course instead)')
}

function testCanAccessCourseType(): void {
  section('Testing canAccessCourseType()')

  // Admin
  const adminLT = canAccessCourseType(mockUsers.admin!, 'LT')
  assert(adminLT.allowed === true, 'Admin can access LT courses')

  const adminKCFS = canAccessCourseType(mockUsers.admin!, 'KCFS')
  assert(adminKCFS.allowed === true, 'Admin can access KCFS courses')

  // Head G3-4 LT
  const headLT = canAccessCourseType(mockUsers.headG34LT!, 'LT')
  assert(headLT.allowed === true, 'Head LT can access LT courses')

  const headIT = canAccessCourseType(mockUsers.headG34LT!, 'IT')
  assert(headIT.allowed === false, 'Head LT cannot access IT courses')

  // Teacher LT
  const teacherLT = canAccessCourseType(mockUsers.teacherLT!, 'LT')
  assert(teacherLT.allowed === true, 'LT Teacher can access LT courses')

  const teacherIT = canAccessCourseType(mockUsers.teacherLT!, 'IT')
  assert(teacherIT.allowed === false, 'LT Teacher cannot access IT courses')
}

function testCanWrite(): void {
  section('Testing canWrite()')

  assert(canWrite(mockUsers.admin!).allowed === true, 'Admin can write')
  assert(canWrite(mockUsers.officeStaff!).allowed === false, 'Office member cannot write')
  assert(canWrite(mockUsers.headG34LT!).allowed === true, 'Head can write')
  assert(canWrite(mockUsers.teacherLT!).allowed === true, 'Teacher can write')
}

function testCanAccessBrowse(): void {
  section('Testing canAccessBrowse()')

  assert(canAccessBrowse(mockUsers.admin!).allowed === true, 'Admin can access browse')
  assert(canAccessBrowse(mockUsers.officeStaff!).allowed === true, 'Office can access browse')
  assert(canAccessBrowse(mockUsers.headG34LT!).allowed === true, 'Head can access browse')
  assert(canAccessBrowse(mockUsers.teacherLT!).allowed === false, 'Teacher cannot access browse')
}

function testCanAccessAdmin(): void {
  section('Testing canAccessAdmin()')

  assert(canAccessAdmin(mockUsers.admin!).allowed === true, 'Admin can access admin pages')
  assert(canAccessAdmin(mockUsers.officeStaff!).allowed === false, 'Office cannot access admin pages')
  assert(canAccessAdmin(mockUsers.headG34LT!).allowed === false, 'Head cannot access admin pages')
  assert(canAccessAdmin(mockUsers.teacherLT!).allowed === false, 'Teacher cannot access admin pages')
}

function testFilterByRole(): void {
  section('Testing filterByRole()')

  // Sample data
  const courses = [
    { id: '1', grade: 3, course_type: 'LT', teacher_id: 'teacher-lt-uuid' },
    { id: '2', grade: 3, course_type: 'IT', teacher_id: 'teacher-it-uuid' },
    { id: '3', grade: 4, course_type: 'LT', teacher_id: 'teacher-lt-uuid' },
    { id: '4', grade: 5, course_type: 'LT', teacher_id: 'teacher-lt-2-uuid' },
    { id: '5', grade: 5, course_type: 'IT', teacher_id: 'teacher-it-uuid' },
  ]

  // Admin sees all
  const adminFiltered = filterByRole(courses, mockUsers.admin!, {
    gradeField: 'grade',
    courseTypeField: 'course_type'
  })
  assert(adminFiltered.length === 5, 'Admin sees all 5 courses')

  // Head G3-4 LT sees only G3-4 LT courses
  const headFiltered = filterByRole(courses, mockUsers.headG34LT!, {
    gradeField: 'grade',
    courseTypeField: 'course_type'
  })
  assert(
    headFiltered.length === 2,
    `Head G3-4 LT sees 2 courses (got ${headFiltered.length})`
  )

  // Teacher sees only their courses
  const teacherFiltered = filterByRole(courses, mockUsers.teacherLT!, {
    teacherIdField: 'teacher_id'
  })
  assert(
    teacherFiltered.length === 2,
    `Teacher LT sees 2 courses (got ${teacherFiltered.length})`
  )
}

function testPermissionSummary(): void {
  section('Testing getPermissionSummary()')

  const adminSummary = getPermissionSummary(mockUsers.admin!)
  assert(adminSummary.includes('Role: admin'), 'Admin summary shows role')
  assert(adminSummary.some(s => s.includes('Full access')), 'Admin summary mentions full access')

  const headSummary = getPermissionSummary(mockUsers.headG34LT!)
  assert(headSummary.some(s => s.includes('3-4')), 'Head summary shows grade band')
  assert(headSummary.some(s => s.includes('LT')), 'Head summary shows track')

  const teacherSummary = getPermissionSummary(mockUsers.teacherLT!)
  assert(teacherSummary.some(s => s.includes('own courses')), 'Teacher summary mentions own courses')
}

// ============================================================================
// Run all tests
// ============================================================================

console.log('\n🔐 Permission System Test Suite')
console.log('================================\n')

testParseGradeBand()
testGradeInBand()
testCanAccessGrade()
testCanAccessCourseType()
testCanWrite()
testCanAccessBrowse()
testCanAccessAdmin()
testFilterByRole()
testPermissionSummary()

// Summary
console.log('\n' + '='.repeat(60))
console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`)

if (failed > 0) {
  console.log('\n❌ Some tests failed!')
  process.exit(1)
} else {
  console.log('\n✅ All tests passed!')
  process.exit(0)
}

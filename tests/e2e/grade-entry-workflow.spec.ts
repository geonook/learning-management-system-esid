import { test, expect } from '@playwright/test'

test.describe('Grade Entry Workflow - End to End', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/auth/login')
  })

  test('should complete full grade entry workflow as admin', async ({ page }) => {
    // Step 1: Login as admin
    await page.fill('[data-testid=email-input]', 'admin@kangchiao.com')
    await page.fill('[data-testid=password-input]', 'admin123')
    await page.click('[data-testid=login-button]')
    
    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid=admin-dashboard]')).toBeVisible()

    // Step 2: Navigate to CSV import page
    await page.click('[data-testid=admin-import-link]')
    await expect(page).toHaveURL('/admin/import')
    
    // Step 3: Import Users (Stage 1)
    await page.click('[data-testid=upload-users-button]')
    
    // Upload users CSV file
    const usersFileInput = page.locator('[data-testid=users-file-input]')
    await usersFileInput.setInputFiles('test-data-primary/1-users-primary.csv')
    
    await page.click('[data-testid=import-users-confirm]')
    
    // Wait for success message
    await expect(page.locator('[data-testid=import-success]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid=users-count]')).toContainText('25')

    // Step 4: Import Classes (Stage 2)
    await page.click('[data-testid=upload-classes-button]')
    
    const classesFileInput = page.locator('[data-testid=classes-file-input]')
    await classesFileInput.setInputFiles('test-data-primary/2-classes-primary.csv')
    
    await page.click('[data-testid=import-classes-confirm]')
    
    await expect(page.locator('[data-testid=import-success]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid=classes-count]')).toContainText('18')

    // Step 5: Import Students (Stage 3)  
    await page.click('[data-testid=upload-students-button]')
    
    const studentsFileInput = page.locator('[data-testid=students-file-input]')
    await studentsFileInput.setInputFiles('test-data-primary/3-students-primary.csv')
    
    await page.click('[data-testid=import-students-confirm]')
    
    await expect(page.locator('[data-testid=import-success]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-testid=students-count]')).toContainText('19')

    // Step 6: Import Scores (Stage 4)
    await page.click('[data-testid=upload-scores-button]')
    
    const scoresFileInput = page.locator('[data-testid=scores-file-input]')
    await scoresFileInput.setInputFiles('test-data-primary/4-scores-primary.csv')
    
    await page.click('[data-testid=import-scores-confirm]')
    
    await expect(page.locator('[data-testid=import-success]')).toBeVisible({ timeout: 15000 })
    
    // Step 7: Verify dashboard updates with imported data
    await page.click('[data-testid=dashboard-link]')
    await expect(page).toHaveURL('/dashboard')
    
    // Check that admin dashboard shows updated statistics
    await expect(page.locator('[data-testid=total-students]')).toContainText('19')
    await expect(page.locator('[data-testid=total-classes]')).toContainText('18')
    await expect(page.locator('[data-testid=total-teachers]')).toContainText('18')
    
    // Verify grade calculations are working
    await expect(page.locator('[data-testid=average-performance]')).toBeVisible()
    
    // Step 8: Navigate to scores page and verify data
    await page.click('[data-testid=scores-link]')
    await expect(page).toHaveURL('/scores')
    
    // Should see score entries with calculated grades
    await expect(page.locator('[data-testid=scores-table]')).toBeVisible()
    await expect(page.locator('[data-testid=formative-avg]')).toBeVisible()
    await expect(page.locator('[data-testid=summative-avg]')).toBeVisible()
    await expect(page.locator('[data-testid=semester-grade]')).toBeVisible()
  })

  test('should handle individual score entry as teacher', async ({ page }) => {
    // Step 1: Login as LT teacher
    await page.fill('[data-testid=email-input]', 'lt.teacher.g1@kangchiao.com')
    await page.fill('[data-testid=password-input]', 'teacher123')
    await page.click('[data-testid=login-button]')
    
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid=teacher-dashboard]')).toBeVisible()

    // Step 2: Navigate to scores page (teacher view)
    await page.click('[data-testid=scores-link]')
    await expect(page).toHaveURL('/scores')
    
    // Should only see classes assigned to this teacher
    await expect(page.locator('[data-testid=teacher-classes]')).toBeVisible()
    
    // Step 3: Enter individual scores
    await page.click('[data-testid=add-score-button]')
    
    // Select student
    await page.click('[data-testid=student-select]')
    await page.click('[data-testid=student-option]:first-child')
    
    // Select assessment
    await page.click('[data-testid=assessment-select]')
    await page.click('[data-testid=assessment-fa1]')
    
    // Enter score
    await page.fill('[data-testid=score-input]', '87.5')
    
    // Save score
    await page.click('[data-testid=save-score-button]')
    
    // Verify success and grade calculation update
    await expect(page.locator('[data-testid=score-saved]')).toBeVisible()
    await expect(page.locator('[data-testid=updated-formative-avg]')).toBeVisible()
  })

  test('should display proper role-based access restrictions', async ({ page }) => {
    // Step 1: Login as head teacher
    await page.fill('[data-testid=email-input]', 'ht.g2.local@kangchiao.com')
    await page.fill('[data-testid=password-input]', 'head123')
    await page.click('[data-testid=login-button]')
    
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid=head-dashboard]')).toBeVisible()

    // Step 2: Verify access to assigned grade and campus only
    await page.click('[data-testid=classes-link]')
    await expect(page).toHaveURL('/classes')
    
    // Should only see Grade 2 Local classes
    await expect(page.locator('[data-testid=grade-filter]')).toHaveValue('2')
    await expect(page.locator('[data-testid=campus-filter]')).toHaveValue('local')
    
    // Step 3: Verify cannot access admin functions
    await expect(page.locator('[data-testid=admin-import-link]')).not.toBeVisible()
    await expect(page.locator('[data-testid=admin-users-link]')).not.toBeVisible()
    
    // Step 4: Verify can manage assessment titles for assigned scope
    await page.click('[data-testid=settings-link]')
    await expect(page).toHaveURL('/settings')
    
    await expect(page.locator('[data-testid=assessment-titles-section]')).toBeVisible()
    await page.click('[data-testid=customize-assessment-titles]')
    
    // Should be able to set custom titles for Grade 2 Local
    await expect(page.locator('[data-testid=assessment-customization]')).toBeVisible()
    await expect(page.locator('[data-testid=scope-grade]')).toHaveValue('2')
    await expect(page.locator('[data-testid=scope-campus]')).toHaveValue('local')
  })

  test('should validate grade calculations in real-time', async ({ page }) => {
    // Login as admin for full access
    await page.fill('[data-testid=email-input]', 'admin@kangchiao.com')
    await page.fill('[data-testid=password-input]', 'admin123')
    await page.click('[data-testid=login-button]')
    
    await page.click('[data-testid=scores-link]')
    
    // Open grade calculator panel
    await page.click('[data-testid=grade-calculator-button]')
    await expect(page.locator('[data-testid=grade-calculator-panel]')).toBeVisible()
    
    // Test scenario: Enter mixed scores and verify calculations
    await page.fill('[data-testid=fa1-input]', '85')
    await page.fill('[data-testid=fa2-input]', '92')
    await page.fill('[data-testid=fa3-input]', '0') // Should be excluded
    await page.fill('[data-testid=sa1-input]', '88')
    await page.fill('[data-testid=final-input]', '90')
    
    // Verify live calculations
    await expect(page.locator('[data-testid=formative-avg]')).toHaveText('88.50') // (85+92)/2
    await expect(page.locator('[data-testid=summative-avg]')).toHaveText('88.00') // Just SA1
    await expect(page.locator('[data-testid=semester-grade]')).toHaveText('88.53') // Weighted calculation
    
    // Test edge case: All zeros should show null
    await page.fill('[data-testid=fa1-input]', '0')
    await page.fill('[data-testid=fa2-input]', '0')
    await page.fill('[data-testid=sa1-input]', '0')
    await page.fill('[data-testid=final-input]', '0')
    
    await expect(page.locator('[data-testid=formative-avg]')).toHaveText('--')
    await expect(page.locator('[data-testid=summative-avg]')).toHaveText('--')
    await expect(page.locator('[data-testid=semester-grade]')).toHaveText('--')
  })
})
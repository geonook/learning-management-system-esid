import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the login page
    await page.goto('/auth/login')
  })

  test('should display login form', async ({ page }) => {
    // Check if login form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('should show validation errors for empty form', async ({ page }) => {
    // Try to submit empty form
    await page.click('button[type="submit"]')
    
    // Should show validation errors
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    // Should show error message
    await expect(page.locator('text=Invalid credentials')).toBeVisible()
  })

  // Note: This test requires a test user to be set up in Supabase
  test.skip('should login successfully with valid credentials', async ({ page }) => {
    // Fill in valid test credentials
    await page.fill('input[type="email"]', 'test@school.edu')
    await page.fill('input[type="password"]', 'testpassword123')
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })
})

test.describe('Role-based Access', () => {
  test.skip('admin should access all areas', async ({ page }) => {
    // Login as admin (requires test admin user)
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', 'admin@school.edu')
    await page.fill('input[type="password"]', 'adminpassword')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Should see admin navigation items
    await expect(page.locator('nav')).toContainText('Admin Panel')
    await expect(page.locator('nav')).toContainText('All Classes')
    await expect(page.locator('nav')).toContainText('All Reports')
  })

  test.skip('teacher should see limited access', async ({ page }) => {
    // Login as teacher (requires test teacher user)
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', 'teacher@school.edu')
    await page.fill('input[type="password"]', 'teacherpassword')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Should NOT see admin navigation items
    await expect(page.locator('nav')).not.toContainText('Admin Panel')
    
    // Should see teacher-specific items
    await expect(page.locator('nav')).toContainText('My Classes')
    await expect(page.locator('nav')).toContainText('Grade Entry')
  })
})

test.describe('Authentication State', () => {
  test('should redirect to login when not authenticated', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard')
    
    // Should redirect to login
    await expect(page).toHaveURL('/auth/login')
  })

  test.skip('should logout successfully', async ({ page }) => {
    // Login first (requires test user)
    await page.goto('/auth/login')
    await page.fill('input[type="email"]', 'test@school.edu')
    await page.fill('input[type="password"]', 'testpassword123')
    await page.click('button[type="submit"]')
    
    await expect(page).toHaveURL('/dashboard')
    
    // Click logout button
    await page.click('button[data-testid="logout-button"]')
    
    // Should redirect to login page
    await expect(page).toHaveURL('/auth/login')
    
    // Trying to access dashboard should redirect to login
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/auth/login')
  })
})
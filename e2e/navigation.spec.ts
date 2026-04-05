import { test, expect } from '@playwright/test'

test.describe('Navigation and Route Protection', () => {
  test('protected routes redirect to /login when not authenticated', async ({ page }) => {
    // Try visiting the dashboard (protected route)
    await page.goto('/dashboard')

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('root path redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/')

    // Should eventually end up at login
    await expect(page).toHaveURL(/\/login/)
  })

  test('settings page redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/settings')

    await expect(page).toHaveURL(/\/login/)
  })

  test('login page has all expected elements', async ({ page }) => {
    await page.goto('/login')

    // Heading
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()

    // Form fields
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible()
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible()

    // Buttons
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible()

    // Links
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /create account/i })).toBeVisible()
  })
})

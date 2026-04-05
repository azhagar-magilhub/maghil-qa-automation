import { test, expect } from '@playwright/test'

test.describe('Authentication Pages', () => {
  test('login page displays all form elements', async ({ page }) => {
    await page.goto('/login')

    // Verify heading
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()

    // Verify email input
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible()

    // Verify password input
    await expect(page.getByPlaceholder('Enter your password')).toBeVisible()

    // Verify submit button
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()

    // Verify forgot password link
    await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible()

    // Verify register link
    await expect(page.getByRole('link', { name: /create account/i })).toBeVisible()
  })

  test('register page displays all fields', async ({ page }) => {
    await page.goto('/register')

    // Verify heading
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible()

    // Verify all input fields
    await expect(page.getByPlaceholder('John Doe')).toBeVisible()
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible()
    await expect(page.getByPlaceholder('Min. 6 characters')).toBeVisible()
    await expect(page.getByPlaceholder('Re-enter your password')).toBeVisible()

    // Verify submit button
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()

    // Verify sign in link
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible()
  })

  test('forgot password page displays email input', async ({ page }) => {
    await page.goto('/forgot-password')

    // Verify heading
    await expect(page.getByRole('heading', { name: /forgot password/i })).toBeVisible()

    // Verify email input
    await expect(page.getByPlaceholder('you@company.com')).toBeVisible()

    // Verify submit button
    await expect(page.getByRole('button', { name: /send reset link/i })).toBeVisible()

    // Verify back to sign in link
    await expect(page.getByRole('link', { name: /back to sign in/i })).toBeVisible()
  })

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')

    // Fill in invalid credentials
    await page.getByPlaceholder('you@company.com').fill('invalid@example.com')
    await page.getByPlaceholder('Enter your password').fill('wrongpassword')

    // Submit the form
    await page.getByRole('button', { name: /sign in/i }).click()

    // Wait for and verify error message appears
    // The exact error depends on the Firebase backend, so we check for the error container
    const errorContainer = page.locator('.bg-red-50, [class*="red"]')
    await expect(errorContainer.first()).toBeVisible({ timeout: 10000 })
  })
})

import { test, expect } from '@playwright/test'

test.describe('PostsApp V1.0 Web E2E Happy Paths', () => {
  test('1. Reader Homepage loads with bilingual elements and navigation', async ({ page }) => {
    await page.goto('/en')

    // Expect brand title and header
    await expect(page).toHaveTitle(/PostsApp/)
    const brand = page.locator('header a', { hasText: 'PostsApp' })
    await expect(brand).toBeVisible()

    // Expect category navigation chips
    const nav = page.locator('nav[aria-label="Categories"]')
    await expect(nav).toBeVisible()

    // Expect language switcher
    const switcher = page.locator('[aria-label="Language selection"]')
    await expect(switcher).toBeVisible()
    await expect(switcher.locator('button', { hasText: 'English' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('2. Language switcher toggles to Tamil edition', async ({ page }) => {
    await page.goto('/en')

    const taBtn = page.locator('[aria-label="Language selection"] button', { hasText: 'தமிழ்' })
    await taBtn.click()

    await expect(page).toHaveURL(/\/ta/)
    const taActiveBtn = page.locator('[aria-label="Language selection"] button', { hasText: 'தமிழ்' })
    await expect(taActiveBtn).toHaveAttribute('aria-pressed', 'true')
  })

  test('3. Unauthenticated access to /admin redirects to /admin/login', async ({ page }) => {
    await page.goto('/admin/analytics')

    // Guard redirects to /admin/login
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(page.locator('h1')).toContainText(/Editorial Login/i)
  })

  test('4. Static pages render with legal review disclosures', async ({ page }) => {
    await page.goto('/en/privacy')

    await expect(page.locator('h1')).toHaveText(/Privacy Policy/i)
    const disclosure = page.locator('text=[Pending legal review]')
    await expect(disclosure).toBeVisible()
  })
})

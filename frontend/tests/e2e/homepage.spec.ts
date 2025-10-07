import { test, expect } from '@playwright/test'

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/')
    
    // Check if the page title is correct
    await expect(page).toHaveTitle(/Soladia/)
    
    // Check if the main navigation is present
    await expect(page.locator('nav')).toBeVisible()
    
    // Check if the hero section is present
    await expect(page.locator('h1')).toContainText('Soladia')
  })

  test('should display featured products', async ({ page }) => {
    await page.goto('/')
    
    // Check if featured products section is present
    await expect(page.locator('[data-testid="featured-products"]')).toBeVisible()
    
    // Check if product cards are rendered
    const productCards = page.locator('[data-testid="product-card"]')
    await expect(productCards).toHaveCountGreaterThan(0)
  })

  test('should navigate to products page', async ({ page }) => {
    await page.goto('/')
    
    // Click on the products link
    await page.click('a[href="/products"]')
    
    // Check if we're on the products page
    await expect(page).toHaveURL('/products')
    await expect(page.locator('h1')).toContainText('Products')
  })

  test('should navigate to categories page', async ({ page }) => {
    await page.goto('/')
    
    // Click on the categories link
    await page.click('a[href="/categories"]')
    
    // Check if we're on the categories page
    await expect(page).toHaveURL('/categories')
    await expect(page.locator('h1')).toContainText('Categories')
  })

  test('should display wallet connection button', async ({ page }) => {
    await page.goto('/')
    
    // Check if wallet connection button is present
    await expect(page.locator('[data-testid="wallet-connect"]')).toBeVisible()
  })

  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/')
    
    // Check if dark mode toggle is present
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]')
    await expect(darkModeToggle).toBeVisible()
    
    // Click the toggle
    await darkModeToggle.click()
    
    // Check if dark mode class is applied
    await expect(page.locator('html')).toHaveClass(/dark/)
  })
})


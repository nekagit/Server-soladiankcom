import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check page title
    await expect(page).toHaveTitle(/Soladia/);
    
    // Check main navigation
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('.soladia-logo')).toBeVisible();
    
    // Check hero section
    await expect(page.locator('.hero-section')).toBeVisible();
    await expect(page.locator('.hero-title')).toContainText('Soladia');
    
    // Check search functionality
    await expect(page.locator('#search-input')).toBeVisible();
    await expect(page.locator('#search-input')).toHaveAttribute('placeholder', 'Search for anything...');
  });

  test('should navigate to products page', async ({ page }) => {
    await page.goto('/');
    
    // Click on products link (assuming it exists in navigation)
    await page.click('a[href="/products"]');
    
    // Should navigate to products page
    await expect(page).toHaveURL(/.*products/);
    await expect(page.locator('h1')).toContainText(/Products/);
  });

  test('should perform search', async ({ page }) => {
    await page.goto('/');
    
    // Type in search input
    await page.fill('#search-input', 'test product');
    
    // Click search button
    await page.click('#search-button');
    
    // Should navigate to search results
    await expect(page).toHaveURL(/.*search/);
  });

  test('should display categories', async ({ page }) => {
    await page.goto('/');
    
    // Check categories section
    await expect(page.locator('.categories-section')).toBeVisible();
    await expect(page.locator('.categories-grid')).toBeVisible();
    
    // Check for category cards
    const categoryCards = page.locator('.category-card');
    await expect(categoryCards).toHaveCount.greaterThan(0);
  });

  test('should display featured products', async ({ page }) => {
    await page.goto('/');
    
    // Check featured products section
    await expect(page.locator('.featured-section')).toBeVisible();
    await expect(page.locator('.products-grid')).toBeVisible();
    
    // Check for product cards
    const productCards = page.locator('.product-card');
    await expect(productCards).toHaveCount.greaterThan(0);
  });

  test('should have working footer', async ({ page }) => {
    await page.goto('/');
    
    // Check footer
    await expect(page.locator('.footer')).toBeVisible();
    
    // Check footer links
    const footerLinks = page.locator('.footer-links a');
    await expect(footerLinks).toHaveCount.greaterThan(0);
  });
});

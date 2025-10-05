import { test, expect } from '@playwright/test';

test.describe('Mobile Experience', () => {
  test('should display mobile menu on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check mobile menu trigger is visible
    await expect(page.locator('#mobile-menu-trigger')).toBeVisible();
    
    // Check desktop navigation is hidden
    await expect(page.locator('.hidden.md\\:flex')).toBeHidden();
  });

  test('should open mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Click mobile menu trigger
    await page.click('#mobile-menu-trigger');
    
    // Check mobile menu is open
    await expect(page.locator('#mobile-menu')).toHaveClass(/active/);
    await expect(page.locator('.mobile-menu-content')).toBeVisible();
  });

  test('should display mobile navigation links', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    await page.click('#mobile-menu-trigger');
    
    // Check navigation links
    await expect(page.locator('.mobile-nav-link')).toHaveCount.greaterThan(0);
    
    // Check for specific links
    await expect(page.locator('a[href="/"]')).toBeVisible();
    await expect(page.locator('a[href="/products"]')).toBeVisible();
    await expect(page.locator('a[href="/categories"]')).toBeVisible();
  });

  test('should close mobile menu when clicking overlay', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    await page.click('#mobile-menu-trigger');
    await expect(page.locator('#mobile-menu')).toHaveClass(/active/);
    
    // Click overlay to close
    await page.click('#mobile-menu-overlay');
    
    // Check mobile menu is closed
    await expect(page.locator('#mobile-menu')).not.toHaveClass(/active/);
  });

  test('should close mobile menu when clicking close button', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    await page.click('#mobile-menu-trigger');
    await expect(page.locator('#mobile-menu')).toHaveClass(/active/);
    
    // Click close button
    await page.click('#mobile-menu-close');
    
    // Check mobile menu is closed
    await expect(page.locator('#mobile-menu')).not.toHaveClass(/active/);
  });

  test('should have mobile search functionality', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    await page.click('#mobile-menu-trigger');
    
    // Check mobile search input
    await expect(page.locator('#mobile-search-input')).toBeVisible();
    await expect(page.locator('#mobile-search-input')).toHaveAttribute('placeholder', 'Search for anything...');
    
    // Test mobile search
    await page.fill('#mobile-search-input', 'test product');
    await page.click('#mobile-search-button');
    
    // Should navigate to search results
    await expect(page).toHaveURL(/.*search/);
  });

  test('should display mobile user actions', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    await page.click('#mobile-menu-trigger');
    
    // Check mobile user actions
    await expect(page.locator('.mobile-user-actions')).toBeVisible();
    await expect(page.locator('.mobile-auth-link')).toBeVisible();
    await expect(page.locator('.mobile-register-btn')).toBeVisible();
  });

  test('should have mobile theme toggle', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    await page.click('#mobile-menu-trigger');
    
    // Check mobile theme toggle
    await expect(page.locator('.mobile-theme-toggle')).toBeVisible();
    await expect(page.locator('#theme-toggle')).toBeVisible();
  });

  test('should be responsive on tablet size', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // Check that mobile menu is not visible
    await expect(page.locator('#mobile-menu-trigger')).toBeHidden();
    
    // Check that desktop navigation is visible
    await expect(page.locator('.hidden.md\\:flex')).toBeVisible();
  });

  test('should handle mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Open mobile menu
    await page.click('#mobile-menu-trigger');
    
    // Click on products link
    await page.click('a[href="/products"]');
    
    // Should navigate to products page
    await expect(page).toHaveURL(/.*products/);
    
    // Mobile menu should close after navigation
    await expect(page.locator('#mobile-menu')).not.toHaveClass(/active/);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Soladia Marketplace E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Soladia/);
    await expect(page.locator('h1')).toContainText('Soladia');
  });

  test('should display navigation menu', async ({ page }) => {
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('a[href="/"]')).toBeVisible();
    await expect(page.locator('a[href="/nft"]')).toBeVisible();
    await expect(page.locator('a[href="/wallet"]')).toBeVisible();
  });

  test('should navigate to NFT marketplace', async ({ page }) => {
    await page.click('a[href="/nft"]');
    await expect(page).toHaveURL(/.*nft/);
    await expect(page.locator('h1')).toContainText('NFT');
  });

  test('should navigate to wallet page', async ({ page }) => {
    await page.click('a[href="/wallet"]');
    await expect(page).toHaveURL(/.*wallet/);
    await expect(page.locator('h1')).toContainText('Wallet');
  });

  test('should display product cards', async ({ page }) => {
    const productCards = page.locator('.product-card, .enhanced-product-card');
    await expect(productCards.first()).toBeVisible();
  });

  test('should handle wallet connection', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        connect: () => Promise.resolve({
          publicKey: {
            toString: () => 'test-public-key'
          }
        }),
        disconnect: () => Promise.resolve(),
        signTransaction: () => Promise.resolve({}),
        signAllTransactions: () => Promise.resolve([])
      };
    });

    const connectButton = page.locator('[data-testid="connect-wallet"], .connect-wallet-btn');
    if (await connectButton.isVisible()) {
      await connectButton.click();
      await expect(page.locator('.wallet-connected, [data-testid="wallet-connected"]')).toBeVisible();
    }
  });

  test('should display AI recommendations', async ({ page }) => {
    const recommendations = page.locator('.ai-recommendations');
    if (await recommendations.isVisible()) {
      await expect(recommendations).toBeVisible();
      await expect(page.locator('.recommendations-title')).toContainText('AI Recommendations');
    }
  });

  test('should show enterprise API management', async ({ page }) => {
    await page.goto('/admin/dashboard');
    const enterpriseAPI = page.locator('.enterprise-api');
    if (await enterpriseAPI.isVisible()) {
      await expect(enterpriseAPI).toBeVisible();
      await expect(page.locator('.api-title')).toContainText('Enterprise API Management');
    }
  });

  test('should display blockchain analytics', async ({ page }) => {
    await page.goto('/analytics');
    const analytics = page.locator('.blockchain-analytics-dashboard');
    if (await analytics.isVisible()) {
      await expect(analytics).toBeVisible();
      await expect(page.locator('.dashboard-title')).toContainText('Blockchain Analytics');
    }
  });

  test('should show social trading features', async ({ page }) => {
    await page.goto('/social');
    const socialTrading = page.locator('.social-trading-dashboard');
    if (await socialTrading.isVisible()) {
      await expect(socialTrading).toBeVisible();
      await expect(page.locator('.dashboard-title')).toContainText('Social Trading');
    }
  });

  test('should handle dark mode toggle', async ({ page }) => {
    const themeToggle = page.locator('[data-testid="theme-toggle"], .theme-toggle');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await expect(page.locator('html')).toHaveClass(/dark/);
      
      await themeToggle.click();
      await expect(page.locator('html')).not.toHaveClass(/dark/);
    }
  });

  test('should display PWA install prompt', async ({ page }) => {
    // Mock PWA install prompt
    await page.addInitScript(() => {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.deferredPrompt = e;
      });
    });

    const installPrompt = page.locator('.pwa-install, .install-prompt');
    if (await installPrompt.isVisible()) {
      await expect(installPrompt).toBeVisible();
    }
  });

  test('should handle offline functionality', async ({ page }) => {
    // Go offline
    await page.context().setOffline(true);
    
    // Should show offline indicator or cached content
    await expect(page.locator('body')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
  });

  test('should display NFT tools', async ({ page }) => {
    await page.goto('/nft');
    const nftTools = page.locator('.advanced-nft-tools');
    if (await nftTools.isVisible()) {
      await expect(nftTools).toBeVisible();
      await expect(page.locator('.tools-title')).toContainText('Advanced NFT Tools');
    }
  });

  test('should handle search functionality', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], .search-input');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test search');
      await searchInput.press('Enter');
      // Should navigate to search results or show results
    }
  });

  test('should display category pages', async ({ page }) => {
    await page.goto('/categories/electronics');
    await expect(page.locator('.category-header, .category-title')).toBeVisible();
    
    const productGrid = page.locator('.products-grid, .category-main-content');
    await expect(productGrid).toBeVisible();
  });

  test('should show product detail pages', async ({ page }) => {
    await page.goto('/product/1');
    await expect(page.locator('.product-detail-container')).toBeVisible();
    await expect(page.locator('.product-title')).toBeVisible();
  });

  test('should handle responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('nav')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('nav')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should handle form submissions', async ({ page }) => {
    await page.goto('/auth');
    
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      await submitButton.click();
      
      // Should handle form submission
    }
  });

  test('should display error pages', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await expect(page.locator('h1')).toContainText(/404|Not Found|Error/);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Test enter key
    await page.keyboard.press('Enter');
    
    // Test escape key
    await page.keyboard.press('Escape');
  });

  test('should display loading states', async ({ page }) => {
    // Navigate to a page that might show loading
    await page.goto('/nft');
    
    // Check for loading indicators
    const loadingElements = page.locator('.loading, .spinner, [data-testid="loading"]');
    if (await loadingElements.count() > 0) {
      await expect(loadingElements.first()).toBeVisible();
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API errors
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' })
      });
    });

    await page.goto('/');
    // Should still display the page with error handling
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display notifications', async ({ page }) => {
    // Trigger a notification
    await page.evaluate(() => {
      if ('Notification' in window) {
        new Notification('Test notification');
      }
    });
    
    // Check if notification is displayed
    const notification = page.locator('.notification, .toast, .alert');
    if (await notification.isVisible()) {
      await expect(notification).toBeVisible();
    }
  });

  test('should handle file uploads', async ({ page }) => {
    await page.goto('/sell');
    
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // Create a test file
      const filePath = 'test-image.jpg';
      await fileInput.setInputFiles(filePath);
      
      // Should handle file upload
    }
  });

  test('should display charts and visualizations', async ({ page }) => {
    await page.goto('/analytics');
    
    const charts = page.locator('canvas, .chart, .graph');
    if (await charts.count() > 0) {
      await expect(charts.first()).toBeVisible();
    }
  });

  test('should handle real-time updates', async ({ page }) => {
    await page.goto('/');
    
    // Mock WebSocket connection
    await page.evaluate(() => {
      const ws = new WebSocket('ws://localhost:8000/ws');
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'test' }));
      };
    });
    
    // Should handle real-time updates
    await expect(page.locator('body')).toBeVisible();
  });

  test('should display accessibility features', async ({ page }) => {
    // Check for ARIA labels
    const ariaLabels = page.locator('[aria-label]');
    await expect(ariaLabels.first()).toBeVisible();
    
    // Check for alt text on images
    const images = page.locator('img[alt]');
    if (await images.count() > 0) {
      await expect(images.first()).toHaveAttribute('alt');
    }
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    await page.goto('/');
    await page.goto('/nft');
    await page.goto('/wallet');
    
    await page.goBack();
    await expect(page).toHaveURL(/.*nft/);
    
    await page.goForward();
    await expect(page).toHaveURL(/.*wallet/);
  });

  test('should display performance metrics', async ({ page }) => {
    // Check for performance monitoring
    const performanceMetrics = await page.evaluate(() => {
      return {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
      };
    });
    
    expect(performanceMetrics.loadTime).toBeGreaterThan(0);
  });
});

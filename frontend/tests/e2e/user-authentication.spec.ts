/**
 * User Authentication E2E Tests
 * Comprehensive testing for user authentication flows
 */

import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form when not authenticated', async ({ page }) => {
    // Check if login form is visible
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Click login button without filling form
    await page.click('[data-testid="login-button"]');

    // Check for validation errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible();
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    // Fill invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Check for email validation error
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
  });

  test('should show validation errors for short password', async ({ page }) => {
    // Fill short password
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', '123');
    await page.click('[data-testid="login-button"]');

    // Check for password validation error
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
  });

  test('should handle login failure', async ({ page }) => {
    // Mock API response for login failure
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' })
      });
    });

    // Fill valid form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Check for error message
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials');
  });

  test('should handle successful login', async ({ page }) => {
    // Mock API response for successful login
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: {
            id: '1',
            email: 'test@example.com',
            name: 'Test User',
            avatar: '/avatar.jpg'
          },
          token: 'mock-jwt-token'
        })
      });
    });

    // Fill valid form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Check for successful login
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');
  });

  test('should handle network error during login', async ({ page }) => {
    // Mock network error
    await page.route('**/api/auth/login', route => {
      route.abort('failed');
    });

    // Fill valid form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Check for network error message
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Network error');
  });

  test('should show loading state during login', async ({ page }) => {
    // Mock delayed API response
    await page.route('**/api/auth/login', route => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, user: { id: '1', email: 'test@example.com' } })
        });
      }, 1000);
    });

    // Fill valid form
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Check for loading state
    await expect(page.locator('[data-testid="login-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
  });

  test('should redirect to dashboard after successful login', async ({ page }) => {
    // Mock API response for successful login
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          token: 'mock-jwt-token'
        })
      });
    });

    // Fill valid form and login
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Check for redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
  });

  test('should handle logout', async ({ page }) => {
    // Mock successful login first
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          token: 'mock-jwt-token'
        })
      });
    });

    // Login
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for login to complete
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Mock logout API
    await page.route('**/api/auth/logout', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Click logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');

    // Check for logout
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    await expect(page).toHaveURL('/');
  });

  test('should handle session expiration', async ({ page }) => {
    // Mock API response for session expiration
    await page.route('**/api/auth/verify', route => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session expired' })
      });
    });

    // Navigate to protected page
    await page.goto('/dashboard');

    // Check for session expiration handling
    await expect(page.locator('[data-testid="session-expired-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
  });

  test('should remember login state on page refresh', async ({ page }) => {
    // Mock successful login
    await page.route('**/api/auth/login', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          user: { id: '1', email: 'test@example.com', name: 'Test User' },
          token: 'mock-jwt-token'
        })
      });
    });

    // Login
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Wait for login to complete
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();

    // Refresh page
    await page.reload();

    // Check if user is still logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle multiple login attempts', async ({ page }) => {
    // Mock API response for multiple failed attempts
    let attemptCount = 0;
    await page.route('**/api/auth/login', route => {
      attemptCount++;
      if (attemptCount <= 3) {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid credentials' })
        });
      } else {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Too many attempts' })
        });
      }
    });

    // Try to login multiple times
    for (let i = 0; i < 4; i++) {
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="login-button"]');
      
      if (i < 3) {
        await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials');
      } else {
        await expect(page.locator('[data-testid="login-error"]')).toContainText('Too many attempts');
      }
    }
  });
});

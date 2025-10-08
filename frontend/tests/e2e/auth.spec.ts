import { expect, test } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/auth');
    });

    test('should display login form', async ({ page }) => {
        await expect(page.locator('h1')).toContainText('Sign In');
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
        await page.click('button[type="submit"]');

        // Check for required field validation
        await expect(page.locator('input[type="email"]')).toHaveAttribute('required');
        await expect(page.locator('input[type="password"]')).toHaveAttribute('required');
    });

    test('should show error for invalid credentials', async ({ page }) => {
        await page.fill('input[type="email"]', 'invalid@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Wait for error message
        await expect(page.locator('.error-message')).toBeVisible();
    });

    test('should successfully login with valid credentials', async ({ page }) => {
        // Mock successful login
        await page.route('**/api/auth/login', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access_token: 'mock-token',
                    user: {
                        id: '1',
                        email: 'admin@example.com',
                        username: 'admin',
                        full_name: 'Admin User',
                        roles: ['admin']
                    }
                })
            });
        });

        await page.fill('input[type="email"]', 'admin@example.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');

        // Should redirect to dashboard or home page
        await expect(page).toHaveURL(/\/(dashboard|home|$)/);
    });

    test('should redirect to login when accessing protected route', async ({ page }) => {
        await page.goto('/profile');

        // Should redirect to auth page
        await expect(page).toHaveURL('/auth');
    });

    test('should logout successfully', async ({ page }) => {
        // First login
        await page.route('**/api/auth/login', async route => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    access_token: 'mock-token',
                    user: {
                        id: '1',
                        email: 'admin@example.com',
                        username: 'admin',
                        full_name: 'Admin User',
                        roles: ['admin']
                    }
                })
            });
        });

        await page.goto('/auth');
        await page.fill('input[type="email"]', 'admin@example.com');
        await page.fill('input[type="password"]', 'admin123');
        await page.click('button[type="submit"]');

        // Wait for redirect
        await page.waitForURL(/\/(dashboard|home|$)/);

        // Click logout
        await page.click('[data-testid="logout-button"]');

        // Should redirect to auth page
        await expect(page).toHaveURL('/auth');
    });
});

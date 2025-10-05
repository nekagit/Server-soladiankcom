import { test, expect } from '@playwright/test';

test.describe('Solana Wallet Integration', () => {
  test('should display wallet connection button', async ({ page }) => {
    await page.goto('/');
    
    // Check for wallet connection elements
    await expect(page.locator('[data-testid="wallet-connect"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-connect"]')).toContainText('Connect Wallet');
  });

  test('should open wallet connection modal', async ({ page }) => {
    await page.goto('/');
    
    // Click wallet connect button
    await page.click('[data-testid="wallet-connect"]');
    
    // Check if modal opens
    await expect(page.locator('.wallet-modal')).toBeVisible();
    await expect(page.locator('.wallet-options')).toBeVisible();
  });

  test('should display wallet options', async ({ page }) => {
    await page.goto('/');
    
    // Open wallet modal
    await page.click('[data-testid="wallet-connect"]');
    
    // Check for different wallet options
    await expect(page.locator('[data-testid="phantom-wallet"]')).toBeVisible();
    await expect(page.locator('[data-testid="solflare-wallet"]')).toBeVisible();
    await expect(page.locator('[data-testid="backpack-wallet"]')).toBeVisible();
  });

  test('should handle wallet connection simulation', async ({ page }) => {
    await page.goto('/');
    
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        connect: async () => ({
          publicKey: {
            toString: () => 'mock-public-key-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs
      };
    });
    
    // Click wallet connect
    await page.click('[data-testid="wallet-connect"]');
    
    // Click Phantom wallet
    await page.click('[data-testid="phantom-wallet"]');
    
    // Check if wallet is connected
    await expect(page.locator('[data-testid="wallet-status"]')).toContainText('Connected');
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
  });

  test('should display wallet balance', async ({ page }) => {
    await page.goto('/');
    
    // Mock wallet with balance
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        connect: async () => ({
          publicKey: {
            toString: () => 'mock-public-key-123'
          }
        }),
        getBalance: async () => 1000000000 // 1 SOL in lamports
      };
    });
    
    // Connect wallet
    await page.click('[data-testid="wallet-connect"]');
    await page.click('[data-testid="phantom-wallet"]');
    
    // Check balance display
    await expect(page.locator('[data-testid="wallet-balance"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-balance"]')).toContainText('1.0 SOL');
  });

  test('should handle wallet disconnection', async ({ page }) => {
    await page.goto('/');
    
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        connect: async () => ({
          publicKey: {
            toString: () => 'mock-public-key-123'
          }
        }),
        disconnect: async () => {}
      };
    });
    
    // Connect wallet
    await page.click('[data-testid="wallet-connect"]');
    await page.click('[data-testid="phantom-wallet"]');
    
    // Disconnect wallet
    await page.click('[data-testid="wallet-disconnect"]');
    
    // Check if wallet is disconnected
    await expect(page.locator('[data-testid="wallet-status"]')).toContainText('Disconnected');
  });

  test('should handle wallet connection errors', async ({ page }) => {
    await page.goto('/');
    
    // Mock wallet with error
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        connect: async () => {
          throw new Error('User rejected connection');
        }
      };
    });
    
    // Try to connect wallet
    await page.click('[data-testid="wallet-connect"]');
    await page.click('[data-testid="phantom-wallet"]');
    
    // Check for error message
    await expect(page.locator('[data-testid="wallet-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-error"]')).toContainText('User rejected connection');
  });
});

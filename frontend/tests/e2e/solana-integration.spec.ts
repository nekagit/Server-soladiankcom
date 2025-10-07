/**
 * Solana Integration E2E Tests
 * Comprehensive end-to-end testing for Solana wallet integration
 */

import { test, expect } from '@playwright/test';

test.describe('Solana Wallet Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Solana wallet for testing
    await page.addInitScript(() => {
      // Mock Phantom wallet
      window.solana = {
        isPhantom: true,
        connect: async () => ({
          publicKey: {
            toString: () => 'test-wallet-address-123456789'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
        request: async (params: any) => ({ result: 'success' })
      };

      // Mock Solflare wallet
      window.solflare = {
        isSolflare: true,
        connect: async () => ({
          publicKey: {
            toString: () => 'test-solflare-address-987654321'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
        request: async (params: any) => ({ result: 'success' })
      };

      // Mock Backpack wallet
      window.backpack = {
        isBackpack: true,
        connect: async () => ({
          publicKey: {
            toString: () => 'test-backpack-address-456789123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx: any) => tx,
        signAllTransactions: async (txs: any[]) => txs,
        request: async (params: any) => ({ result: 'success' })
      };
    });
  });

  test.describe('Wallet Connection Flow', () => {
    test('should connect to Phantom wallet successfully', async ({ page }) => {
      await page.goto('/');
      
      // Click connect wallet button
      await page.click('[data-testid="connect-wallet-btn"]');
      
      // Wait for wallet modal to appear
      await expect(page.locator('[data-testid="wallet-modal"]')).toBeVisible();
      
      // Select Phantom wallet
      await page.click('[data-testid="phantom-connect"]');
      
      // Wait for wallet connection
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // Check if wallet address is displayed
      await expect(page.locator('[data-testid="wallet-address"]')).toContainText('test-wallet-address-123456789');
      
      // Check if balance is displayed
      await expect(page.locator('[data-testid="wallet-balance"]')).toBeVisible();
    });

    test('should connect to Solflare wallet successfully', async ({ page }) => {
      await page.goto('/');
      
      // Click connect wallet button
      await page.click('[data-testid="connect-wallet-btn"]');
      
      // Wait for wallet modal to appear
      await expect(page.locator('[data-testid="wallet-modal"]')).toBeVisible();
      
      // Select Solflare wallet
      await page.click('[data-testid="solflare-connect"]');
      
      // Wait for wallet connection
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // Check if wallet address is displayed
      await expect(page.locator('[data-testid="wallet-address"]')).toContainText('test-solflare-address-987654321');
    });

    test('should connect to Backpack wallet successfully', async ({ page }) => {
      await page.goto('/');
      
      // Click connect wallet button
      await page.click('[data-testid="connect-wallet-btn"]');
      
      // Wait for wallet modal to appear
      await expect(page.locator('[data-testid="wallet-modal"]')).toBeVisible();
      
      // Select Backpack wallet
      await page.click('[data-testid="backpack-connect"]');
      
      // Wait for wallet connection
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // Check if wallet address is displayed
      await expect(page.locator('[data-testid="wallet-address"]')).toContainText('test-backpack-address-456789123');
    });

    test('should handle wallet connection cancellation', async ({ page }) => {
      // Mock user rejection
      await page.addInitScript(() => {
        window.solana.connect = async () => {
          throw new Error('User rejected connection');
        };
      });

      await page.goto('/');
      
      // Click connect wallet button
      await page.click('[data-testid="connect-wallet-btn"]');
      
      // Select Phantom wallet
      await page.click('[data-testid="phantom-connect"]');
      
      // Check if error message is displayed
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('User rejected connection');
    });

    test('should handle wallet not found error', async ({ page }) => {
      // Mock no wallet available
      await page.addInitScript(() => {
        window.solana = undefined;
        window.solflare = undefined;
        window.backpack = undefined;
      });

      await page.goto('/');
      
      // Click connect wallet button
      await page.click('[data-testid="connect-wallet-btn"]');
      
      // Check if wallet not found message is displayed
      await expect(page.locator('[data-testid="wallet-not-found"]')).toBeVisible();
      await expect(page.locator('[data-testid="wallet-not-found"]')).toContainText('No Solana wallet found');
    });
  });

  test.describe('Wallet Disconnection', () => {
    test('should disconnect wallet successfully', async ({ page }) => {
      await page.goto('/');
      
      // Connect wallet first
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      
      // Wait for connection
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // Click disconnect button
      await page.click('[data-testid="disconnect-wallet"]');
      
      // Check if wallet is disconnected
      await expect(page.locator('[data-testid="connect-wallet-btn"]')).toBeVisible();
      await expect(page.locator('[data-testid="wallet-connected"]')).not.toBeVisible();
    });

    test('should handle disconnection errors', async ({ page }) => {
      // Mock disconnection error
      await page.addInitScript(() => {
        window.solana.disconnect = async () => {
          throw new Error('Disconnection failed');
        };
      });

      await page.goto('/');
      
      // Connect wallet first
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      
      // Wait for connection
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // Click disconnect button
      await page.click('[data-testid="disconnect-wallet"]');
      
      // Check if error message is displayed
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });
  });

  test.describe('Transaction Processing', () => {
    test('should process SOL payment successfully', async ({ page }) => {
      await page.goto('/');
      
      // Connect wallet
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // Navigate to product page
      await page.goto('/product/1');
      
      // Click buy now button
      await page.click('[data-testid="buy-now-btn"]');
      
      // Wait for payment modal
      await expect(page.locator('[data-testid="payment-modal"]')).toBeVisible();
      
      // Enter payment amount
      await page.fill('[data-testid="payment-amount"]', '1.5');
      
      // Click confirm payment
      await page.click('[data-testid="confirm-payment"]');
      
      // Wait for transaction processing
      await expect(page.locator('[data-testid="transaction-processing"]')).toBeVisible();
      
      // Wait for success message
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-success"]')).toContainText('Payment successful');
    });

    test('should process SPL token payment successfully', async ({ page }) => {
      await page.goto('/');
      
      // Connect wallet
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // Navigate to product page
      await page.goto('/product/1');
      
      // Click buy now button
      await page.click('[data-testid="buy-now-btn"]');
      
      // Wait for payment modal
      await expect(page.locator('[data-testid="payment-modal"]')).toBeVisible();
      
      // Select SPL token
      await page.click('[data-testid="token-selector"]');
      await page.click('[data-testid="usdc-token"]');
      
      // Enter payment amount
      await page.fill('[data-testid="payment-amount"]', '100');
      
      // Click confirm payment
      await page.click('[data-testid="confirm-payment"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    });

    test('should handle transaction failure', async ({ page }) => {
      // Mock transaction failure
      await page.addInitScript(() => {
        window.solana.signTransaction = async () => {
          throw new Error('Transaction failed');
        };
      });

      await page.goto('/');
      
      // Connect wallet
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // Navigate to product page
      await page.goto('/product/1');
      
      // Click buy now button
      await page.click('[data-testid="buy-now-btn"]');
      
      // Wait for payment modal
      await expect(page.locator('[data-testid="payment-modal"]')).toBeVisible();
      
      // Enter payment amount
      await page.fill('[data-testid="payment-amount"]', '1.5');
      
      // Click confirm payment
      await page.click('[data-testid="confirm-payment"]');
      
      // Wait for error message
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-error"]')).toContainText('Transaction failed');
    });
  });

  test.describe('NFT Marketplace Integration', () => {
    test('should create NFT successfully', async ({ page }) => {
      await page.goto('/');
      
      // Connect wallet
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // Navigate to NFT marketplace
      await page.goto('/nft');
      
      // Click create NFT button
      await page.click('[data-testid="create-nft-btn"]');
      
      // Wait for create NFT modal
      await expect(page.locator('[data-testid="create-nft-modal"]')).toBeVisible();
      
      // Fill NFT details
      await page.fill('[data-testid="nft-name"]', 'Test NFT');
      await page.fill('[data-testid="nft-description"]', 'Test NFT Description');
      await page.fill('[data-testid="nft-image-url"]', 'https://example.com/image.jpg');
      
      // Click create NFT
      await page.click('[data-testid="create-nft-submit"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="nft-created-success"]')).toBeVisible();
    });

    test('should list NFT for sale successfully', async ({ page }) => {
      await page.goto('/');
      
      // Connect wallet
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // Navigate to NFT marketplace
      await page.goto('/nft');
      
      // Click on an NFT
      await page.click('[data-testid="nft-card-1"]');
      
      // Click list for sale
      await page.click('[data-testid="list-for-sale-btn"]');
      
      // Wait for list modal
      await expect(page.locator('[data-testid="list-nft-modal"]')).toBeVisible();
      
      // Enter sale price
      await page.fill('[data-testid="sale-price"]', '2.5');
      
      // Click list NFT
      await page.click('[data-testid="list-nft-submit"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="nft-listed-success"]')).toBeVisible();
    });

    test('should purchase NFT successfully', async ({ page }) => {
      await page.goto('/');
      
      // Connect wallet
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // Navigate to NFT marketplace
      await page.goto('/nft');
      
      // Click on an NFT for sale
      await page.click('[data-testid="nft-card-2"]');
      
      // Click buy NFT
      await page.click('[data-testid="buy-nft-btn"]');
      
      // Wait for purchase modal
      await expect(page.locator('[data-testid="purchase-nft-modal"]')).toBeVisible();
      
      // Click confirm purchase
      await page.click('[data-testid="confirm-purchase"]');
      
      // Wait for success message
      await expect(page.locator('[data-testid="nft-purchased-success"]')).toBeVisible();
    });
  });

  test.describe('Network Status', () => {
    test('should display network status correctly', async ({ page }) => {
      await page.goto('/');
      
      // Check network status indicator
      await expect(page.locator('[data-testid="network-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="network-status-indicator"]')).toHaveClass('status-online');
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Mock network error
      await page.addInitScript(() => {
        // Override fetch to simulate network error
        const originalFetch = window.fetch;
        window.fetch = async (url) => {
          if (url.includes('/api/solana/health')) {
            throw new Error('Network error');
          }
          return originalFetch(url);
        };
      });

      await page.goto('/');
      
      // Check if error status is displayed
      await expect(page.locator('[data-testid="network-status-indicator"]')).toHaveClass('status-error');
    });
  });

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('/');
      
      // Tab to connect wallet button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Press Enter to open wallet modal
      await page.keyboard.press('Enter');
      
      // Wait for wallet modal
      await expect(page.locator('[data-testid="wallet-modal"]')).toBeVisible();
      
      // Tab to Phantom wallet option
      await page.keyboard.press('Tab');
      
      // Press Enter to connect
      await page.keyboard.press('Enter');
      
      // Wait for connection
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
    });

    test('should announce wallet status changes to screen readers', async ({ page }) => {
      await page.goto('/');
      
      // Connect wallet
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      
      // Check if status announcement is present
      await expect(page.locator('[data-testid="wallet-status-announcement"]')).toBeVisible();
      await expect(page.locator('[data-testid="wallet-status-announcement"]')).toHaveAttribute('aria-live', 'polite');
    });
  });

  test.describe('Performance', () => {
    test('should load wallet interface quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      
      // Wait for wallet interface to load
      await expect(page.locator('[data-testid="connect-wallet-btn"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      expect(loadTime).toBeLessThan(2000); // Should load in less than 2 seconds
    });

    test('should handle multiple rapid wallet connections gracefully', async ({ page }) => {
      await page.goto('/');
      
      // Click connect wallet multiple times rapidly
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="connect-wallet-btn"]');
      
      // Should only show one modal
      const modals = await page.locator('[data-testid="wallet-modal"]').count();
      expect(modals).toBe(1);
    });
  });
});

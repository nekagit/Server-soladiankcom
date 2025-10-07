/**
 * Payment Processing E2E Tests
 * Comprehensive testing for payment processing functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Payment Processing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display payment form for SOL payments', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'buyer-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'buyer-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => {
          tx.signature = 'payment-signature-123';
          return tx;
        }
      };
    });

    // Navigate to payment page
    await page.goto('/payment');

    // Check for payment form elements
    await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-amount-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-currency-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-memo-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-payment-button"]')).toBeVisible();
  });

  test('should handle SOL payment successfully', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'buyer-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'buyer-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => {
          tx.signature = 'payment-signature-123';
          return tx;
        }
      };
    });

    // Mock API responses
    await page.route('**/api/payments/sol', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          signature: 'payment-signature-123',
          transaction: {
            id: 'payment-tx-123',
            status: 'confirmed',
            amount: 1.5,
            currency: 'SOL',
            from: 'buyer-address-123',
            to: 'seller-address-123'
          }
        })
      });
    });

    // Navigate to payment page
    await page.goto('/payment');

    // Fill payment form
    await page.fill('[data-testid="payment-amount-input"]', '1.5');
    await page.selectOption('[data-testid="payment-currency-select"]', 'SOL');
    await page.fill('[data-testid="payment-memo-input"]', 'Test payment');

    // Submit payment
    await page.click('[data-testid="submit-payment-button"]');

    // Check for payment success
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-signature"]')).toContainText('payment-signature-123');
    await expect(page.locator('[data-testid="payment-amount"]')).toContainText('1.5 SOL');
  });

  test('should handle SOL payment failure', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'buyer-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'buyer-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => {
          throw new Error('Insufficient funds');
        }
      };
    });

    // Navigate to payment page
    await page.goto('/payment');

    // Fill payment form
    await page.fill('[data-testid="payment-amount-input"]', '1000.0'); // Large amount
    await page.selectOption('[data-testid="payment-currency-select"]', 'SOL');

    // Submit payment
    await page.click('[data-testid="submit-payment-button"]');

    // Check for payment failure
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('Insufficient funds');
  });

  test('should handle SPL token payment successfully', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'buyer-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'buyer-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => {
          tx.signature = 'token-payment-signature-123';
          return tx;
        }
      };
    });

    // Mock API responses
    await page.route('**/api/payments/spl', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          signature: 'token-payment-signature-123',
          transaction: {
            id: 'token-payment-tx-123',
            status: 'confirmed',
            amount: 100,
            currency: 'USDC',
            tokenMint: 'usdc-mint-address',
            from: 'buyer-address-123',
            to: 'seller-address-123'
          }
        })
      });
    });

    // Navigate to payment page
    await page.goto('/payment');

    // Fill payment form for USDC
    await page.fill('[data-testid="payment-amount-input"]', '100');
    await page.selectOption('[data-testid="payment-currency-select"]', 'USDC');
    await page.fill('[data-testid="payment-memo-input"]', 'USDC payment');

    // Submit payment
    await page.click('[data-testid="submit-payment-button"]');

    // Check for payment success
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-signature"]')).toContainText('token-payment-signature-123');
    await expect(page.locator('[data-testid="payment-amount"]')).toContainText('100 USDC');
  });

  test('should handle escrow payment creation', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'buyer-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'buyer-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => {
          tx.signature = 'escrow-signature-123';
          return tx;
        }
      };
    });

    // Mock API responses
    await page.route('**/api/payments/escrow', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          signature: 'escrow-signature-123',
          escrow: {
            id: 'escrow-123',
            amount: 1.5,
            currency: 'SOL',
            buyer: 'buyer-address-123',
            seller: 'seller-address-123',
            status: 'funded'
          }
        })
      });
    });

    // Navigate to escrow payment page
    await page.goto('/payment/escrow');

    // Fill escrow form
    await page.fill('[data-testid="escrow-amount-input"]', '1.5');
    await page.selectOption('[data-testid="escrow-currency-select"]', 'SOL');
    await page.fill('[data-testid="escrow-seller-input"]', 'seller-address-123');
    await page.fill('[data-testid="escrow-memo-input"]', 'Escrow payment');

    // Submit escrow payment
    await page.click('[data-testid="submit-escrow-button"]');

    // Check for escrow success
    await expect(page.locator('[data-testid="escrow-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="escrow-signature"]')).toContainText('escrow-signature-123');
    await expect(page.locator('[data-testid="escrow-amount"]')).toContainText('1.5 SOL');
  });

  test('should handle escrow payment release', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'seller-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'seller-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => {
          tx.signature = 'release-signature-123';
          return tx;
        }
      };
    });

    // Mock API responses
    await page.route('**/api/payments/escrow/release', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          signature: 'release-signature-123',
          escrow: {
            id: 'escrow-123',
            amount: 1.5,
            currency: 'SOL',
            buyer: 'buyer-address-123',
            seller: 'seller-address-123',
            status: 'released'
          }
        })
      });
    });

    // Navigate to escrow management page
    await page.goto('/payment/escrow/escrow-123');

    // Click release button
    await page.click('[data-testid="release-escrow-button"]');

    // Check for release success
    await expect(page.locator('[data-testid="escrow-release-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="release-signature"]')).toContainText('release-signature-123');
  });

  test('should handle escrow payment cancellation', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'buyer-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'buyer-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => {
          tx.signature = 'cancel-signature-123';
          return tx;
        }
      };
    });

    // Mock API responses
    await page.route('**/api/payments/escrow/cancel', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          signature: 'cancel-signature-123',
          escrow: {
            id: 'escrow-123',
            amount: 1.5,
            currency: 'SOL',
            buyer: 'buyer-address-123',
            seller: 'seller-address-123',
            status: 'cancelled'
          }
        })
      });
    });

    // Navigate to escrow management page
    await page.goto('/payment/escrow/escrow-123');

    // Click cancel button
    await page.click('[data-testid="cancel-escrow-button"]');

    // Check for cancellation success
    await expect(page.locator('[data-testid="escrow-cancel-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="cancel-signature"]')).toContainText('cancel-signature-123');
  });

  test('should handle auction bidding', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'bidder-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'bidder-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => {
          tx.signature = 'bid-signature-123';
          return tx;
        }
      };
    });

    // Mock API responses
    await page.route('**/api/payments/auction/bid', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          signature: 'bid-signature-123',
          bid: {
            id: 'bid-123',
            auctionId: 'auction-123',
            amount: 2.5,
            currency: 'SOL',
            bidder: 'bidder-address-123',
            status: 'active'
          }
        })
      });
    });

    // Navigate to auction page
    await page.goto('/auction/auction-123');

    // Fill bid form
    await page.fill('[data-testid="bid-amount-input"]', '2.5');
    await page.selectOption('[data-testid="bid-currency-select"]', 'SOL');

    // Submit bid
    await page.click('[data-testid="submit-bid-button"]');

    // Check for bid success
    await expect(page.locator('[data-testid="bid-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="bid-signature"]')).toContainText('bid-signature-123');
    await expect(page.locator('[data-testid="bid-amount"]')).toContainText('2.5 SOL');
  });

  test('should handle payment history display', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'user-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'user-address-123'
          }
        }),
        disconnect: async () => {}
      };
    });

    // Mock API response for payment history
    await page.route('**/api/payments/history', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'payment-1',
            type: 'sol_payment',
            amount: 1.5,
            currency: 'SOL',
            from: 'user-address-123',
            to: 'seller-address-123',
            status: 'confirmed',
            signature: 'payment-signature-1',
            timestamp: '2023-01-01T00:00:00Z'
          },
          {
            id: 'payment-2',
            type: 'spl_payment',
            amount: 100,
            currency: 'USDC',
            from: 'user-address-123',
            to: 'seller-address-123',
            status: 'confirmed',
            signature: 'payment-signature-2',
            timestamp: '2023-01-02T00:00:00Z'
          }
        ])
      });
    });

    // Navigate to payment history page
    await page.goto('/payments/history');

    // Check for payment history
    await expect(page.locator('[data-testid="payment-history-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-item-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-item-2"]')).toBeVisible();

    // Check payment details
    await expect(page.locator('[data-testid="payment-amount-1"]')).toContainText('1.5 SOL');
    await expect(page.locator('[data-testid="payment-amount-2"]')).toContainText('100 USDC');
    await expect(page.locator('[data-testid="payment-status-1"]')).toContainText('confirmed');
    await expect(page.locator('[data-testid="payment-status-2"]')).toContainText('confirmed');
  });

  test('should handle payment validation', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'buyer-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'buyer-address-123'
          }
        }),
        disconnect: async () => {}
      };
    });

    // Navigate to payment page
    await page.goto('/payment');

    // Test invalid amount
    await page.fill('[data-testid="payment-amount-input"]', '0');
    await page.selectOption('[data-testid="payment-currency-select"]', 'SOL');
    await page.click('[data-testid="submit-payment-button"]');

    // Check for validation error
    await expect(page.locator('[data-testid="payment-amount-error"]')).toContainText('Amount must be greater than 0');

    // Test negative amount
    await page.fill('[data-testid="payment-amount-input"]', '-1');
    await page.click('[data-testid="submit-payment-button"]');

    // Check for validation error
    await expect(page.locator('[data-testid="payment-amount-error"]')).toContainText('Amount must be positive');

    // Test empty amount
    await page.fill('[data-testid="payment-amount-input"]', '');
    await page.click('[data-testid="submit-payment-button"]');

    // Check for validation error
    await expect(page.locator('[data-testid="payment-amount-error"]')).toContainText('Amount is required');
  });

  test('should handle payment confirmation modal', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'buyer-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'buyer-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => {
          tx.signature = 'payment-signature-123';
          return tx;
        }
      };
    });

    // Navigate to payment page
    await page.goto('/payment');

    // Fill payment form
    await page.fill('[data-testid="payment-amount-input"]', '1.5');
    await page.selectOption('[data-testid="payment-currency-select"]', 'SOL');
    await page.fill('[data-testid="payment-memo-input"]', 'Test payment');

    // Submit payment
    await page.click('[data-testid="submit-payment-button"]');

    // Check for confirmation modal
    await expect(page.locator('[data-testid="payment-confirmation-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="confirmation-amount"]')).toContainText('1.5 SOL');
    await expect(page.locator('[data-testid="confirmation-memo"]')).toContainText('Test payment');

    // Confirm payment
    await page.click('[data-testid="confirm-payment-button"]');

    // Check for payment success
    await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
  });

  test('should handle payment cancellation', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'buyer-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'buyer-address-123'
          }
        }),
        disconnect: async () => {}
      };
    });

    // Navigate to payment page
    await page.goto('/payment');

    // Fill payment form
    await page.fill('[data-testid="payment-amount-input"]', '1.5');
    await page.selectOption('[data-testid="payment-currency-select"]', 'SOL');

    // Submit payment
    await page.click('[data-testid="submit-payment-button"]');

    // Check for confirmation modal
    await expect(page.locator('[data-testid="payment-confirmation-modal"]')).toBeVisible();

    // Cancel payment
    await page.click('[data-testid="cancel-payment-button"]');

    // Check for modal dismissal
    await expect(page.locator('[data-testid="payment-confirmation-modal"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="payment-form"]')).toBeVisible();
  });
});

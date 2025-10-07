/**
 * Solana Wallet E2E Tests
 * Comprehensive testing for Solana wallet integration
 */

import { test, expect } from '@playwright/test';

test.describe('Solana Wallet Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display wallet connection button when no wallet is connected', async ({ page }) => {
    // Check if wallet connection button is visible
    await expect(page.locator('[data-testid="connect-wallet-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="connect-wallet-button"]')).toContainText('Connect Wallet');
  });

  test('should show wallet selection modal when connect button is clicked', async ({ page }) => {
    // Click connect wallet button
    await page.click('[data-testid="connect-wallet-button"]');

    // Check if wallet selection modal is visible
    await expect(page.locator('[data-testid="wallet-selection-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="phantom-wallet-option"]')).toBeVisible();
    await expect(page.locator('[data-testid="solflare-wallet-option"]')).toBeVisible();
    await expect(page.locator('[data-testid="backpack-wallet-option"]')).toBeVisible();
  });

  test('should handle Phantom wallet connection', async ({ page }) => {
    // Mock Phantom wallet
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: false,
        connect: async () => ({
          publicKey: {
            toString: () => 'phantom-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs
      };
    });

    // Click connect wallet button
    await page.click('[data-testid="connect-wallet-button"]');

    // Select Phantom wallet
    await page.click('[data-testid="phantom-wallet-option"]');

    // Check for successful connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-address"]')).toContainText('phantom-address-123');
    await expect(page.locator('[data-testid="disconnect-wallet-button"]')).toBeVisible();
  });

  test('should handle wallet connection failure', async ({ page }) => {
    // Mock Phantom wallet with connection failure
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: false,
        connect: async () => {
          throw new Error('User rejected');
        }
      };
    });

    // Click connect wallet button
    await page.click('[data-testid="connect-wallet-button"]');

    // Select Phantom wallet
    await page.click('[data-testid="phantom-wallet-option"]');

    // Check for error message
    await expect(page.locator('[data-testid="wallet-error"]')).toContainText('User rejected');
  });

  test('should handle missing wallet', async ({ page }) => {
    // Ensure no wallet is available
    await page.addInitScript(() => {
      window.solana = undefined;
    });

    // Click connect wallet button
    await page.click('[data-testid="connect-wallet-button"]');

    // Check for no wallet available message
    await expect(page.locator('[data-testid="no-wallet-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="no-wallet-message"]')).toContainText('No wallet found');
  });

  test('should display wallet balance when connected', async ({ page }) => {
    // Mock Phantom wallet with balance
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'phantom-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'phantom-address-123'
          }
        }),
        disconnect: async () => {}
      };
    });

    // Mock API response for balance
    await page.route('**/api/solana/balance/**', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: 1.5,
          lamports: 1500000000
        })
      });
    });

    // Click connect wallet button
    await page.click('[data-testid="connect-wallet-button"]');

    // Select Phantom wallet
    await page.click('[data-testid="phantom-wallet-option"]');

    // Check for balance display
    await expect(page.locator('[data-testid="wallet-balance"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-balance"]')).toContainText('1.5 SOL');
  });

  test('should handle wallet disconnection', async ({ page }) => {
    // Mock Phantom wallet
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'phantom-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'phantom-address-123'
          }
        }),
        disconnect: async () => {}
      };
    });

    // Connect wallet first
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    // Wait for connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();

    // Click disconnect button
    await page.click('[data-testid="disconnect-wallet-button"]');

    // Check for disconnection
    await expect(page.locator('[data-testid="connect-wallet-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="wallet-address"]')).not.toBeVisible();
  });

  test('should handle wallet account change', async ({ page }) => {
    // Mock Phantom wallet with account change
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'phantom-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'phantom-address-456'
          }
        }),
        disconnect: async () => {},
        on: (event, callback) => {
          if (event === 'accountChanged') {
            setTimeout(() => {
              callback({
                publicKey: {
                  toString: () => 'phantom-address-456'
                }
              });
            }, 1000);
          }
        }
      };
    });

    // Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    // Wait for initial connection
    await expect(page.locator('[data-testid="wallet-address"]')).toContainText('phantom-address-123');

    // Wait for account change
    await expect(page.locator('[data-testid="wallet-address"]')).toContainText('phantom-address-456');
  });

  test('should handle wallet network change', async ({ page }) => {
    // Mock Phantom wallet with network change
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'phantom-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'phantom-address-123'
          }
        }),
        disconnect: async () => {},
        on: (event, callback) => {
          if (event === 'networkChanged') {
            setTimeout(() => {
              callback('devnet');
            }, 1000);
          }
        }
      };
    });

    // Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    // Wait for network change notification
    await expect(page.locator('[data-testid="network-change-notification"]')).toBeVisible();
    await expect(page.locator('[data-testid="network-change-notification"]')).toContainText('Network changed to devnet');
  });

  test('should handle wallet transaction signing', async ({ page }) => {
    // Mock Phantom wallet with transaction signing
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'phantom-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'phantom-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => {
          tx.signature = 'signed-transaction-123';
          return tx;
        },
        signAllTransactions: async (txs) => {
          return txs.map(tx => {
            tx.signature = 'signed-transaction-123';
            return tx;
          });
        }
      };
    });

    // Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    // Wait for connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();

    // Mock API response for transaction
    await page.route('**/api/solana/transaction', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          signature: 'signed-transaction-123'
        })
      });
    });

    // Click on a transaction button (e.g., buy NFT)
    await page.click('[data-testid="buy-nft-button"]');

    // Check for transaction success
    await expect(page.locator('[data-testid="transaction-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="transaction-signature"]')).toContainText('signed-transaction-123');
  });

  test('should handle wallet transaction failure', async ({ page }) => {
    // Mock Phantom wallet with transaction failure
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'phantom-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'phantom-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => {
          throw new Error('User rejected transaction');
        }
      };
    });

    // Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    // Wait for connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();

    // Click on a transaction button
    await page.click('[data-testid="buy-nft-button"]');

    // Check for transaction failure
    await expect(page.locator('[data-testid="transaction-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="transaction-error"]')).toContainText('User rejected transaction');
  });

  test('should handle wallet balance updates', async ({ page }) => {
    // Mock Phantom wallet
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'phantom-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'phantom-address-123'
          }
        }),
        disconnect: async () => {}
      };
    });

    // Mock API response for balance updates
    let balance = 1.5;
    await page.route('**/api/solana/balance/**', route => {
      balance -= 0.1; // Simulate balance decrease
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          balance: balance,
          lamports: balance * 1000000000
        })
      });
    });

    // Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    // Wait for initial balance
    await expect(page.locator('[data-testid="wallet-balance"]')).toContainText('1.5 SOL');

    // Trigger balance update
    await page.click('[data-testid="refresh-balance-button"]');

    // Check for updated balance
    await expect(page.locator('[data-testid="wallet-balance"]')).toContainText('1.4 SOL');
  });

  test('should handle wallet connection timeout', async ({ page }) => {
    // Mock Phantom wallet with timeout
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: false,
        connect: async () => {
          await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second timeout
          return { publicKey: { toString: () => 'phantom-address-123' } };
        }
      };
    });

    // Click connect wallet button
    await page.click('[data-testid="connect-wallet-button"]');

    // Select Phantom wallet
    await page.click('[data-testid="phantom-wallet-option"]');

    // Check for timeout error
    await expect(page.locator('[data-testid="wallet-error"]')).toContainText('Connection timeout');
  });

  test('should handle wallet reconnection', async ({ page }) => {
    // Mock Phantom wallet with reconnection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: false,
        connect: async () => ({
          publicKey: {
            toString: () => 'phantom-address-123'
          }
        }),
        disconnect: async () => {},
        on: (event, callback) => {
          if (event === 'connect') {
            setTimeout(() => {
              callback({
                publicKey: {
                  toString: () => 'phantom-address-123'
                }
              });
            }, 1000);
          }
        }
      };
    });

    // Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    // Wait for connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();

    // Simulate disconnection
    await page.evaluate(() => {
      window.solana.isConnected = false;
      window.solana.publicKey = null;
    });

    // Check for reconnection prompt
    await expect(page.locator('[data-testid="reconnect-wallet-button"]')).toBeVisible();

    // Click reconnect
    await page.click('[data-testid="reconnect-wallet-button"]');

    // Check for reconnection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();
  });
});
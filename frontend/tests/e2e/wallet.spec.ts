import { test, expect } from '@playwright/test'

test.describe('Solana Wallet Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the Solana wallet
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        connect: async () => ({
          publicKey: {
            toString: () => 'mock-wallet-address-123456789'
          }
        }),
        disconnect: async () => {},
        signTransaction: async () => {},
        signAllTransactions: async () => {},
        request: async () => {}
      }
    })
  })

  test('should connect to Phantom wallet', async ({ page }) => {
    await page.goto('/')
    
    // Click the wallet connect button
    await page.click('[data-testid="wallet-connect"]')
    
    // Check if wallet connection modal appears
    await expect(page.locator('[data-testid="wallet-modal"]')).toBeVisible()
    
    // Click on Phantom wallet option
    await page.click('[data-testid="phantom-connect"]')
    
    // Check if wallet is connected
    await expect(page.locator('[data-testid="wallet-address"]')).toContainText('mock-wallet-address-123456789')
  })

  test('should disconnect wallet', async ({ page }) => {
    await page.goto('/')
    
    // Connect wallet first
    await page.click('[data-testid="wallet-connect"]')
    await page.click('[data-testid="phantom-connect"]')
    
    // Check if wallet is connected
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible()
    
    // Click disconnect
    await page.click('[data-testid="wallet-disconnect"]')
    
    // Check if wallet is disconnected
    await expect(page.locator('[data-testid="wallet-connect"]')).toBeVisible()
  })

  test('should handle wallet connection error', async ({ page }) => {
    // Mock wallet connection failure
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        connect: async () => {
          throw new Error('Connection failed')
        }
      }
    })

    await page.goto('/')
    
    // Click the wallet connect button
    await page.click('[data-testid="wallet-connect"]')
    await page.click('[data-testid="phantom-connect"]')
    
    // Check if error message is displayed
    await expect(page.locator('[data-testid="wallet-error"]')).toContainText('Connection failed')
  })

  test('should display wallet balance', async ({ page }) => {
    // Mock wallet with balance
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        connect: async () => ({
          publicKey: {
            toString: () => 'mock-wallet-address-123456789'
          }
        }),
        request: async ({ method }) => {
          if (method === 'getBalance') {
            return { value: 1000000000 } // 1 SOL in lamports
          }
        }
      }
    })

    await page.goto('/')
    
    // Connect wallet
    await page.click('[data-testid="wallet-connect"]')
    await page.click('[data-testid="phantom-connect"]')
    
    // Check if balance is displayed
    await expect(page.locator('[data-testid="wallet-balance"]')).toContainText('1.0 SOL')
  })
})


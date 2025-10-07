/**
 * Complete User Journey E2E Tests
 * Comprehensive end-to-end testing for complete user workflows
 */

import { test, expect } from '@playwright/test';

test.describe('Complete User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Solana wallet for testing
    await page.addInitScript(() => {
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

  test.describe('New User Onboarding Journey', () => {
    test('should complete new user onboarding flow', async ({ page }) => {
      // 1. Visit homepage
      await page.goto('/');
      await expect(page.locator('h1')).toContainText('Welcome to Soladia');
      
      // 2. Connect wallet
      await page.click('[data-testid="connect-wallet-btn"]');
      await expect(page.locator('[data-testid="wallet-modal"]')).toBeVisible();
      
      await page.click('[data-testid="phantom-connect"]');
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // 3. Complete profile setup
      await page.click('[data-testid="setup-profile-btn"]');
      await expect(page.locator('[data-testid="profile-setup-modal"]')).toBeVisible();
      
      await page.fill('[data-testid="username-input"]', 'testuser123');
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="bio-input"]', 'Test user bio');
      
      await page.click('[data-testid="save-profile-btn"]');
      await expect(page.locator('[data-testid="profile-setup-success"]')).toBeVisible();
      
      // 4. Explore marketplace
      await page.click('[data-testid="explore-marketplace-btn"]');
      await expect(page.locator('[data-testid="products-grid"]')).toBeVisible();
      
      // 5. View product details
      await page.click('[data-testid="product-card-1"]');
      await expect(page.locator('[data-testid="product-detail-page"]')).toBeVisible();
      
      // 6. Add to cart
      await page.click('[data-testid="add-to-cart-btn"]');
      await expect(page.locator('[data-testid="cart-notification"]')).toBeVisible();
      
      // 7. View cart
      await page.click('[data-testid="cart-icon"]');
      await expect(page.locator('[data-testid="cart-sidebar"]')).toBeVisible();
      
      // 8. Proceed to checkout
      await page.click('[data-testid="checkout-btn"]');
      await expect(page.locator('[data-testid="checkout-page"]')).toBeVisible();
      
      // 9. Complete purchase
      await page.click('[data-testid="buy-now-btn"]');
      await expect(page.locator('[data-testid="payment-modal"]')).toBeVisible();
      
      await page.fill('[data-testid="payment-amount"]', '2.5');
      await page.click('[data-testid="confirm-payment"]');
      
      await expect(page.locator('[data-testid="payment-success"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-success"]')).toContainText('Payment successful');
    });
  });

  test.describe('NFT Marketplace Journey', () => {
    test('should complete NFT creation and trading flow', async ({ page }) => {
      // 1. Connect wallet
      await page.goto('/');
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // 2. Navigate to NFT marketplace
      await page.click('[data-testid="nft-marketplace-nav"]');
      await expect(page.locator('[data-testid="nft-marketplace-page"]')).toBeVisible();
      
      // 3. Create NFT
      await page.click('[data-testid="create-nft-btn"]');
      await expect(page.locator('[data-testid="create-nft-modal"]')).toBeVisible();
      
      await page.fill('[data-testid="nft-name"]', 'My Test NFT');
      await page.fill('[data-testid="nft-description"]', 'This is my test NFT');
      await page.fill('[data-testid="nft-image-url"]', 'https://example.com/nft-image.jpg');
      
      // Add attributes
      await page.click('[data-testid="add-attribute-btn"]');
      await page.fill('[data-testid="attribute-trait-type"]', 'Color');
      await page.fill('[data-testid="attribute-value"]', 'Blue');
      await page.click('[data-testid="add-attribute-btn"]');
      await page.fill('[data-testid="attribute-trait-type"]', 'Rarity');
      await page.fill('[data-testid="attribute-value"]', 'Rare');
      
      await page.click('[data-testid="create-nft-submit"]');
      await expect(page.locator('[data-testid="nft-created-success"]')).toBeVisible();
      
      // 4. List NFT for sale
      await page.click('[data-testid="my-nfts-tab"]');
      await page.click('[data-testid="nft-card-1"]');
      await page.click('[data-testid="list-for-sale-btn"]');
      
      await expect(page.locator('[data-testid="list-nft-modal"]')).toBeVisible();
      await page.fill('[data-testid="sale-price"]', '5.0');
      await page.click('[data-testid="list-nft-submit"]');
      
      await expect(page.locator('[data-testid="nft-listed-success"]')).toBeVisible();
      
      // 5. Browse and buy NFT
      await page.click('[data-testid="browse-nfts-tab"]');
      await page.click('[data-testid="nft-card-2"]');
      
      await page.click('[data-testid="buy-nft-btn"]');
      await expect(page.locator('[data-testid="buy-nft-modal"]')).toBeVisible();
      
      await page.click('[data-testid="confirm-purchase"]');
      await expect(page.locator('[data-testid="nft-purchased-success"]')).toBeVisible();
    });
  });

  test.describe('Auction Journey', () => {
    test('should complete auction creation and bidding flow', async ({ page }) => {
      // 1. Connect wallet
      await page.goto('/');
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // 2. Create auction
      await page.click('[data-testid="create-auction-btn"]');
      await expect(page.locator('[data-testid="create-auction-modal"]')).toBeVisible();
      
      await page.fill('[data-testid="auction-title"]', 'Test Auction');
      await page.fill('[data-testid="auction-description"]', 'This is a test auction');
      await page.fill('[data-testid="starting-price"]', '1.0');
      await page.fill('[data-testid="reserve-price"]', '5.0');
      await page.fill('[data-testid="auction-duration"]', '24');
      
      await page.click('[data-testid="create-auction-submit"]');
      await expect(page.locator('[data-testid="auction-created-success"]')).toBeVisible();
      
      // 3. Browse auctions
      await page.click('[data-testid="browse-auctions-tab"]');
      await expect(page.locator('[data-testid="auctions-grid"]')).toBeVisible();
      
      // 4. Place bid
      await page.click('[data-testid="auction-card-1"]');
      await expect(page.locator('[data-testid="auction-detail-page"]')).toBeVisible();
      
      await page.click('[data-testid="place-bid-btn"]');
      await expect(page.locator('[data-testid="bid-modal"]')).toBeVisible();
      
      await page.fill('[data-testid="bid-amount"]', '2.5');
      await page.click('[data-testid="submit-bid"]');
      
      await expect(page.locator('[data-testid="bid-placed-success"]')).toBeVisible();
      
      // 5. View auction status
      await expect(page.locator('[data-testid="current-highest-bid"]')).toContainText('2.5 SOL');
      await expect(page.locator('[data-testid="bid-count"]')).toContainText('1 bid');
    });
  });

  test.describe('Social Features Journey', () => {
    test('should complete social interaction flow', async ({ page }) => {
      // 1. Connect wallet and setup profile
      await page.goto('/');
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // 2. Navigate to social feed
      await page.click('[data-testid="social-feed-nav"]');
      await expect(page.locator('[data-testid="social-feed-page"]')).toBeVisible();
      
      // 3. Create post
      await page.click('[data-testid="create-post-btn"]');
      await expect(page.locator('[data-testid="create-post-modal"]')).toBeVisible();
      
      await page.fill('[data-testid="post-content"]', 'Just bought an amazing NFT on Soladia!');
      await page.click('[data-testid="publish-post-btn"]');
      
      await expect(page.locator('[data-testid="post-published-success"]')).toBeVisible();
      
      // 4. Like and comment on posts
      await page.click('[data-testid="like-post-btn-1"]');
      await expect(page.locator('[data-testid="like-count-1"]')).toContainText('1');
      
      await page.click('[data-testid="comment-post-btn-1"]');
      await page.fill('[data-testid="comment-input-1"]', 'Great post!');
      await page.click('[data-testid="submit-comment-btn-1"]');
      
      await expect(page.locator('[data-testid="comment-1"]')).toContainText('Great post!');
      
      // 5. Follow user
      await page.click('[data-testid="follow-user-btn-1"]');
      await expect(page.locator('[data-testid="follow-user-btn-1"]')).toContainText('Following');
      
      // 6. View user profile
      await page.click('[data-testid="user-profile-link-1"]');
      await expect(page.locator('[data-testid="user-profile-page"]')).toBeVisible();
      
      // 7. View user's NFTs
      await page.click('[data-testid="user-nfts-tab"]');
      await expect(page.locator('[data-testid="user-nfts-grid"]')).toBeVisible();
    });
  });

  test.describe('Search and Discovery Journey', () => {
    test('should complete search and discovery flow', async ({ page }) => {
      // 1. Visit homepage
      await page.goto('/');
      
      // 2. Search for products
      await page.fill('[data-testid="search-input"]', 'NFT');
      await page.click('[data-testid="search-btn"]');
      
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
      await expect(page.locator('[data-testid="search-results"]')).toContainText('NFT');
      
      // 3. Apply filters
      await page.click('[data-testid="filter-category"]');
      await page.click('[data-testid="filter-category-art"]');
      
      await page.click('[data-testid="filter-price-range"]');
      await page.fill('[data-testid="min-price"]', '1.0');
      await page.fill('[data-testid="max-price"]', '10.0');
      
      await page.click('[data-testid="apply-filters-btn"]');
      await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();
      
      // 4. Sort results
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('[data-testid="sort-price-low-high"]');
      
      await expect(page.locator('[data-testid="sorted-results"]')).toBeVisible();
      
      // 5. View product details
      await page.click('[data-testid="product-card-1"]');
      await expect(page.locator('[data-testid="product-detail-page"]')).toBeVisible();
      
      // 6. View related products
      await page.click('[data-testid="related-products-tab"]');
      await expect(page.locator('[data-testid="related-products-grid"]')).toBeVisible();
      
      // 7. Add to wishlist
      await page.click('[data-testid="wishlist-btn"]');
      await expect(page.locator('[data-testid="wishlist-notification"]')).toBeVisible();
    });
  });

  test.describe('Mobile Experience Journey', () => {
    test('should complete mobile user journey', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // 1. Visit homepage on mobile
      await page.goto('/');
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      
      // 2. Open mobile menu
      await page.click('[data-testid="mobile-menu-toggle"]');
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // 3. Navigate to products
      await page.click('[data-testid="mobile-products-link"]');
      await expect(page.locator('[data-testid="products-page"]')).toBeVisible();
      
      // 4. Connect wallet on mobile
      await page.click('[data-testid="connect-wallet-btn"]');
      await expect(page.locator('[data-testid="wallet-modal"]')).toBeVisible();
      
      await page.click('[data-testid="phantom-connect"]');
      await expect(page.locator('[data-testid="wallet-connected"]')).toBeVisible();
      
      // 5. View product on mobile
      await page.click('[data-testid="product-card-1"]');
      await expect(page.locator('[data-testid="product-detail-page"]')).toBeVisible();
      
      // 6. Add to cart on mobile
      await page.click('[data-testid="add-to-cart-btn"]');
      await expect(page.locator('[data-testid="cart-notification"]')).toBeVisible();
      
      // 7. View cart on mobile
      await page.click('[data-testid="mobile-cart-icon"]');
      await expect(page.locator('[data-testid="mobile-cart-drawer"]')).toBeVisible();
      
      // 8. Checkout on mobile
      await page.click('[data-testid="mobile-checkout-btn"]');
      await expect(page.locator('[data-testid="checkout-page"]')).toBeVisible();
    });
  });

  test.describe('Error Handling Journey', () => {
    test('should handle errors gracefully throughout the journey', async ({ page }) => {
      // 1. Visit homepage
      await page.goto('/');
      
      // 2. Test wallet connection error
      await page.addInitScript(() => {
        window.solana.connect = async () => {
          throw new Error('User rejected connection');
        };
      });
      
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('User rejected connection');
      
      // 3. Test payment error
      await page.addInitScript(() => {
        window.solana.connect = async () => ({
          publicKey: { toString: () => 'test-wallet-address' }
        });
      });
      
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      
      await page.click('[data-testid="product-card-1"]');
      await page.click('[data-testid="buy-now-btn"]');
      
      // Mock payment failure
      await page.addInitScript(() => {
        window.solana.signTransaction = async () => {
          throw new Error('Transaction failed');
        };
      });
      
      await page.fill('[data-testid="payment-amount"]', '2.5');
      await page.click('[data-testid="confirm-payment"]');
      
      await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="payment-error"]')).toContainText('Transaction failed');
      
      // 4. Test network error
      await page.route('**/api/solana/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Network error' })
        });
      });
      
      await page.click('[data-testid="retry-payment-btn"]');
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();
    });
  });

  test.describe('Performance Journey', () => {
    test('should maintain good performance throughout the journey', async ({ page }) => {
      // 1. Measure page load time
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // Should load in less than 3 seconds
      
      // 2. Measure navigation performance
      const navStartTime = Date.now();
      await page.click('[data-testid="products-nav"]');
      await page.waitForLoadState('networkidle');
      const navTime = Date.now() - navStartTime;
      
      expect(navTime).toBeLessThan(1000); // Should navigate in less than 1 second
      
      // 3. Measure search performance
      const searchStartTime = Date.now();
      await page.fill('[data-testid="search-input"]', 'test');
      await page.click('[data-testid="search-btn"]');
      await page.waitForSelector('[data-testid="search-results"]');
      const searchTime = Date.now() - searchStartTime;
      
      expect(searchTime).toBeLessThan(2000); // Should search in less than 2 seconds
      
      // 4. Measure wallet connection performance
      const walletStartTime = Date.now();
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      await page.waitForSelector('[data-testid="wallet-connected"]');
      const walletTime = Date.now() - walletStartTime;
      
      expect(walletTime).toBeLessThan(2000); // Should connect in less than 2 seconds
    });
  });

  test.describe('Accessibility Journey', () => {
    test('should be accessible throughout the journey', async ({ page }) => {
      // 1. Visit homepage
      await page.goto('/');
      
      // 2. Test keyboard navigation
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
      
      // 3. Test screen reader compatibility
      const heading = page.locator('h1');
      await expect(heading).toHaveAttribute('role', 'heading');
      
      // 4. Test form accessibility
      await page.click('[data-testid="connect-wallet-btn"]');
      await page.click('[data-testid="phantom-connect"]');
      
      const formInputs = page.locator('input[type="text"], input[type="email"], textarea');
      const inputCount = await formInputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = formInputs.nth(i);
        await expect(input).toHaveAttribute('aria-label');
      }
      
      // 5. Test button accessibility
      const buttons = page.locator('button');
      const buttonCount = await buttons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const textContent = await button.textContent();
        
        expect(ariaLabel || textContent).toBeTruthy();
      }
      
      // 6. Test color contrast
      const textElements = page.locator('p, span, div[role="text"]');
      const textCount = await textElements.count();
      
      // This would need actual color contrast testing in a real implementation
      expect(textCount).toBeGreaterThan(0);
    });
  });
});

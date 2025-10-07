/**
 * NFT Marketplace E2E Tests
 * Comprehensive testing for NFT marketplace functionality
 */

import { test, expect } from '@playwright/test';

test.describe('NFT Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display NFT marketplace page', async ({ page }) => {
    // Navigate to marketplace
    await page.goto('/marketplace');

    // Check if marketplace elements are visible
    await expect(page.locator('[data-testid="marketplace-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="nft-grid"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-sidebar"]')).toBeVisible();
  });

  test('should display NFT cards with correct information', async ({ page }) => {
    // Mock API response for NFTs
    await page.route('**/api/nfts', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            name: 'Test NFT 1',
            image: 'https://example.com/nft1.png',
            price: 1.5,
            currency: 'SOL',
            owner: 'owner-address-1',
            collection: 'Test Collection',
            attributes: [
              { trait_type: 'Color', value: 'Red' },
              { trait_type: 'Rarity', value: 'Common' }
            ]
          },
          {
            id: '2',
            name: 'Test NFT 2',
            image: 'https://example.com/nft2.png',
            price: 2.0,
            currency: 'SOL',
            owner: 'owner-address-2',
            collection: 'Test Collection',
            attributes: [
              { trait_type: 'Color', value: 'Blue' },
              { trait_type: 'Rarity', value: 'Rare' }
            ]
          }
        ])
      });
    });

    // Navigate to marketplace
    await page.goto('/marketplace');

    // Check if NFT cards are displayed
    await expect(page.locator('[data-testid="nft-card-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="nft-card-2"]')).toBeVisible();

    // Check NFT card content
    await expect(page.locator('[data-testid="nft-name-1"]')).toContainText('Test NFT 1');
    await expect(page.locator('[data-testid="nft-price-1"]')).toContainText('1.5 SOL');
    await expect(page.locator('[data-testid="nft-image-1"]')).toBeVisible();

    await expect(page.locator('[data-testid="nft-name-2"]')).toContainText('Test NFT 2');
    await expect(page.locator('[data-testid="nft-price-2"]')).toContainText('2.0 SOL');
    await expect(page.locator('[data-testid="nft-image-2"]')).toBeVisible();
  });

  test('should handle NFT search functionality', async ({ page }) => {
    // Mock API response for search
    await page.route('**/api/nfts/search**', route => {
      const url = new URL(route.request().url());
      const query = url.searchParams.get('q');
      
      if (query === 'red') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              name: 'Red NFT',
              image: 'https://example.com/red-nft.png',
              price: 1.5,
              currency: 'SOL',
              owner: 'owner-address-1',
              collection: 'Test Collection',
              attributes: [
                { trait_type: 'Color', value: 'Red' }
              ]
            }
          ])
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    // Navigate to marketplace
    await page.goto('/marketplace');

    // Search for NFTs
    await page.fill('[data-testid="search-input"]', 'red');
    await page.click('[data-testid="search-button"]');

    // Check for search results
    await expect(page.locator('[data-testid="nft-card-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="nft-name-1"]')).toContainText('Red NFT');

    // Clear search
    await page.fill('[data-testid="search-input"]', '');
    await page.click('[data-testid="search-button"]');

    // Check for all NFTs
    await expect(page.locator('[data-testid="nft-card-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="nft-card-2"]')).toBeVisible();
  });

  test('should handle NFT filtering by collection', async ({ page }) => {
    // Mock API response for filtered NFTs
    await page.route('**/api/nfts/filter**', route => {
      const url = new URL(route.request().url());
      const collection = url.searchParams.get('collection');
      
      if (collection === 'Test Collection') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              name: 'Test NFT 1',
              image: 'https://example.com/nft1.png',
              price: 1.5,
              currency: 'SOL',
              owner: 'owner-address-1',
              collection: 'Test Collection',
              attributes: [
                { trait_type: 'Color', value: 'Red' }
              ]
            }
          ])
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    // Navigate to marketplace
    await page.goto('/marketplace');

    // Filter by collection
    await page.click('[data-testid="collection-filter"]');
    await page.click('[data-testid="collection-option-Test Collection"]');

    // Check for filtered results
    await expect(page.locator('[data-testid="nft-card-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="nft-collection-1"]')).toContainText('Test Collection');
  });

  test('should handle NFT filtering by price range', async ({ page }) => {
    // Mock API response for price filtered NFTs
    await page.route('**/api/nfts/filter**', route => {
      const url = new URL(route.request().url());
      const minPrice = url.searchParams.get('minPrice');
      const maxPrice = url.searchParams.get('maxPrice');
      
      if (minPrice === '1' && maxPrice === '2') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              name: 'Test NFT 1',
              image: 'https://example.com/nft1.png',
              price: 1.5,
              currency: 'SOL',
              owner: 'owner-address-1',
              collection: 'Test Collection',
              attributes: [
                { trait_type: 'Color', value: 'Red' }
              ]
            }
          ])
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    // Navigate to marketplace
    await page.goto('/marketplace');

    // Filter by price range
    await page.fill('[data-testid="min-price-input"]', '1');
    await page.fill('[data-testid="max-price-input"]', '2');
    await page.click('[data-testid="apply-price-filter"]');

    // Check for filtered results
    await expect(page.locator('[data-testid="nft-card-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="nft-price-1"]')).toContainText('1.5 SOL');
  });

  test('should handle NFT sorting', async ({ page }) => {
    // Mock API response for sorted NFTs
    await page.route('**/api/nfts/sort**', route => {
      const url = new URL(route.request().url());
      const sortBy = url.searchParams.get('sortBy');
      const sortOrder = url.searchParams.get('sortOrder');
      
      if (sortBy === 'price' && sortOrder === 'asc') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              name: 'Cheap NFT',
              image: 'https://example.com/cheap-nft.png',
              price: 0.5,
              currency: 'SOL',
              owner: 'owner-address-1',
              collection: 'Test Collection',
              attributes: []
            },
            {
              id: '2',
              name: 'Expensive NFT',
              image: 'https://example.com/expensive-nft.png',
              price: 2.0,
              currency: 'SOL',
              owner: 'owner-address-2',
              collection: 'Test Collection',
              attributes: []
            }
          ])
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    // Navigate to marketplace
    await page.goto('/marketplace');

    // Sort by price ascending
    await page.click('[data-testid="sort-dropdown"]');
    await page.click('[data-testid="sort-option-price-asc"]');

    // Check for sorted results
    const nftCards = page.locator('[data-testid^="nft-card-"]');
    await expect(nftCards.first()).toContainText('Cheap NFT');
    await expect(nftCards.last()).toContainText('Expensive NFT');
  });

  test('should handle NFT purchase flow', async ({ page }) => {
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
          tx.signature = 'purchase-signature-123';
          return tx;
        }
      };
    });

    // Mock API responses
    await page.route('**/api/nfts', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            name: 'Test NFT 1',
            image: 'https://example.com/nft1.png',
            price: 1.5,
            currency: 'SOL',
            owner: 'owner-address-1',
            collection: 'Test Collection',
            attributes: []
          }
        ])
      });
    });

    await page.route('**/api/nfts/purchase', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          signature: 'purchase-signature-123',
          transaction: {
            id: 'purchase-tx-123',
            status: 'confirmed'
          }
        })
      });
    });

    // Navigate to marketplace
    await page.goto('/marketplace');

    // Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    // Wait for wallet connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();

    // Click buy button on NFT
    await page.click('[data-testid="buy-nft-button-1"]');

    // Check for purchase confirmation modal
    await expect(page.locator('[data-testid="purchase-confirmation-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="purchase-price"]')).toContainText('1.5 SOL');

    // Confirm purchase
    await page.click('[data-testid="confirm-purchase-button"]');

    // Check for purchase success
    await expect(page.locator('[data-testid="purchase-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="transaction-signature"]')).toContainText('purchase-signature-123');
  });

  test('should handle NFT purchase failure', async ({ page }) => {
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

    // Mock API responses
    await page.route('**/api/nfts', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: '1',
            name: 'Test NFT 1',
            image: 'https://example.com/nft1.png',
            price: 1.5,
            currency: 'SOL',
            owner: 'owner-address-1',
            collection: 'Test Collection',
            attributes: []
          }
        ])
      });
    });

    // Navigate to marketplace
    await page.goto('/marketplace');

    // Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    // Wait for wallet connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();

    // Click buy button on NFT
    await page.click('[data-testid="buy-nft-button-1"]');

    // Check for purchase confirmation modal
    await expect(page.locator('[data-testid="purchase-confirmation-modal"]')).toBeVisible();

    // Confirm purchase
    await page.click('[data-testid="confirm-purchase-button"]');

    // Check for purchase failure
    await expect(page.locator('[data-testid="purchase-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="purchase-error"]')).toContainText('Insufficient funds');
  });

  test('should handle NFT listing creation', async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.solana = {
        isPhantom: true,
        isConnected: true,
        publicKey: {
          toString: () => 'owner-address-123'
        },
        connect: async () => ({
          publicKey: {
            toString: () => 'owner-address-123'
          }
        }),
        disconnect: async () => {},
        signTransaction: async (tx) => {
          tx.signature = 'listing-signature-123';
          return tx;
        }
      };
    });

    // Mock API responses
    await page.route('**/api/nfts/list', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          signature: 'listing-signature-123',
          listing: {
            id: 'listing-123',
            nftId: '1',
            price: 1.5,
            currency: 'SOL',
            status: 'active'
          }
        })
      });
    });

    // Navigate to marketplace
    await page.goto('/marketplace');

    // Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    // Wait for wallet connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();

    // Click list NFT button
    await page.click('[data-testid="list-nft-button"]');

    // Fill listing form
    await page.fill('[data-testid="nft-id-input"]', '1');
    await page.fill('[data-testid="listing-price-input"]', '1.5');
    await page.selectOption('[data-testid="currency-select"]', 'SOL');

    // Submit listing
    await page.click('[data-testid="submit-listing-button"]');

    // Check for listing success
    await expect(page.locator('[data-testid="listing-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="listing-signature"]')).toContainText('listing-signature-123');
  });

  test('should handle NFT offer creation', async ({ page }) => {
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
          tx.signature = 'offer-signature-123';
          return tx;
        }
      };
    });

    // Mock API responses
    await page.route('**/api/nfts/offer', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          signature: 'offer-signature-123',
          offer: {
            id: 'offer-123',
            nftId: '1',
            price: 1.2,
            currency: 'SOL',
            status: 'pending'
          }
        })
      });
    });

    // Navigate to marketplace
    await page.goto('/marketplace');

    // Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    // Wait for wallet connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();

    // Click make offer button on NFT
    await page.click('[data-testid="make-offer-button-1"]');

    // Fill offer form
    await page.fill('[data-testid="offer-price-input"]', '1.2');
    await page.selectOption('[data-testid="offer-currency-select"]', 'SOL');

    // Submit offer
    await page.click('[data-testid="submit-offer-button"]');

    // Check for offer success
    await expect(page.locator('[data-testid="offer-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="offer-signature"]')).toContainText('offer-signature-123');
  });

  test('should handle NFT auction participation', async ({ page }) => {
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
    await page.route('**/api/nfts/auction/bid', route => {
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
            status: 'active'
          }
        })
      });
    });

    // Navigate to marketplace
    await page.goto('/marketplace');

    // Connect wallet
    await page.click('[data-testid="connect-wallet-button"]');
    await page.click('[data-testid="phantom-wallet-option"]');

    // Wait for wallet connection
    await expect(page.locator('[data-testid="wallet-address"]')).toBeVisible();

    // Click bid button on auction NFT
    await page.click('[data-testid="bid-button-1"]');

    // Fill bid form
    await page.fill('[data-testid="bid-amount-input"]', '2.5');
    await page.selectOption('[data-testid="bid-currency-select"]', 'SOL');

    // Submit bid
    await page.click('[data-testid="submit-bid-button"]');

    // Check for bid success
    await expect(page.locator('[data-testid="bid-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="bid-signature"]')).toContainText('bid-signature-123');
  });

  test('should handle NFT collection view', async ({ page }) => {
    // Mock API response for collection
    await page.route('**/api/collections/test-collection', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-collection',
          name: 'Test Collection',
          description: 'A test collection',
          image: 'https://example.com/collection.png',
          nfts: [
            {
              id: '1',
              name: 'Test NFT 1',
              image: 'https://example.com/nft1.png',
              price: 1.5,
              currency: 'SOL',
              owner: 'owner-address-1',
              collection: 'Test Collection',
              attributes: []
            }
          ]
        })
      });
    });

    // Navigate to collection
    await page.goto('/collection/test-collection');

    // Check for collection information
    await expect(page.locator('[data-testid="collection-name"]')).toContainText('Test Collection');
    await expect(page.locator('[data-testid="collection-description"]')).toContainText('A test collection');
    await expect(page.locator('[data-testid="collection-image"]')).toBeVisible();

    // Check for NFTs in collection
    await expect(page.locator('[data-testid="nft-card-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="nft-name-1"]')).toContainText('Test NFT 1');
  });

  test('should handle NFT detail view', async ({ page }) => {
    // Mock API response for NFT details
    await page.route('**/api/nfts/1', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '1',
          name: 'Test NFT 1',
          description: 'A detailed test NFT',
          image: 'https://example.com/nft1.png',
          price: 1.5,
          currency: 'SOL',
          owner: 'owner-address-1',
          collection: 'Test Collection',
          attributes: [
            { trait_type: 'Color', value: 'Red' },
            { trait_type: 'Rarity', value: 'Common' }
          ],
          history: [
            {
              type: 'mint',
              timestamp: '2023-01-01T00:00:00Z',
              from: null,
              to: 'owner-address-1',
              signature: 'mint-signature-123'
            }
          ]
        })
      });
    });

    // Navigate to NFT detail
    await page.goto('/nft/1');

    // Check for NFT details
    await expect(page.locator('[data-testid="nft-name"]')).toContainText('Test NFT 1');
    await expect(page.locator('[data-testid="nft-description"]')).toContainText('A detailed test NFT');
    await expect(page.locator('[data-testid="nft-image"]')).toBeVisible();
    await expect(page.locator('[data-testid="nft-price"]')).toContainText('1.5 SOL');

    // Check for attributes
    await expect(page.locator('[data-testid="attribute-Color"]')).toContainText('Red');
    await expect(page.locator('[data-testid="attribute-Rarity"]')).toContainText('Common');

    // Check for history
    await expect(page.locator('[data-testid="history-item-0"]')).toContainText('mint-signature-123');
  });
});

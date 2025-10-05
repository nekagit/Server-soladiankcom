import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OfflineManager } from '../../services/OfflineManager';

// Mock IndexedDB
const mockDB = {
  transaction: vi.fn().mockReturnValue({
    objectStore: vi.fn().mockReturnValue({
      put: vi.fn(),
      get: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
      clear: vi.fn(),
    }),
  }),
};

const mockRequest = {
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  result: mockDB,
};

const mockIndexedDB = {
  open: vi.fn().mockImplementation(() => mockRequest),
  deleteDatabase: vi.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
});

// Mock fetch
global.fetch = vi.fn();

describe('OfflineManager', () => {
  let offlineManager: OfflineManager;

  beforeEach(() => {
    vi.clearAllMocks();
    offlineManager = new OfflineManager();
  });

  describe('Transaction Management', () => {
    it('should save transaction offline', async () => {
      const transaction = {
        id: 'test-tx-123',
        type: 'buy' as const,
        assetId: 'nft-456',
        amount: 1,
        price: 2.5,
        timestamp: Date.now(),
        status: 'pending' as const,
        data: { test: 'data' }
      };

      // Mock successful database operation
      mockRequest.onsuccess = () => {};

      await offlineManager.saveTransaction(transaction);
      
      expect(mockIndexedDB.open).toHaveBeenCalledWith('SoladiaOffline', 1);
    });

    it('should get transactions', async () => {
      const mockTransactions = [
        {
          id: 'test-tx-123',
          type: 'buy',
          assetId: 'nft-456',
          amount: 1,
          price: 2.5,
          timestamp: Date.now(),
          status: 'pending',
          data: {}
        }
      ];

      // Mock database response
      const mockStore = {
        getAll: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null,
          result: mockTransactions
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      const transactions = await offlineManager.getTransactions();
      expect(transactions).toEqual(mockTransactions);
    });

    it('should remove transaction', async () => {
      const transactionId = 'test-tx-123';
      
      const mockStore = {
        delete: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      await offlineManager.removeTransaction(transactionId);
      expect(mockStore.delete).toHaveBeenCalledWith(transactionId);
    });
  });

  describe('Favorites Management', () => {
    it('should save favorite offline', async () => {
      const favorite = {
        id: 'fav-123',
        assetId: 'nft-456',
        assetType: 'nft' as const,
        timestamp: Date.now(),
        data: { test: 'data' }
      };

      mockRequest.onsuccess = () => {};

      await offlineManager.saveFavorite(favorite);
      expect(mockIndexedDB.open).toHaveBeenCalledWith('SoladiaOffline', 1);
    });

    it('should get favorites', async () => {
      const mockFavorites = [
        {
          id: 'fav-123',
          assetId: 'nft-456',
          assetType: 'nft',
          timestamp: Date.now(),
          data: {}
        }
      ];

      const mockStore = {
        getAll: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null,
          result: mockFavorites
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      const favorites = await offlineManager.getFavorites();
      expect(favorites).toEqual(mockFavorites);
    });

    it('should remove favorite', async () => {
      const favoriteId = 'fav-123';
      
      const mockStore = {
        delete: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      await offlineManager.removeFavorite(favoriteId);
      expect(mockStore.delete).toHaveBeenCalledWith(favoriteId);
    });
  });

  describe('Cart Management', () => {
    it('should save cart item offline', async () => {
      const cartItem = {
        id: 'cart-123',
        assetId: 'nft-456',
        assetType: 'nft' as const,
        quantity: 1,
        price: 2.5,
        timestamp: Date.now(),
        data: { test: 'data' }
      };

      mockRequest.onsuccess = () => {};

      await offlineManager.saveCartItem(cartItem);
      expect(mockIndexedDB.open).toHaveBeenCalledWith('SoladiaOffline', 1);
    });

    it('should get cart items', async () => {
      const mockCartItems = [
        {
          id: 'cart-123',
          assetId: 'nft-456',
          assetType: 'nft',
          quantity: 1,
          price: 2.5,
          timestamp: Date.now(),
          data: {}
        }
      ];

      const mockStore = {
        getAll: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null,
          result: mockCartItems
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      const cartItems = await offlineManager.getCartItems();
      expect(cartItems).toEqual(mockCartItems);
    });

    it('should remove cart item', async () => {
      const cartItemId = 'cart-123';
      
      const mockStore = {
        delete: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      await offlineManager.removeCartItem(cartItemId);
      expect(mockStore.delete).toHaveBeenCalledWith(cartItemId);
    });

    it('should clear cart', async () => {
      const mockStore = {
        clear: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      await offlineManager.clearCart();
      expect(mockStore.clear).toHaveBeenCalled();
    });
  });

  describe('Settings Management', () => {
    it('should save setting', async () => {
      const key = 'theme';
      const value = 'dark';

      mockRequest.onsuccess = () => {};

      await offlineManager.saveSetting(key, value);
      expect(mockIndexedDB.open).toHaveBeenCalledWith('SoladiaOffline', 1);
    });

    it('should get setting', async () => {
      const key = 'theme';
      const value = 'dark';

      const mockStore = {
        get: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null,
          result: { key, value }
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      const setting = await offlineManager.getSetting(key);
      expect(setting).toBe(value);
    });
  });

  describe('Sync Management', () => {
    it('should sync transactions with server', async () => {
      const mockTransactions = [
        {
          id: 'test-tx-123',
          type: 'buy' as const,
          assetId: 'nft-456',
          amount: 1,
          price: 2.5,
          timestamp: Date.now(),
          status: 'pending' as const,
          data: {}
        }
      ];

      const mockStore = {
        getAll: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null,
          result: mockTransactions
        })),
        delete: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      // Mock successful API response
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await offlineManager.syncWithServer();
      
      expect(global.fetch).toHaveBeenCalledWith('/api/solana/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockTransactions[0])
      });
    });

    it('should handle sync errors gracefully', async () => {
      const mockStore = {
        getAll: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null,
          result: []
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      // Mock API error
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(offlineManager.syncWithServer()).rejects.toThrow('Network error');
    });
  });

  describe('Utility Methods', () => {
    it('should get offline data count', async () => {
      const mockStore = {
        getAll: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null,
          result: [{ id: '1' }, { id: '2' }]
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      const counts = await offlineManager.getOfflineDataCount();
      expect(counts).toEqual({
        transactions: 2,
        favorites: 2,
        cartItems: 2
      });
    });

    it('should clear all data', async () => {
      const mockStore = {
        clear: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      await offlineManager.clearAllData();
      
      // Should clear all stores
      expect(mockStore.clear).toHaveBeenCalledTimes(4);
    });
  });

  describe('Error Handling', () => {
    it('should handle database initialization errors', async () => {
      mockIndexedDB.open.mockImplementation(() => {
        const request = {
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: null,
          error: new Error('Database error')
        };
        setTimeout(() => request.onerror?.(new Event('error')), 0);
        return request;
      });

      await expect(offlineManager.saveTransaction({
        id: 'test',
        type: 'buy',
        assetId: 'test',
        amount: 1,
        price: 1,
        timestamp: Date.now(),
        status: 'pending',
        data: {}
      })).rejects.toThrow();
    });

    it('should handle database operation errors', async () => {
      const mockStore = {
        put: vi.fn().mockImplementation(() => ({
          onsuccess: null,
          onerror: null,
          error: new Error('Operation failed')
        }))
      };

      mockDB.transaction.mockReturnValue({
        objectStore: vi.fn().mockReturnValue(mockStore)
      });

      await expect(offlineManager.saveTransaction({
        id: 'test',
        type: 'buy',
        assetId: 'test',
        amount: 1,
        price: 1,
        timestamp: Date.now(),
        status: 'pending',
        data: {}
      })).rejects.toThrow();
    });
  });
});

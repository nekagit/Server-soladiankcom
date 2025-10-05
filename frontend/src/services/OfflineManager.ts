// Offline Data Management Service
export interface OfflineTransaction {
  id: string;
  type: 'buy' | 'sell' | 'transfer';
  assetId: string;
  amount: number;
  price: number;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  data: any;
}

export interface OfflineFavorite {
  id: string;
  assetId: string;
  assetType: 'nft' | 'token' | 'product';
  timestamp: number;
  data: any;
}

export interface OfflineCartItem {
  id: string;
  assetId: string;
  assetType: 'nft' | 'token' | 'product';
  quantity: number;
  price: number;
  timestamp: number;
  data: any;
}

export class OfflineManager {
  private dbName = 'SoladiaOffline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDatabase();
  }

  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('OfflineManager: Database initialization failed');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('OfflineManager: Database initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('offline-transactions')) {
          const transactionStore = db.createObjectStore('offline-transactions', { keyPath: 'id' });
          transactionStore.createIndex('timestamp', 'timestamp', { unique: false });
          transactionStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('offline-favorites')) {
          const favoritesStore = db.createObjectStore('offline-favorites', { keyPath: 'id' });
          favoritesStore.createIndex('assetId', 'assetId', { unique: false });
          favoritesStore.createIndex('assetType', 'assetType', { unique: false });
        }

        if (!db.objectStoreNames.contains('offline-cart')) {
          const cartStore = db.createObjectStore('offline-cart', { keyPath: 'id' });
          cartStore.createIndex('assetId', 'assetId', { unique: false });
          cartStore.createIndex('assetType', 'assetType', { unique: false });
        }

        if (!db.objectStoreNames.contains('offline-settings')) {
          const settingsStore = db.createObjectStore('offline-settings', { keyPath: 'key' });
        }

        console.log('OfflineManager: Database schema created');
      };
    });
  }

  // Transaction management
  async saveTransaction(transaction: OfflineTransaction): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-transactions'], 'readwrite');
      const store = transaction.objectStore('offline-transactions');
      const request = store.put(transaction);

      request.onsuccess = () => {
        console.log('OfflineManager: Transaction saved:', transaction.id);
        resolve();
      };

      request.onerror = () => {
        console.error('OfflineManager: Failed to save transaction:', request.error);
        reject(request.error);
      };
    });
  }

  async getTransactions(): Promise<OfflineTransaction[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-transactions'], 'readonly');
      const store = transaction.objectStore('offline-transactions');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('OfflineManager: Failed to get transactions:', request.error);
        reject(request.error);
      };
    });
  }

  async removeTransaction(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-transactions'], 'readwrite');
      const store = transaction.objectStore('offline-transactions');
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('OfflineManager: Transaction removed:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('OfflineManager: Failed to remove transaction:', request.error);
        reject(request.error);
      };
    });
  }

  // Favorites management
  async saveFavorite(favorite: OfflineFavorite): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-favorites'], 'readwrite');
      const store = transaction.objectStore('offline-favorites');
      const request = store.put(favorite);

      request.onsuccess = () => {
        console.log('OfflineManager: Favorite saved:', favorite.id);
        resolve();
      };

      request.onerror = () => {
        console.error('OfflineManager: Failed to save favorite:', request.error);
        reject(request.error);
      };
    });
  }

  async getFavorites(): Promise<OfflineFavorite[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-favorites'], 'readonly');
      const store = transaction.objectStore('offline-favorites');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('OfflineManager: Failed to get favorites:', request.error);
        reject(request.error);
      };
    });
  }

  async removeFavorite(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-favorites'], 'readwrite');
      const store = transaction.objectStore('offline-favorites');
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('OfflineManager: Favorite removed:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('OfflineManager: Failed to remove favorite:', request.error);
        reject(request.error);
      };
    });
  }

  // Cart management
  async saveCartItem(item: OfflineCartItem): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-cart'], 'readwrite');
      const store = transaction.objectStore('offline-cart');
      const request = store.put(item);

      request.onsuccess = () => {
        console.log('OfflineManager: Cart item saved:', item.id);
        resolve();
      };

      request.onerror = () => {
        console.error('OfflineManager: Failed to save cart item:', request.error);
        reject(request.error);
      };
    });
  }

  async getCartItems(): Promise<OfflineCartItem[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-cart'], 'readonly');
      const store = transaction.objectStore('offline-cart');
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('OfflineManager: Failed to get cart items:', request.error);
        reject(request.error);
      };
    });
  }

  async removeCartItem(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-cart'], 'readwrite');
      const store = transaction.objectStore('offline-cart');
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('OfflineManager: Cart item removed:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('OfflineManager: Failed to remove cart item:', request.error);
        reject(request.error);
      };
    });
  }

  async clearCart(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-cart'], 'readwrite');
      const store = transaction.objectStore('offline-cart');
      const request = store.clear();

      request.onsuccess = () => {
        console.log('OfflineManager: Cart cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('OfflineManager: Failed to clear cart:', request.error);
        reject(request.error);
      };
    });
  }

  // Settings management
  async saveSetting(key: string, value: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-settings'], 'readwrite');
      const store = transaction.objectStore('offline-settings');
      const request = store.put({ key, value });

      request.onsuccess = () => {
        console.log('OfflineManager: Setting saved:', key);
        resolve();
      };

      request.onerror = () => {
        console.error('OfflineManager: Failed to save setting:', request.error);
        reject(request.error);
      };
    });
  }

  async getSetting(key: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offline-settings'], 'readonly');
      const store = transaction.objectStore('offline-settings');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };

      request.onerror = () => {
        console.error('OfflineManager: Failed to get setting:', request.error);
        reject(request.error);
      };
    });
  }

  // Sync management
  async syncWithServer(): Promise<void> {
    try {
      console.log('OfflineManager: Starting sync with server');
      
      // Sync transactions
      await this.syncTransactions();
      
      // Sync favorites
      await this.syncFavorites();
      
      // Sync cart
      await this.syncCart();
      
      console.log('OfflineManager: Sync completed');
    } catch (error) {
      console.error('OfflineManager: Sync failed:', error);
      throw error;
    }
  }

  private async syncTransactions(): Promise<void> {
    const transactions = await this.getTransactions();
    
    for (const transaction of transactions) {
      try {
        const response = await fetch('/api/solana/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transaction)
        });
        
        if (response.ok) {
          await this.removeTransaction(transaction.id);
          console.log('OfflineManager: Synced transaction:', transaction.id);
        }
      } catch (error) {
        console.error('OfflineManager: Failed to sync transaction:', error);
      }
    }
  }

  private async syncFavorites(): Promise<void> {
    const favorites = await this.getFavorites();
    
    for (const favorite of favorites) {
      try {
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(favorite)
        });
        
        if (response.ok) {
          await this.removeFavorite(favorite.id);
          console.log('OfflineManager: Synced favorite:', favorite.id);
        }
      } catch (error) {
        console.error('OfflineManager: Failed to sync favorite:', error);
      }
    }
  }

  private async syncCart(): Promise<void> {
    const cartItems = await this.getCartItems();
    
    if (cartItems.length > 0) {
      try {
        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ items: cartItems })
        });
        
        if (response.ok) {
          await this.clearCart();
          console.log('OfflineManager: Synced cart items');
        }
      } catch (error) {
        console.error('OfflineManager: Failed to sync cart:', error);
      }
    }
  }

  // Utility methods
  async getOfflineDataCount(): Promise<{ transactions: number; favorites: number; cartItems: number }> {
    const [transactions, favorites, cartItems] = await Promise.all([
      this.getTransactions(),
      this.getFavorites(),
      this.getCartItems()
    ]);

    return {
      transactions: transactions.length,
      favorites: favorites.length,
      cartItems: cartItems.length
    };
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const storeNames = ['offline-transactions', 'offline-favorites', 'offline-cart', 'offline-settings'];
    
    for (const storeName of storeNames) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    
    console.log('OfflineManager: All data cleared');
  }
}

// Export singleton instance
export const offlineManager = new OfflineManager();

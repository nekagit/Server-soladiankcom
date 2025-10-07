/**
 * Caching service for API responses, images, and other resources
 */

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
  strategy?: 'lru' | 'fifo' | 'lfu'; // Cache eviction strategy
  storage?: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB';
}

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  size: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
}

class CacheService {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private options: CacheOptions;
  private stats = {
    hits: 0,
    misses: 0,
    totalHits: 0,
    totalMisses: 0,
  };

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 100, // 100 items default
      strategy: 'lru',
      storage: 'memory',
      ...options,
    };
  }

  public set<T>(key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl: ttl || this.options.ttl || 0,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    // Check cache size and evict if necessary
    if (this.memoryCache.size >= (this.options.maxSize || 100)) {
      this.evict();
    }

    this.memoryCache.set(key, entry);

    // Store in persistent storage if configured
    if (this.options.storage !== 'memory') {
      this.setPersistent(key, entry);
    }
  }

  public get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      // Try to get from persistent storage
      const persistentEntry = this.getPersistent<T>(key);
      if (persistentEntry) {
        this.memoryCache.set(key, persistentEntry);
        return this.validateAndReturn(persistentEntry);
      }
      
      this.stats.misses++;
      this.stats.totalMisses++;
      return null;
    }

    return this.validateAndReturn(entry);
  }

  private validateAndReturn<T>(entry: CacheEntry<T>): T | null {
    // Check if entry has expired
    if (entry.ttl > 0 && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(entry.key);
      this.stats.misses++;
      this.stats.totalMisses++;
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.stats.totalHits++;

    return entry.value;
  }

  public has(key: string): boolean {
    return this.get(key) !== null;
  }

  public delete(key: string): boolean {
    const deleted = this.memoryCache.delete(key);
    
    if (this.options.storage !== 'memory') {
      this.deletePersistent(key);
    }
    
    return deleted;
  }

  public clear(): void {
    this.memoryCache.clear();
    
    if (this.options.storage !== 'memory') {
      this.clearPersistent();
    }
    
    this.stats = {
      hits: 0,
      misses: 0,
      totalHits: 0,
      totalMisses: 0,
    };
  }

  public keys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  public size(): number {
    return this.memoryCache.size;
  }

  public getStats(): CacheStats {
    const total = this.stats.totalHits + this.stats.totalMisses;
    return {
      size: this.memoryCache.size,
      hitRate: total > 0 ? this.stats.totalHits / total : 0,
      missRate: total > 0 ? this.stats.totalMisses / total : 0,
      totalHits: this.stats.totalHits,
      totalMisses: this.stats.totalMisses,
      memoryUsage: this.calculateMemoryUsage(),
    };
  }

  private calculateMemoryUsage(): number {
    let totalSize = 0;
    for (const [key, entry] of this.memoryCache) {
      totalSize += key.length * 2; // Approximate string size
      totalSize += JSON.stringify(entry).length * 2; // Approximate object size
    }
    return totalSize;
  }

  private evict(): void {
    const strategy = this.options.strategy || 'lru';
    
    switch (strategy) {
      case 'lru':
        this.evictLRU();
        break;
      case 'fifo':
        this.evictFIFO();
        break;
      case 'lfu':
        this.evictLFU();
        break;
    }
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.memoryCache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  private evictFIFO(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of this.memoryCache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  private evictLFU(): void {
    let leastFrequentKey = '';
    let leastFrequentCount = Infinity;
    
    for (const [key, entry] of this.memoryCache) {
      if (entry.accessCount < leastFrequentCount) {
        leastFrequentCount = entry.accessCount;
        leastFrequentKey = key;
      }
    }
    
    if (leastFrequentKey) {
      this.delete(leastFrequentKey);
    }
  }

  // Persistent storage methods
  private setPersistent(key: string, entry: CacheEntry): void {
    if (typeof window === 'undefined') return;

    try {
      const serialized = JSON.stringify(entry);
      
      switch (this.options.storage) {
        case 'localStorage':
          localStorage.setItem(`cache_${key}`, serialized);
          break;
        case 'sessionStorage':
          sessionStorage.setItem(`cache_${key}`, serialized);
          break;
        case 'indexedDB':
          this.setIndexedDB(key, entry);
          break;
      }
    } catch (error) {
      console.warn('Failed to store in persistent cache:', error);
    }
  }

  private getPersistent<T>(key: string): CacheEntry<T> | null {
    if (typeof window === 'undefined') return null;

    try {
      let serialized: string | null = null;
      
      switch (this.options.storage) {
        case 'localStorage':
          serialized = localStorage.getItem(`cache_${key}`);
          break;
        case 'sessionStorage':
          serialized = sessionStorage.getItem(`cache_${key}`);
          break;
        case 'indexedDB':
          return this.getIndexedDB<T>(key);
      }
      
      return serialized ? JSON.parse(serialized) : null;
    } catch (error) {
      console.warn('Failed to retrieve from persistent cache:', error);
      return null;
    }
  }

  private deletePersistent(key: string): void {
    if (typeof window === 'undefined') return;

    try {
      switch (this.options.storage) {
        case 'localStorage':
          localStorage.removeItem(`cache_${key}`);
          break;
        case 'sessionStorage':
          sessionStorage.removeItem(`cache_${key}`);
          break;
        case 'indexedDB':
          this.deleteIndexedDB(key);
          break;
      }
    } catch (error) {
      console.warn('Failed to delete from persistent cache:', error);
    }
  }

  private clearPersistent(): void {
    if (typeof window === 'undefined') return;

    try {
      switch (this.options.storage) {
        case 'localStorage':
          Object.keys(localStorage)
            .filter(key => key.startsWith('cache_'))
            .forEach(key => localStorage.removeItem(key));
          break;
        case 'sessionStorage':
          Object.keys(sessionStorage)
            .filter(key => key.startsWith('cache_'))
            .forEach(key => sessionStorage.removeItem(key));
          break;
        case 'indexedDB':
          this.clearIndexedDB();
          break;
      }
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error);
    }
  }

  // IndexedDB methods (simplified implementation)
  private setIndexedDB(key: string, entry: CacheEntry): void {
    // Simplified IndexedDB implementation
    // In a real implementation, you would use proper IndexedDB API
    console.warn('IndexedDB caching not fully implemented');
  }

  private getIndexedDB<T>(key: string): CacheEntry<T> | null {
    // Simplified IndexedDB implementation
    console.warn('IndexedDB caching not fully implemented');
    return null;
  }

  private deleteIndexedDB(key: string): void {
    // Simplified IndexedDB implementation
    console.warn('IndexedDB caching not fully implemented');
  }

  private clearIndexedDB(): void {
    // Simplified IndexedDB implementation
    console.warn('IndexedDB caching not fully implemented');
  }

  // Utility methods
  public async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    this.set(key, value, ttl);
    return value;
  }

  public invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete = this.keys().filter(key => regex.test(key));
    keysToDelete.forEach(key => this.delete(key));
  }

  public warmup<T>(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    entries.forEach(({ key, value, ttl }) => {
      this.set(key, value, ttl);
    });
  }
}

// Create singleton instances for different use cases
export const apiCache = new CacheService({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000,
  strategy: 'lru',
  storage: 'memory',
});

export const imageCache = new CacheService({
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 100,
  strategy: 'lru',
  storage: 'localStorage',
});

export const componentCache = new CacheService({
  ttl: 60 * 60 * 1000, // 1 hour
  maxSize: 50,
  strategy: 'lru',
  storage: 'memory',
});

// Export types
export type { CacheOptions, CacheEntry, CacheStats };



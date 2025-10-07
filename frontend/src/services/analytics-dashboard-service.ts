/**
 * Analytics Dashboard Service
 * Blockchain and trading analytics with comprehensive insights
 */

import { productionWalletService } from './production-wallet-service';
import { productionNFTMarketplace } from './production-nft-marketplace';
import { productionAuthService } from './production-auth-service';

export interface AnalyticsData {
  overview: {
    totalVolume: number;
    totalTransactions: number;
    activeUsers: number;
    floorPrice: number;
    averagePrice: number;
    priceChange24h: number;
    volumeChange24h: number;
  };
  trends: {
    daily: TrendData[];
    weekly: TrendData[];
    monthly: TrendData[];
  };
  topCollections: CollectionAnalytics[];
  topCreators: CreatorAnalytics[];
  topNFTs: NFTAnalytics[];
  marketInsights: MarketInsight[];
  userStats: UserAnalytics;
}

export interface TrendData {
  date: string;
  volume: number;
  transactions: number;
  users: number;
  floorPrice: number;
  averagePrice: number;
}

export interface CollectionAnalytics {
  id: string;
  name: string;
  symbol: string;
  image: string;
  volume24h: number;
  volume7d: number;
  volume30d: number;
  floorPrice: number;
  floorPriceChange24h: number;
  totalSupply: number;
  listed: number;
  sales24h: number;
  sales7d: number;
  uniqueHolders: number;
  marketCap: number;
  rank: number;
}

export interface CreatorAnalytics {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  totalVolume: number;
  totalSales: number;
  averagePrice: number;
  nftsCreated: number;
  collectionsCreated: number;
  followers: number;
  reputation: number;
  rank: number;
}

export interface NFTAnalytics {
  id: string;
  name: string;
  image: string;
  collection: string;
  creator: string;
  currentPrice: number;
  priceChange24h: number;
  volume24h: number;
  sales24h: number;
  views: number;
  likes: number;
  rarity: number;
  rank: number;
}

export interface MarketInsight {
  id: string;
  type: 'trend' | 'opportunity' | 'warning' | 'news';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
  timestamp: number;
  data: any;
}

export interface UserAnalytics {
  portfolio: {
    totalValue: number;
    totalNFTs: number;
    totalCollections: number;
    averageHoldingTime: number;
    profitLoss: number;
    profitLossPercentage: number;
  };
  trading: {
    totalTrades: number;
    totalVolume: number;
    averageTradeSize: number;
    winRate: number;
    bestTrade: number;
    worstTrade: number;
    tradingStreak: number;
  };
  activity: {
    logins: number;
    searches: number;
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  performance: {
    rank: number;
    percentile: number;
    badges: string[];
    achievements: string[];
  };
}

export interface AnalyticsFilters {
  timeRange: '24h' | '7d' | '30d' | '90d' | '1y' | 'all';
  collections: string[];
  creators: string[];
  priceRange: {
    min: number;
    max: number;
  };
  volumeRange: {
    min: number;
    max: number;
  };
  sortBy: 'volume' | 'price' | 'sales' | 'change' | 'rank';
  sortOrder: 'asc' | 'desc';
}

export interface AnalyticsState {
  data: AnalyticsData | null;
  filters: AnalyticsFilters;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  realTimeUpdates: boolean;
}

export interface AnalyticsError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: number;
}

export class AnalyticsDashboardService {
  private state: AnalyticsState = {
    data: null,
    filters: {
      timeRange: '7d',
      collections: [],
      creators: [],
      priceRange: { min: 0, max: 0 },
      volumeRange: { min: 0, max: 0 },
      sortBy: 'volume',
      sortOrder: 'desc'
    },
    isLoading: false,
    error: null,
    lastUpdated: 0,
    realTimeUpdates: false
  };

  private listeners: Set<(state: AnalyticsState) => void> = new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'soladia-analytics-state';
  private readonly ANALYTICS_URL = '/api/analytics';
  private readonly UPDATE_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.loadAnalyticsStateFromStorage();
    this.initializeAnalytics();
  }

  /**
   * Initialize analytics
   */
  private async initializeAnalytics(): Promise<void> {
    try {
      await this.loadAnalyticsData();
      this.startRealTimeUpdates();
    } catch (error) {
      console.error('Failed to initialize analytics:', error);
    }
  }

  /**
   * Load analytics data
   */
  async loadAnalyticsData(): Promise<AnalyticsData | null> {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await fetch(`${this.ANALYTICS_URL}?${this.buildQueryString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load analytics: ${response.statusText}`);
      }

      const data = await response.json();
      const analyticsData: AnalyticsData = {
        overview: data.overview || this.getDefaultOverview(),
        trends: data.trends || this.getDefaultTrends(),
        topCollections: data.topCollections || [],
        topCreators: data.topCreators || [],
        topNFTs: data.topNFTs || [],
        marketInsights: data.marketInsights || [],
        userStats: data.userStats || this.getDefaultUserStats()
      };

      this.setState({
        data: analyticsData,
        isLoading: false,
        lastUpdated: Date.now()
      });

      this.saveAnalyticsStateToStorage();
      this.notifyListeners();

      return analyticsData;

    } catch (error) {
      this.handleAnalyticsError(error);
      return null;
    }
  }

  /**
   * Load user analytics
   */
  async loadUserAnalytics(): Promise<UserAnalytics | null> {
    try {
      if (!productionAuthService.isAuthenticated()) {
        return null;
      }

      const response = await fetch(`${this.ANALYTICS_URL}/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load user analytics: ${response.statusText}`);
      }

      const data = await response.json();
      const userStats: UserAnalytics = data.userStats || this.getDefaultUserStats();

      if (this.state.data) {
        const updatedData = {
          ...this.state.data,
          userStats
        };
        this.setState({ data: updatedData });
      }

      return userStats;

    } catch (error) {
      this.handleAnalyticsError(error);
      return null;
    }
  }

  /**
   * Load collection analytics
   */
  async loadCollectionAnalytics(collectionId: string): Promise<CollectionAnalytics | null> {
    try {
      const response = await fetch(`${this.ANALYTICS_URL}/collections/${collectionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load collection analytics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.collection || null;

    } catch (error) {
      this.handleAnalyticsError(error);
      return null;
    }
  }

  /**
   * Load creator analytics
   */
  async loadCreatorAnalytics(creatorId: string): Promise<CreatorAnalytics | null> {
    try {
      const response = await fetch(`${this.ANALYTICS_URL}/creators/${creatorId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load creator analytics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.creator || null;

    } catch (error) {
      this.handleAnalyticsError(error);
      return null;
    }
  }

  /**
   * Load NFT analytics
   */
  async loadNFTAnalytics(nftId: string): Promise<NFTAnalytics | null> {
    try {
      const response = await fetch(`${this.ANALYTICS_URL}/nfts/${nftId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load NFT analytics: ${response.statusText}`);
      }

      const data = await response.json();
      return data.nft || null;

    } catch (error) {
      this.handleAnalyticsError(error);
      return null;
    }
  }

  /**
   * Load market insights
   */
  async loadMarketInsights(): Promise<MarketInsight[]> {
    try {
      const response = await fetch(`${this.ANALYTICS_URL}/insights`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load market insights: ${response.statusText}`);
      }

      const data = await response.json();
      const insights = data.insights || [];

      if (this.state.data) {
        const updatedData = {
          ...this.state.data,
          marketInsights: insights
        };
        this.setState({ data: updatedData });
      }

      return insights;

    } catch (error) {
      this.handleAnalyticsError(error);
      return [];
    }
  }

  /**
   * Set analytics filters
   */
  setFilters(filters: Partial<AnalyticsFilters>): void {
    const newFilters = { ...this.state.filters, ...filters };
    this.setState({ filters: newFilters });
    this.saveAnalyticsStateToStorage();
    this.loadAnalyticsData();
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    const defaultFilters: AnalyticsFilters = {
      timeRange: '7d',
      collections: [],
      creators: [],
      priceRange: { min: 0, max: 0 },
      volumeRange: { min: 0, max: 0 },
      sortBy: 'volume',
      sortOrder: 'desc'
    };

    this.setState({ filters: defaultFilters });
    this.saveAnalyticsStateToStorage();
    this.loadAnalyticsData();
  }

  /**
   * Start real-time updates
   */
  startRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.setState({ realTimeUpdates: true });
    this.updateInterval = setInterval(() => {
      this.loadAnalyticsData();
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Stop real-time updates
   */
  stopRealTimeUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.setState({ realTimeUpdates: false });
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format: 'csv' | 'json' | 'pdf'): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.ANALYTICS_URL}/export?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to export analytics: ${response.statusText}`);
      }

      return await response.blob();

    } catch (error) {
      this.handleAnalyticsError(error);
      return null;
    }
  }

  /**
   * Build query string from filters
   */
  private buildQueryString(): string {
    const params = new URLSearchParams();
    
    params.append('timeRange', this.state.filters.timeRange);
    
    if (this.state.filters.collections.length > 0) {
      params.append('collections', this.state.filters.collections.join(','));
    }
    
    if (this.state.filters.creators.length > 0) {
      params.append('creators', this.state.filters.creators.join(','));
    }
    
    if (this.state.filters.priceRange.min > 0) {
      params.append('priceMin', this.state.filters.priceRange.min.toString());
    }
    
    if (this.state.filters.priceRange.max > 0) {
      params.append('priceMax', this.state.filters.priceRange.max.toString());
    }
    
    if (this.state.filters.volumeRange.min > 0) {
      params.append('volumeMin', this.state.filters.volumeRange.min.toString());
    }
    
    if (this.state.filters.volumeRange.max > 0) {
      params.append('volumeMax', this.state.filters.volumeRange.max.toString());
    }
    
    params.append('sortBy', this.state.filters.sortBy);
    params.append('sortOrder', this.state.filters.sortOrder);

    return params.toString();
  }

  /**
   * Get default overview data
   */
  private getDefaultOverview(): AnalyticsData['overview'] {
    return {
      totalVolume: 0,
      totalTransactions: 0,
      activeUsers: 0,
      floorPrice: 0,
      averagePrice: 0,
      priceChange24h: 0,
      volumeChange24h: 0
    };
  }

  /**
   * Get default trends data
   */
  private getDefaultTrends(): AnalyticsData['trends'] {
    return {
      daily: [],
      weekly: [],
      monthly: []
    };
  }

  /**
   * Get default user stats
   */
  private getDefaultUserStats(): UserAnalytics {
    return {
      portfolio: {
        totalValue: 0,
        totalNFTs: 0,
        totalCollections: 0,
        averageHoldingTime: 0,
        profitLoss: 0,
        profitLossPercentage: 0
      },
      trading: {
        totalTrades: 0,
        totalVolume: 0,
        averageTradeSize: 0,
        winRate: 0,
        bestTrade: 0,
        worstTrade: 0,
        tradingStreak: 0
      },
      activity: {
        logins: 0,
        searches: 0,
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0
      },
      performance: {
        rank: 0,
        percentile: 0,
        badges: [],
        achievements: []
      }
    };
  }

  /**
   * Get auth token
   */
  private getAuthToken(): string {
    return localStorage.getItem('soladia-auth-token') || '';
  }

  /**
   * Get current analytics state
   */
  getState(): AnalyticsState {
    return { ...this.state };
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: AnalyticsState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get analytics data
   */
  getAnalyticsData(): AnalyticsData | null {
    return this.state.data;
  }

  /**
   * Get filters
   */
  getFilters(): AnalyticsFilters {
    return { ...this.state.filters };
  }

  /**
   * Check if real-time updates are enabled
   */
  isRealTimeUpdatesEnabled(): boolean {
    return this.state.realTimeUpdates;
  }

  /**
   * Handle analytics errors
   */
  private handleAnalyticsError(error: any): void {
    const analyticsError = this.createAnalyticsError(
      error.code || 'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      error.details
    );

    this.setState({
      isLoading: false,
      error: analyticsError.message,
      lastUpdated: Date.now()
    });

    console.error('Analytics error:', analyticsError);
  }

  /**
   * Create analytics error
   */
  private createAnalyticsError(code: string, message: string, details?: any): AnalyticsError {
    return {
      code,
      message,
      details,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Set analytics state
   */
  private setState(updates: Partial<AnalyticsState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Notify listeners of state changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('Error in analytics state listener:', error);
      }
    });
  }

  /**
   * Save analytics state to storage
   */
  private saveAnalyticsStateToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save analytics state to storage:', error);
    }
  }

  /**
   * Load analytics state from storage
   */
  private loadAnalyticsStateFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.setState(state);
      }
    } catch (error) {
      console.warn('Failed to load analytics state from storage:', error);
    }
  }

  /**
   * Clear analytics data
   */
  clearAnalyticsData(): void {
    this.setState({
      data: null,
      error: null,
      lastUpdated: 0
    });
    this.saveAnalyticsStateToStorage();
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Destroy service instance
   */
  destroy(): void {
    this.cleanup();
    this.listeners.clear();
  }
}

// Export singleton instance
export const analyticsDashboardService = new AnalyticsDashboardService();
export default analyticsDashboardService;

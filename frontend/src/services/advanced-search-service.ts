/**
 * Advanced Search Service
 * AI-powered search with filters, recommendations, and smart suggestions for the Soladia marketplace
 */

export interface SearchFilters {
  categories?: string[];
  status?: string[];
  rarity?: string[];
  priceMin?: number;
  priceMax?: number;
  collections?: string[];
  creators?: string[];
  sort?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  collection: string;
  creator: string;
  price: number;
  priceFormatted: string;
  image: string;
  category: string;
  rarity: string;
  status: string;
  likes: number;
  views: number;
  createdAt: string;
  updatedAt: string;
  attributes?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  facets: SearchFacets;
  suggestions: SearchSuggestions;
  recommendations: SearchRecommendations;
}

export interface SearchFacets {
  categories: FacetItem[];
  status: FacetItem[];
  rarity: FacetItem[];
  priceRanges: FacetRange[];
  collections: FacetItem[];
  creators: FacetItem[];
}

export interface FacetItem {
  value: string;
  label: string;
  count: number;
  selected?: boolean;
}

export interface FacetRange {
  min: number;
  max: number;
  count: number;
  selected?: boolean;
}

export interface SearchSuggestions {
  trending: SuggestionItem[];
  collections: SuggestionItem[];
  creators: SuggestionItem[];
  related: SuggestionItem[];
}

export interface SuggestionItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'collection' | 'creator' | 'nft' | 'category';
  image?: string;
  count?: number;
  relevance?: number;
}

export interface SearchRecommendations {
  similar: SearchResult[];
  popular: SearchResult[];
  trending: SearchResult[];
  recentlyViewed: SearchResult[];
}

export interface SearchAnalytics {
  query: string;
  filters: SearchFilters;
  resultsCount: number;
  clickThroughRate: number;
  timeSpent: number;
  userSatisfaction: number;
}

export class AdvancedSearchService {
  private baseUrl: string;
  private apiKey: string;
  private searchHistory: string[] = [];
  private userPreferences: Record<string, any> = {};
  private analytics: SearchAnalytics[] = [];

  constructor(baseUrl: string = '/api/search', apiKey: string = '') {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.loadUserPreferences();
    this.loadSearchHistory();
  }

  /**
   * Perform advanced search with AI-powered features
   */
  async search(query: string, filters: SearchFilters = {}): Promise<SearchResponse> {
    try {
      const searchParams = this.buildSearchParams(query, filters);
      const response = await this.makeAPICall('/search', searchParams);
      
      // Track search analytics
      this.trackSearchAnalytics(query, filters, response);
      
      // Update search history
      this.updateSearchHistory(query);
      
      return response;
    } catch (error) {
      console.error('Search failed:', error);
      throw new Error('Search failed. Please try again.');
    }
  }

  /**
   * Get search suggestions based on query
   */
  async getSuggestions(query: string, limit: number = 10): Promise<SearchSuggestions> {
    try {
      const response = await this.makeAPICall('/suggestions', {
        query: query.trim(),
        limit,
        user_id: this.getUserId()
      });
      
      return response;
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return {
        trending: [],
        collections: [],
        creators: [],
        related: []
      };
    }
  }

  /**
   * Get search recommendations for user
   */
  async getRecommendations(userId?: string): Promise<SearchRecommendations> {
    try {
      const response = await this.makeAPICall('/recommendations', {
        user_id: userId || this.getUserId(),
        limit: 20
      });
      
      return response;
    } catch (error) {
      console.error('Failed to get recommendations:', error);
      return {
        similar: [],
        popular: [],
        trending: [],
        recentlyViewed: []
      };
    }
  }

  /**
   * Get search facets for filtering
   */
  async getFacets(query: string, filters: SearchFilters = {}): Promise<SearchFacets> {
    try {
      const response = await this.makeAPICall('/facets', {
        query: query.trim(),
        ...filters
      });
      
      return response;
    } catch (error) {
      console.error('Failed to get facets:', error);
      return {
        categories: [],
        status: [],
        rarity: [],
        priceRanges: [],
        collections: [],
        creators: []
      };
    }
  }

  /**
   * Get trending searches
   */
  async getTrendingSearches(limit: number = 10): Promise<string[]> {
    try {
      const response = await this.makeAPICall('/trending', { limit });
      return response.searches || [];
    } catch (error) {
      console.error('Failed to get trending searches:', error);
      return [];
    }
  }

  /**
   * Get popular collections
   */
  async getPopularCollections(limit: number = 20): Promise<SuggestionItem[]> {
    try {
      const response = await this.makeAPICall('/collections/popular', { limit });
      return response.collections || [];
    } catch (error) {
      console.error('Failed to get popular collections:', error);
      return [];
    }
  }

  /**
   * Get popular creators
   */
  async getPopularCreators(limit: number = 20): Promise<SuggestionItem[]> {
    try {
      const response = await this.makeAPICall('/creators/popular', { limit });
      return response.creators || [];
    } catch (error) {
      console.error('Failed to get popular creators:', error);
      return [];
    }
  }

  /**
   * Search collections
   */
  async searchCollections(query: string, limit: number = 20): Promise<SuggestionItem[]> {
    try {
      const response = await this.makeAPICall('/collections/search', {
        query: query.trim(),
        limit
      });
      return response.collections || [];
    } catch (error) {
      console.error('Failed to search collections:', error);
      return [];
    }
  }

  /**
   * Search creators
   */
  async searchCreators(query: string, limit: number = 20): Promise<SuggestionItem[]> {
    try {
      const response = await this.makeAPICall('/creators/search', {
        query: query.trim(),
        limit
      });
      return response.creators || [];
    } catch (error) {
      console.error('Failed to search creators:', error);
      return [];
    }
  }

  /**
   * Get similar NFTs
   */
  async getSimilarNFTs(nftId: string, limit: number = 12): Promise<SearchResult[]> {
    try {
      const response = await this.makeAPICall('/similar', {
        nft_id: nftId,
        limit
      });
      return response.results || [];
    } catch (error) {
      console.error('Failed to get similar NFTs:', error);
      return [];
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(timeRange: string = '7d'): Promise<SearchAnalytics[]> {
    try {
      const response = await this.makeAPICall('/analytics', {
        time_range: timeRange,
        user_id: this.getUserId()
      });
      return response.analytics || [];
    } catch (error) {
      console.error('Failed to get search analytics:', error);
      return [];
    }
  }

  /**
   * Save user search preferences
   */
  async saveUserPreferences(preferences: Record<string, any>): Promise<void> {
    try {
      await this.makeAPICall('/preferences', {
        user_id: this.getUserId(),
        preferences
      }, 'POST');
      
      this.userPreferences = { ...this.userPreferences, ...preferences };
      this.saveUserPreferencesToStorage();
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  }

  /**
   * Get user search preferences
   */
  getUserPreferences(): Record<string, any> {
    return { ...this.userPreferences };
  }

  /**
   * Get search history
   */
  getSearchHistory(): string[] {
    return [...this.searchHistory];
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.searchHistory = [];
    this.saveSearchHistoryToStorage();
  }

  /**
   * Track search result click
   */
  async trackSearchClick(resultId: string, query: string, position: number): Promise<void> {
    try {
      await this.makeAPICall('/track/click', {
        result_id: resultId,
        query,
        position,
        user_id: this.getUserId(),
        timestamp: new Date().toISOString()
      }, 'POST');
    } catch (error) {
      console.error('Failed to track search click:', error);
    }
  }

  /**
   * Track search impression
   */
  async trackSearchImpression(resultId: string, query: string, position: number): Promise<void> {
    try {
      await this.makeAPICall('/track/impression', {
        result_id: resultId,
        query,
        position,
        user_id: this.getUserId(),
        timestamp: new Date().toISOString()
      }, 'POST');
    } catch (error) {
      console.error('Failed to track search impression:', error);
    }
  }

  /**
   * Build search parameters
   */
  private buildSearchParams(query: string, filters: SearchFilters): Record<string, any> {
    const params: Record<string, any> = {
      q: query.trim(),
      page: filters.page || 1,
      limit: filters.limit || 20,
      sort: filters.sort || 'relevance',
      user_id: this.getUserId()
    };

    // Add filters
    if (filters.categories && filters.categories.length > 0) {
      params.categories = filters.categories.join(',');
    }

    if (filters.status && filters.status.length > 0) {
      params.status = filters.status.join(',');
    }

    if (filters.rarity && filters.rarity.length > 0) {
      params.rarity = filters.rarity.join(',');
    }

    if (filters.priceMin !== undefined) {
      params.price_min = filters.priceMin;
    }

    if (filters.priceMax !== undefined) {
      params.price_max = filters.priceMax;
    }

    if (filters.collections && filters.collections.length > 0) {
      params.collections = filters.collections.join(',');
    }

    if (filters.creators && filters.creators.length > 0) {
      params.creators = filters.creators.join(',');
    }

    return params;
  }

  /**
   * Make API call
   */
  private async makeAPICall(endpoint: string, params: Record<string, any>, method: string = 'GET'): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (method === 'GET') {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key].toString());
        }
      });
    }

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.apiKey ? `Bearer ${this.apiKey}` : '',
        'X-User-ID': this.getUserId()
      }
    };

    if (method !== 'GET' && params) {
      options.body = JSON.stringify(params);
    }

    const response = await fetch(url.toString(), options);
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Track search analytics
   */
  private trackSearchAnalytics(query: string, filters: SearchFilters, response: SearchResponse): void {
    const analytics: SearchAnalytics = {
      query,
      filters,
      resultsCount: response.total,
      clickThroughRate: 0, // Will be updated when clicks are tracked
      timeSpent: 0, // Will be updated when user leaves search
      userSatisfaction: 0 // Will be updated based on user behavior
    };

    this.analytics.push(analytics);
    this.saveAnalyticsToStorage();
  }

  /**
   * Update search history
   */
  private updateSearchHistory(query: string): void {
    if (!query.trim()) return;

    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(item => item !== query);
    
    // Add to beginning
    this.searchHistory.unshift(query);
    
    // Keep only last 50 searches
    this.searchHistory = this.searchHistory.slice(0, 50);
    
    this.saveSearchHistoryToStorage();
  }

  /**
   * Get user ID
   */
  private getUserId(): string {
    // This would get the actual user ID from authentication
    return localStorage.getItem('user_id') || 'anonymous';
  }

  /**
   * Load user preferences from storage
   */
  private loadUserPreferences(): void {
    try {
      const stored = localStorage.getItem('search_preferences');
      if (stored) {
        this.userPreferences = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }

  /**
   * Save user preferences to storage
   */
  private saveUserPreferencesToStorage(): void {
    try {
      localStorage.setItem('search_preferences', JSON.stringify(this.userPreferences));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  }

  /**
   * Load search history from storage
   */
  private loadSearchHistory(): void {
    try {
      const stored = localStorage.getItem('search_history');
      if (stored) {
        this.searchHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load search history:', error);
    }
  }

  /**
   * Save search history to storage
   */
  private saveSearchHistoryToStorage(): void {
    try {
      localStorage.setItem('search_history', JSON.stringify(this.searchHistory));
    } catch (error) {
      console.warn('Failed to save search history:', error);
    }
  }

  /**
   * Save analytics to storage
   */
  private saveAnalyticsToStorage(): void {
    try {
      // Keep only last 100 analytics entries
      const recentAnalytics = this.analytics.slice(-100);
      localStorage.setItem('search_analytics', JSON.stringify(recentAnalytics));
    } catch (error) {
      console.warn('Failed to save analytics:', error);
    }
  }

  /**
   * Load analytics from storage
   */
  private loadAnalyticsFromStorage(): void {
    try {
      const stored = localStorage.getItem('search_analytics');
      if (stored) {
        this.analytics = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load analytics:', error);
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getAutocompleteSuggestions(query: string, limit: number = 5): Promise<string[]> {
    try {
      const response = await this.makeAPICall('/autocomplete', {
        query: query.trim(),
        limit
      });
      return response.suggestions || [];
    } catch (error) {
      console.error('Failed to get autocomplete suggestions:', error);
      return [];
    }
  }

  /**
   * Get search performance metrics
   */
  async getSearchPerformance(): Promise<{
    averageResponseTime: number;
    successRate: number;
    popularQueries: string[];
    topCategories: string[];
  }> {
    try {
      const response = await this.makeAPICall('/performance');
      return response;
    } catch (error) {
      console.error('Failed to get search performance:', error);
      return {
        averageResponseTime: 0,
        successRate: 0,
        popularQueries: [],
        topCategories: []
      };
    }
  }

  /**
   * Export search data
   */
  exportSearchData(): {
    history: string[];
    preferences: Record<string, any>;
    analytics: SearchAnalytics[];
  } {
    return {
      history: this.getSearchHistory(),
      preferences: this.getUserPreferences(),
      analytics: this.analytics
    };
  }

  /**
   * Import search data
   */
  importSearchData(data: {
    history?: string[];
    preferences?: Record<string, any>;
    analytics?: SearchAnalytics[];
  }): void {
    if (data.history) {
      this.searchHistory = data.history;
      this.saveSearchHistoryToStorage();
    }

    if (data.preferences) {
      this.userPreferences = data.preferences;
      this.saveUserPreferencesToStorage();
    }

    if (data.analytics) {
      this.analytics = data.analytics;
      this.saveAnalyticsToStorage();
    }
  }
}

// Export singleton instance
export const advancedSearchService = new AdvancedSearchService();

// Auto-initialize when module loads
if (typeof window !== 'undefined') {
  // Load analytics from storage
  advancedSearchService['loadAnalyticsFromStorage']();
}

/**
 * Production-Grade Search and Filtering Service
 * Advanced search functionality with AI-powered recommendations and comprehensive filtering
 */

import { productionNFTMarketplace } from './production-nft-marketplace';

export interface SearchQuery {
  text: string;
  filters: SearchFilters;
  sort: SearchSort;
  pagination: SearchPagination;
}

export interface SearchFilters {
  collections: string[];
  priceRange: {
    min: number;
    max: number;
  };
  currencies: string[];
  status: string[];
  attributes: Record<string, string[]>;
  creators: string[];
  verified: boolean | null;
  rarity: {
    min: number;
    max: number;
  };
  dateRange: {
    start: number;
    end: number;
  };
}

export interface SearchSort {
  field: 'price' | 'date' | 'name' | 'rarity' | 'relevance';
  order: 'asc' | 'desc';
}

export interface SearchPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface SearchResult {
  nfts: any[];
  collections: any[];
  creators: any[];
  total: number;
  pagination: SearchPagination;
  suggestions: string[];
  filters: SearchFilters;
  sort: SearchSort;
  query: string;
  executionTime: number;
}

export interface SearchSuggestion {
  text: string;
  type: 'collection' | 'creator' | 'attribute' | 'keyword';
  count: number;
  relevance: number;
}

export interface SearchHistory {
  query: string;
  timestamp: number;
  results: number;
  filters: SearchFilters;
}

export interface SearchState {
  currentQuery: SearchQuery;
  results: SearchResult | null;
  suggestions: SearchSuggestion[];
  history: SearchHistory[];
  isLoading: boolean;
  error: string | null;
  lastSearch: number;
  popularSearches: string[];
  trendingCollections: string[];
  trendingCreators: string[];
}

export interface SearchError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: number;
}

export class ProductionSearchService {
  private state: SearchState = {
    currentQuery: {
      text: '',
      filters: this.getDefaultFilters(),
      sort: { field: 'relevance', order: 'desc' },
      pagination: { page: 1, limit: 20, total: 0, pages: 0 }
    },
    results: null,
    suggestions: [],
    history: [],
    isLoading: false,
    error: null,
    lastSearch: 0,
    popularSearches: [],
    trendingCollections: [],
    trendingCreators: []
  };

  private listeners: Set<(state: SearchState) => void> = new Set();
  private searchTimeout: NodeJS.Timeout | null = null;
  private suggestionTimeout: NodeJS.Timeout | null = null;
  private readonly SEARCH_DELAY = 300; // 300ms debounce
  private readonly SUGGESTION_DELAY = 150; // 150ms debounce
  private readonly STORAGE_KEY = 'soladia-search-state';
  private readonly HISTORY_LIMIT = 50;

  constructor() {
    this.loadSearchStateFromStorage();
    this.loadTrendingData();
  }

  /**
   * Perform search
   */
  async search(query: SearchQuery): Promise<SearchResult> {
    try {
      this.setState({ isLoading: true, error: null, currentQuery: query });

      const startTime = Date.now();

      // Get all NFTs from marketplace
      const marketplaceState = productionNFTMarketplace.getState();
      let results = [...marketplaceState.nfts];

      // Apply text search
      if (query.text.trim()) {
        results = this.applyTextSearch(results, query.text);
      }

      // Apply filters
      results = this.applyFilters(results, query.filters);

      // Apply sorting
      results = this.applySorting(results, query.sort);

      // Apply pagination
      const paginatedResults = this.applyPagination(results, query.pagination);

      // Generate suggestions
      const suggestions = await this.generateSuggestions(query.text, results);

      const searchResult: SearchResult = {
        nfts: paginatedResults,
        collections: this.extractCollections(results),
        creators: this.extractCreators(results),
        total: results.length,
        pagination: {
          ...query.pagination,
          total: results.length,
          pages: Math.ceil(results.length / query.pagination.limit)
        },
        suggestions,
        filters: query.filters,
        sort: query.sort,
        query: query.text,
        executionTime: Date.now() - startTime
      };

      // Update state
      this.setState({
        results: searchResult,
        suggestions,
        isLoading: false,
        lastSearch: Date.now()
      });

      // Add to history
      this.addToHistory(query, results.length);

      this.saveSearchStateToStorage();
      this.notifyListeners();

      return searchResult;

    } catch (error) {
      this.handleSearchError(error);
      throw error;
    }
  }

  /**
   * Search with text query
   */
  async searchText(text: string, filters?: Partial<SearchFilters>): Promise<SearchResult> {
    const query: SearchQuery = {
      text,
      filters: { ...this.state.currentQuery.filters, ...filters },
      sort: this.state.currentQuery.sort,
      pagination: this.state.currentQuery.pagination
    };

    return this.search(query);
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(text: string): Promise<SearchSuggestion[]> {
    if (!text.trim()) {
      return this.state.suggestions;
    }

    // Clear existing timeout
    if (this.suggestionTimeout) {
      clearTimeout(this.suggestionTimeout);
    }

    return new Promise((resolve) => {
      this.suggestionTimeout = setTimeout(async () => {
        try {
          const suggestions = await this.generateSuggestions(text);
          this.setState({ suggestions });
          resolve(suggestions);
        } catch (error) {
          console.error('Failed to generate suggestions:', error);
          resolve([]);
        }
      }, this.SUGGESTION_DELAY);
    });
  }

  /**
   * Apply text search
   */
  private applyTextSearch(nfts: any[], text: string): any[] {
    const searchTerms = text.toLowerCase().split(' ').filter(term => term.length > 0);
    
    return nfts.filter(nft => {
      const searchableText = [
        nft.name,
        nft.description,
        nft.collection,
        nft.creator,
        ...nft.attributes.map((attr: any) => `${attr.trait_type}: ${attr.value}`)
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    });
  }

  /**
   * Apply filters
   */
  private applyFilters(nfts: any[], filters: SearchFilters): any[] {
    let filtered = [...nfts];

    // Collection filter
    if (filters.collections.length > 0) {
      filtered = filtered.filter(nft => filters.collections.includes(nft.collection));
    }

    // Price range filter
    if (filters.priceRange.min > 0) {
      filtered = filtered.filter(nft => (nft.price || 0) >= filters.priceRange.min);
    }
    if (filters.priceRange.max > 0) {
      filtered = filtered.filter(nft => (nft.price || 0) <= filters.priceRange.max);
    }

    // Currency filter
    if (filters.currencies.length > 0) {
      filtered = filtered.filter(nft => filters.currencies.includes(nft.currency || 'SOL'));
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(nft => filters.status.includes(nft.status));
    }

    // Attribute filters
    Object.entries(filters.attributes).forEach(([trait, values]) => {
      if (values.length > 0) {
        filtered = filtered.filter(nft =>
          nft.attributes.some((attr: any) =>
            attr.trait_type === trait && values.includes(attr.value.toString())
          )
        );
      }
    });

    // Creator filter
    if (filters.creators.length > 0) {
      filtered = filtered.filter(nft => filters.creators.includes(nft.creator));
    }

    // Verified filter
    if (filters.verified !== null) {
      filtered = filtered.filter(nft => nft.verified === filters.verified);
    }

    // Rarity filter
    if (filters.rarity.min > 0 || filters.rarity.max < 1) {
      filtered = filtered.filter(nft => {
        const rarity = this.calculateRarity(nft);
        return rarity >= filters.rarity.min && rarity <= filters.rarity.max;
      });
    }

    // Date range filter
    if (filters.dateRange.start > 0) {
      filtered = filtered.filter(nft => nft.createdAt >= filters.dateRange.start);
    }
    if (filters.dateRange.end > 0) {
      filtered = filtered.filter(nft => nft.createdAt <= filters.dateRange.end);
    }

    return filtered;
  }

  /**
   * Apply sorting
   */
  private applySorting(nfts: any[], sort: SearchSort): any[] {
    return nfts.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sort.field) {
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'date':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'rarity':
          aValue = this.calculateRarity(a);
          bValue = this.calculateRarity(b);
          break;
        case 'relevance':
          aValue = this.calculateRelevance(a);
          bValue = this.calculateRelevance(b);
          break;
        default:
          return 0;
      }

      if (sort.order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  /**
   * Apply pagination
   */
  private applyPagination(nfts: any[], pagination: SearchPagination): any[] {
    const start = (pagination.page - 1) * pagination.limit;
    const end = start + pagination.limit;
    return nfts.slice(start, end);
  }

  /**
   * Calculate NFT rarity
   */
  private calculateRarity(nft: any): number {
    const marketplaceState = productionNFTMarketplace.getState();
    const totalNFTs = marketplaceState.nfts.length;
    let rarityScore = 0;

    nft.attributes.forEach((attr: any) => {
      const sameTraitCount = marketplaceState.nfts.filter((otherNft: any) =>
        otherNft.attributes.some((otherAttr: any) =>
          otherAttr.trait_type === attr.trait_type && otherAttr.value === attr.value
        )
      ).length;

      rarityScore += (totalNFTs - sameTraitCount) / totalNFTs;
    });

    return rarityScore;
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevance(nft: any): number {
    // Simple relevance calculation based on various factors
    let score = 0;

    // Price factor (lower price = higher relevance for buyers)
    if (nft.price) {
      score += Math.max(0, 1 - (nft.price / 100)); // Normalize to 0-1
    }

    // Recency factor
    const daysSinceCreation = (Date.now() - nft.createdAt) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 1 - (daysSinceCreation / 365)); // Normalize to 0-1

    // Verification factor
    if (nft.verified) {
      score += 0.1;
    }

    // Collection factor (popular collections get higher relevance)
    const collectionCount = productionNFTMarketplace.getState().nfts.filter(
      (n: any) => n.collection === nft.collection
    ).length;
    score += Math.min(0.2, collectionCount / 100); // Cap at 0.2

    return score;
  }

  /**
   * Generate search suggestions
   */
  private async generateSuggestions(text: string, results?: any[]): Promise<SearchSuggestion[]> {
    const suggestions: SearchSuggestion[] = [];
    const marketplaceState = productionNFTMarketplace.getState();

    // Collection suggestions
    const collections = [...new Set(marketplaceState.nfts.map((nft: any) => nft.collection))];
    collections.forEach(collection => {
      if (collection.toLowerCase().includes(text.toLowerCase())) {
        const count = marketplaceState.nfts.filter((nft: any) => nft.collection === collection).length;
        suggestions.push({
          text: collection,
          type: 'collection',
          count,
          relevance: this.calculateSuggestionRelevance(collection, text)
        });
      }
    });

    // Creator suggestions
    const creators = [...new Set(marketplaceState.nfts.map((nft: any) => nft.creator))];
    creators.forEach(creator => {
      if (creator.toLowerCase().includes(text.toLowerCase())) {
        const count = marketplaceState.nfts.filter((nft: any) => nft.creator === creator).length;
        suggestions.push({
          text: creator,
          type: 'creator',
          count,
          relevance: this.calculateSuggestionRelevance(creator, text)
        });
      }
    });

    // Attribute suggestions
    const attributes = new Map<string, Set<string>>();
    marketplaceState.nfts.forEach((nft: any) => {
      nft.attributes.forEach((attr: any) => {
        if (!attributes.has(attr.trait_type)) {
          attributes.set(attr.trait_type, new Set());
        }
        attributes.get(attr.trait_type)!.add(attr.value.toString());
      });
    });

    attributes.forEach((values, trait) => {
      if (trait.toLowerCase().includes(text.toLowerCase())) {
        suggestions.push({
          text: trait,
          type: 'attribute',
          count: values.size,
          relevance: this.calculateSuggestionRelevance(trait, text)
        });
      }
    });

    // Sort by relevance and return top 10
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10);
  }

  /**
   * Calculate suggestion relevance
   */
  private calculateSuggestionRelevance(suggestion: string, query: string): number {
    const suggestionLower = suggestion.toLowerCase();
    const queryLower = query.toLowerCase();

    if (suggestionLower === queryLower) {
      return 1.0;
    }

    if (suggestionLower.startsWith(queryLower)) {
      return 0.8;
    }

    if (suggestionLower.includes(queryLower)) {
      return 0.6;
    }

    // Calculate similarity using simple character matching
    let matches = 0;
    for (let i = 0; i < Math.min(queryLower.length, suggestionLower.length); i++) {
      if (queryLower[i] === suggestionLower[i]) {
        matches++;
      }
    }

    return matches / Math.max(queryLower.length, suggestionLower.length);
  }

  /**
   * Extract collections from results
   */
  private extractCollections(results: any[]): any[] {
    const collections = new Map<string, any>();
    
    results.forEach(nft => {
      if (!collections.has(nft.collection)) {
        collections.set(nft.collection, {
          name: nft.collection,
          count: 0,
          floorPrice: nft.price || 0
        });
      }
      
      const collection = collections.get(nft.collection)!;
      collection.count++;
      if (nft.price && (!collection.floorPrice || nft.price < collection.floorPrice)) {
        collection.floorPrice = nft.price;
      }
    });

    return Array.from(collections.values());
  }

  /**
   * Extract creators from results
   */
  private extractCreators(results: any[]): any[] {
    const creators = new Map<string, any>();
    
    results.forEach(nft => {
      if (!creators.has(nft.creator)) {
        creators.set(nft.creator, {
          address: nft.creator,
          count: 0,
          totalValue: 0
        });
      }
      
      const creator = creators.get(nft.creator)!;
      creator.count++;
      creator.totalValue += nft.price || 0;
    });

    return Array.from(creators.values());
  }

  /**
   * Add search to history
   */
  private addToHistory(query: SearchQuery, resultsCount: number): void {
    const historyItem: SearchHistory = {
      query: query.text,
      timestamp: Date.now(),
      results: resultsCount,
      filters: query.filters
    };

    const newHistory = [historyItem, ...this.state.history]
      .slice(0, this.HISTORY_LIMIT);

    this.setState({ history: newHistory });
  }

  /**
   * Load trending data
   */
  private async loadTrendingData(): Promise<void> {
    try {
      // Load popular searches
      const popularResponse = await fetch('/api/search/popular');
      if (popularResponse.ok) {
        const popularData = await popularResponse.json();
        this.setState({ popularSearches: popularData.searches || [] });
      }

      // Load trending collections
      const collectionsResponse = await fetch('/api/search/trending/collections');
      if (collectionsResponse.ok) {
        const collectionsData = await collectionsResponse.json();
        this.setState({ trendingCollections: collectionsData.collections || [] });
      }

      // Load trending creators
      const creatorsResponse = await fetch('/api/search/trending/creators');
      if (creatorsResponse.ok) {
        const creatorsData = await creatorsResponse.json();
        this.setState({ trendingCreators: creatorsData.creators || [] });
      }
    } catch (error) {
      console.warn('Failed to load trending data:', error);
    }
  }

  /**
   * Get search history
   */
  getSearchHistory(): SearchHistory[] {
    return [...this.state.history];
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    this.setState({ history: [] });
    this.saveSearchStateToStorage();
  }

  /**
   * Get popular searches
   */
  getPopularSearches(): string[] {
    return [...this.state.popularSearches];
  }

  /**
   * Get trending collections
   */
  getTrendingCollections(): string[] {
    return [...this.state.trendingCollections];
  }

  /**
   * Get trending creators
   */
  getTrendingCreators(): string[] {
    return [...this.state.trendingCreators];
  }

  /**
   * Get default filters
   */
  getDefaultFilters(): SearchFilters {
    return {
      collections: [],
      priceRange: { min: 0, max: 0 },
      currencies: [],
      status: [],
      attributes: {},
      creators: [],
      verified: null,
      rarity: { min: 0, max: 1 },
      dateRange: { start: 0, end: 0 }
    };
  }

  /**
   * Get current search state
   */
  getState(): SearchState {
    return { ...this.state };
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: SearchState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Set search filters
   */
  setFilters(filters: Partial<SearchFilters>): void {
    const newFilters = { ...this.state.currentQuery.filters, ...filters };
    this.setState({
      currentQuery: { ...this.state.currentQuery, filters: newFilters }
    });
    this.saveSearchStateToStorage();
  }

  /**
   * Set search sort
   */
  setSort(sort: SearchSort): void {
    this.setState({
      currentQuery: { ...this.state.currentQuery, sort }
    });
    this.saveSearchStateToStorage();
  }

  /**
   * Set search pagination
   */
  setPagination(pagination: Partial<SearchPagination>): void {
    const newPagination = { ...this.state.currentQuery.pagination, ...pagination };
    this.setState({
      currentQuery: { ...this.state.currentQuery, pagination: newPagination }
    });
    this.saveSearchStateToStorage();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.setState({
      currentQuery: {
        ...this.state.currentQuery,
        filters: this.getDefaultFilters()
      }
    });
    this.saveSearchStateToStorage();
  }

  /**
   * Handle search errors
   */
  private handleSearchError(error: any): void {
    const searchError = this.createSearchError(
      error.code || 'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      error.details
    );

    this.setState({
      isLoading: false,
      error: searchError.message,
      lastSearch: Date.now()
    });

    console.error('Search error:', searchError);
  }

  /**
   * Create search error
   */
  private createSearchError(code: string, message: string, details?: any): SearchError {
    return {
      code,
      message,
      details,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Set search state
   */
  private setState(updates: Partial<SearchState>): void {
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
        console.error('Error in search state listener:', error);
      }
    });
  }

  /**
   * Save search state to storage
   */
  private saveSearchStateToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save search state to storage:', error);
    }
  }

  /**
   * Load search state from storage
   */
  private loadSearchStateFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.setState(state);
      }
    } catch (error) {
      console.warn('Failed to load search state from storage:', error);
    }
  }

  /**
   * Clear search data
   */
  clearSearchData(): void {
    this.setState({
      results: null,
      suggestions: [],
      isLoading: false,
      error: null,
      lastSearch: 0
    });
    this.saveSearchStateToStorage();
  }
}

// Export singleton instance
export const productionSearchService = new ProductionSearchService();
export default productionSearchService;

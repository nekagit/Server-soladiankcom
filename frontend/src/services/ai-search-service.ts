/**
 * AI-Powered Search Service
 * Advanced search with machine learning recommendations and semantic understanding
 */

import { productionSearchService } from './production-search-service';
import { productionNFTMarketplace } from './production-nft-marketplace';

export interface AIRecommendation {
  id: string;
  type: 'nft' | 'collection' | 'creator' | 'trending' | 'similar';
  title: string;
  description: string;
  image?: string;
  price?: number;
  currency?: string;
  relevance: number;
  confidence: number;
  metadata: any;
}

export interface AISearchQuery {
  text: string;
  intent: 'buy' | 'sell' | 'browse' | 'discover' | 'research';
  context: {
    userHistory: string[];
    preferences: any;
    budget?: number;
    interests: string[];
  };
  filters: any;
}

export interface AISearchResult {
  results: any[];
  recommendations: AIRecommendation[];
  suggestions: string[];
  insights: {
    trending: string[];
    popular: string[];
    emerging: string[];
    undervalued: string[];
  };
  query: AISearchQuery;
  executionTime: number;
  confidence: number;
}

export interface AISearchState {
  currentQuery: AISearchQuery | null;
  results: AISearchResult | null;
  recommendations: AIRecommendation[];
  userProfile: {
    interests: string[];
    budget: number;
    preferences: any;
    history: string[];
    behavior: any;
  };
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

export interface AISearchError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: number;
}

export class AISearchService {
  private state: AISearchState = {
    currentQuery: null,
    results: null,
    recommendations: [],
    userProfile: {
      interests: [],
      budget: 0,
      preferences: {},
      history: [],
      behavior: {}
    },
    isLoading: false,
    error: null,
    lastUpdated: 0
  };

  private listeners: Set<(state: AISearchState) => void> = new Set();
  private readonly STORAGE_KEY = 'soladia-ai-search-state';
  private readonly RECOMMENDATION_ENGINE_URL = '/api/ai/recommendations';
  private readonly SEARCH_ENGINE_URL = '/api/ai/search';
  private readonly PROFILE_UPDATE_URL = '/api/ai/profile';

  constructor() {
    this.loadAISearchStateFromStorage();
    this.initializeUserProfile();
  }

  /**
   * Perform AI-powered search
   */
  async search(query: AISearchQuery): Promise<AISearchResult> {
    try {
      this.setState({ isLoading: true, error: null, currentQuery: query });

      const startTime = Date.now();

      // Update user profile based on query
      await this.updateUserProfile(query);

      // Perform semantic search
      const semanticResults = await this.performSemanticSearch(query);

      // Generate AI recommendations
      const recommendations = await this.generateRecommendations(query, semanticResults);

      // Generate insights
      const insights = await this.generateInsights(query, semanticResults);

      // Generate suggestions
      const suggestions = await this.generateSuggestions(query, semanticResults);

      const result: AISearchResult = {
        results: semanticResults,
        recommendations,
        suggestions,
        insights,
        query,
        executionTime: Date.now() - startTime,
        confidence: this.calculateConfidence(query, semanticResults)
      };

      this.setState({
        results,
        recommendations,
        isLoading: false,
        lastUpdated: Date.now()
      });

      this.saveAISearchStateToStorage();
      this.notifyListeners();

      return result;

    } catch (error) {
      this.handleAISearchError(error);
      throw error;
    }
  }

  /**
   * Perform semantic search
   */
  private async performSemanticSearch(query: AISearchQuery): Promise<any[]> {
    try {
      const response = await fetch(this.SEARCH_ENGINE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query.text,
          intent: query.intent,
          context: query.context,
          filters: query.filters
        })
      });

      if (!response.ok) {
        throw new Error(`Semantic search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results || [];

    } catch (error) {
      console.error('Semantic search failed:', error);
      // Fallback to regular search
      return this.fallbackSearch(query);
    }
  }

  /**
   * Fallback to regular search
   */
  private async fallbackSearch(query: AISearchQuery): Promise<any[]> {
    const searchQuery = {
      text: query.text,
      filters: query.filters,
      sort: { field: 'relevance' as const, order: 'desc' as const },
      pagination: { page: 1, limit: 50, total: 0, pages: 0 }
    };

    const result = await productionSearchService.search(searchQuery);
    return result.nfts;
  }

  /**
   * Generate AI recommendations
   */
  private async generateRecommendations(query: AISearchQuery, results: any[]): Promise<AIRecommendation[]> {
    try {
      const response = await fetch(this.RECOMMENDATION_ENGINE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query.text,
          intent: query.intent,
          context: query.context,
          results: results.slice(0, 10), // Send top 10 results for context
          userProfile: this.state.userProfile
        })
      });

      if (!response.ok) {
        throw new Error(`Recommendation generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.recommendations || [];

    } catch (error) {
      console.error('Recommendation generation failed:', error);
      return this.generateFallbackRecommendations(query, results);
    }
  }

  /**
   * Generate fallback recommendations
   */
  private generateFallbackRecommendations(query: AISearchQuery, results: any[]): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Similar NFTs based on attributes
    if (results.length > 0) {
      const baseNFT = results[0];
      const similarNFTs = this.findSimilarNFTs(baseNFT, 5);
      
      similarNFTs.forEach(nft => {
        recommendations.push({
          id: `similar_${nft.id}`,
          type: 'similar',
          title: `Similar to ${baseNFT.name}`,
          description: nft.description,
          image: nft.image,
          price: nft.price,
          currency: nft.currency,
          relevance: 0.8,
          confidence: 0.7,
          metadata: { nft, baseNFT }
        });
      });
    }

    // Trending collections
    const trendingCollections = this.getTrendingCollections();
    trendingCollections.forEach(collection => {
      recommendations.push({
        id: `trending_${collection.name}`,
        type: 'trending',
        title: `Trending: ${collection.name}`,
        description: collection.description,
        image: collection.image,
        price: collection.floorPrice,
        currency: 'SOL',
        relevance: 0.7,
        confidence: 0.8,
        metadata: { collection }
      });
    });

    return recommendations.slice(0, 10);
  }

  /**
   * Find similar NFTs
   */
  private findSimilarNFTs(baseNFT: any, limit: number): any[] {
    const marketplaceState = productionNFTMarketplace.getState();
    const allNFTs = marketplaceState.nfts.filter(nft => nft.id !== baseNFT.id);

    const similarities = allNFTs.map(nft => ({
      nft,
      similarity: this.calculateSimilarity(baseNFT, nft)
    }));

    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(item => item.nft);
  }

  /**
   * Calculate similarity between NFTs
   */
  private calculateSimilarity(nft1: any, nft2: any): number {
    let similarity = 0;

    // Collection similarity
    if (nft1.collection === nft2.collection) {
      similarity += 0.3;
    }

    // Creator similarity
    if (nft1.creator === nft2.creator) {
      similarity += 0.2;
    }

    // Price similarity
    const priceDiff = Math.abs((nft1.price || 0) - (nft2.price || 0));
    const maxPrice = Math.max(nft1.price || 0, nft2.price || 0);
    if (maxPrice > 0) {
      similarity += 0.2 * (1 - priceDiff / maxPrice);
    }

    // Attribute similarity
    const attrSimilarity = this.calculateAttributeSimilarity(nft1.attributes, nft2.attributes);
    similarity += 0.3 * attrSimilarity;

    return Math.min(1, similarity);
  }

  /**
   * Calculate attribute similarity
   */
  private calculateAttributeSimilarity(attrs1: any[], attrs2: any[]): number {
    if (attrs1.length === 0 || attrs2.length === 0) return 0;

    let matches = 0;
    const totalAttrs = Math.max(attrs1.length, attrs2.length);

    attrs1.forEach(attr1 => {
      const matchingAttr = attrs2.find(attr2 => 
        attr1.trait_type === attr2.trait_type && attr1.value === attr2.value
      );
      if (matchingAttr) {
        matches++;
      }
    });

    return matches / totalAttrs;
  }

  /**
   * Get trending collections
   */
  private getTrendingCollections(): any[] {
    const marketplaceState = productionNFTMarketplace.getState();
    const collections = marketplaceState.collections;

    return collections
      .sort((a, b) => b.volumeTraded - a.volumeTraded)
      .slice(0, 5);
  }

  /**
   * Generate insights
   */
  private async generateInsights(query: AISearchQuery, results: any[]): Promise<any> {
    const insights = {
      trending: this.getTrendingKeywords(results),
      popular: this.getPopularKeywords(results),
      emerging: this.getEmergingKeywords(results),
      undervalued: this.getUndervaluedNFTs(results)
    };

    return insights;
  }

  /**
   * Get trending keywords
   */
  private getTrendingKeywords(results: any[]): string[] {
    const keywords = new Map<string, number>();
    
    results.forEach(nft => {
      const words = nft.name.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 3) {
          keywords.set(word, (keywords.get(word) || 0) + 1);
        }
      });
    });

    return Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Get popular keywords
   */
  private getPopularKeywords(results: any[]): string[] {
    const keywords = new Map<string, number>();
    
    results.forEach(nft => {
      const words = nft.description.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 3) {
          keywords.set(word, (keywords.get(word) || 0) + 1);
        }
      });
    });

    return Array.from(keywords.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Get emerging keywords
   */
  private getEmergingKeywords(results: any[]): string[] {
    // This would typically analyze recent trends
    // For now, return a subset of trending keywords
    return this.getTrendingKeywords(results).slice(0, 3);
  }

  /**
   * Get undervalued NFTs
   */
  private getUndervaluedNFTs(results: any[]): any[] {
    return results
      .filter(nft => nft.price && nft.price < 1) // Price less than 1 SOL
      .sort((a, b) => (a.price || 0) - (b.price || 0))
      .slice(0, 5);
  }

  /**
   * Generate suggestions
   */
  private async generateSuggestions(query: AISearchQuery, results: any[]): Promise<string[]> {
    const suggestions: string[] = [];

    // Add query variations
    if (query.text.length > 2) {
      suggestions.push(query.text + ' collection');
      suggestions.push(query.text + ' rare');
      suggestions.push(query.text + ' cheap');
    }

    // Add trending suggestions
    const trending = this.getTrendingKeywords(results);
    suggestions.push(...trending.slice(0, 3));

    // Add collection suggestions
    const collections = [...new Set(results.map(nft => nft.collection))];
    suggestions.push(...collections.slice(0, 3));

    return [...new Set(suggestions)].slice(0, 10);
  }

  /**
   * Update user profile
   */
  private async updateUserProfile(query: AISearchQuery): Promise<void> {
    try {
      // Update search history
      const newHistory = [query.text, ...this.state.userProfile.history].slice(0, 50);
      
      // Update interests based on query
      const newInterests = this.extractInterests(query.text);
      const updatedInterests = [...new Set([...this.state.userProfile.interests, ...newInterests])];

      // Update budget if provided
      const budget = query.context.budget || this.state.userProfile.budget;

      const updatedProfile = {
        ...this.state.userProfile,
        history: newHistory,
        interests: updatedInterests,
        budget,
        preferences: { ...this.state.userProfile.preferences, ...query.context.preferences }
      };

      this.setState({ userProfile: updatedProfile });

      // Send profile update to server
      await fetch(this.PROFILE_UPDATE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProfile)
      });

    } catch (error) {
      console.warn('Failed to update user profile:', error);
    }
  }

  /**
   * Extract interests from query text
   */
  private extractInterests(text: string): string[] {
    const interests: string[] = [];
    const words = text.toLowerCase().split(' ');

    // Common NFT interest keywords
    const interestKeywords = [
      'art', 'digital', 'collectible', 'rare', 'unique', 'vintage',
      'modern', 'abstract', 'realistic', 'cartoon', 'anime', 'gaming',
      'sports', 'music', 'celebrity', 'brand', 'luxury', 'fashion'
    ];

    words.forEach(word => {
      if (interestKeywords.includes(word)) {
        interests.push(word);
      }
    });

    return interests;
  }

  /**
   * Calculate search confidence
   */
  private calculateConfidence(query: AISearchQuery, results: any[]): number {
    let confidence = 0.5; // Base confidence

    // Query length factor
    if (query.text.length > 3) {
      confidence += 0.1;
    }

    // Results count factor
    if (results.length > 0) {
      confidence += 0.2;
    }

    // User profile match factor
    const profileMatch = this.calculateProfileMatch(query);
    confidence += 0.2 * profileMatch;

    // Intent clarity factor
    const intentClarity = this.calculateIntentClarity(query);
    confidence += 0.1 * intentClarity;

    return Math.min(1, confidence);
  }

  /**
   * Calculate profile match
   */
  private calculateProfileMatch(query: AISearchQuery): number {
    const interests = this.state.userProfile.interests;
    const queryWords = query.text.toLowerCase().split(' ');
    
    let matches = 0;
    queryWords.forEach(word => {
      if (interests.includes(word)) {
        matches++;
      }
    });

    return matches / Math.max(queryWords.length, 1);
  }

  /**
   * Calculate intent clarity
   */
  private calculateIntentClarity(query: AISearchQuery): number {
    const intentKeywords = {
      buy: ['buy', 'purchase', 'get', 'want', 'need'],
      sell: ['sell', 'list', 'offer', 'price'],
      browse: ['browse', 'look', 'see', 'view', 'explore'],
      discover: ['discover', 'find', 'new', 'trending', 'popular'],
      research: ['research', 'analyze', 'study', 'compare']
    };

    const keywords = intentKeywords[query.intent] || [];
    const queryWords = query.text.toLowerCase().split(' ');
    
    let matches = 0;
    queryWords.forEach(word => {
      if (keywords.includes(word)) {
        matches++;
      }
    });

    return matches / Math.max(keywords.length, 1);
  }

  /**
   * Initialize user profile
   */
  private async initializeUserProfile(): Promise<void> {
    try {
      const response = await fetch('/api/ai/profile');
      if (response.ok) {
        const profile = await response.json();
        this.setState({ userProfile: profile });
      }
    } catch (error) {
      console.warn('Failed to load user profile:', error);
    }
  }

  /**
   * Get current AI search state
   */
  getState(): AISearchState {
    return { ...this.state };
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: AISearchState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get user profile
   */
  getUserProfile(): any {
    return { ...this.state.userProfile };
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: any): Promise<void> {
    const updatedProfile = {
      ...this.state.userProfile,
      preferences: { ...this.state.userProfile.preferences, ...preferences }
    };

    this.setState({ userProfile: updatedProfile });
    this.saveAISearchStateToStorage();
  }

  /**
   * Clear search history
   */
  clearSearchHistory(): void {
    const updatedProfile = {
      ...this.state.userProfile,
      history: []
    };

    this.setState({ userProfile: updatedProfile });
    this.saveAISearchStateToStorage();
  }

  /**
   * Handle AI search errors
   */
  private handleAISearchError(error: any): void {
    const aiSearchError = this.createAISearchError(
      error.code || 'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      error.details
    );

    this.setState({
      isLoading: false,
      error: aiSearchError.message,
      lastUpdated: Date.now()
    });

    console.error('AI search error:', aiSearchError);
  }

  /**
   * Create AI search error
   */
  private createAISearchError(code: string, message: string, details?: any): AISearchError {
    return {
      code,
      message,
      details,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Set AI search state
   */
  private setState(updates: Partial<AISearchState>): void {
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
        console.error('Error in AI search state listener:', error);
      }
    });
  }

  /**
   * Save AI search state to storage
   */
  private saveAISearchStateToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save AI search state to storage:', error);
    }
  }

  /**
   * Load AI search state from storage
   */
  private loadAISearchStateFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.setState(state);
      }
    } catch (error) {
      console.warn('Failed to load AI search state from storage:', error);
    }
  }
}

// Export singleton instance
export const aiSearchService = new AISearchService();
export default aiSearchService;

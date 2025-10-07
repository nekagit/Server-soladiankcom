/**
 * Advanced Search Service Tests
 * Comprehensive test suite for the advanced search functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AdvancedSearchService, SearchFilters, SearchResult, SearchResponse } from '../advanced-search-service';

// Mock fetch
global.fetch = vi.fn();

describe('AdvancedSearchService', () => {
  let searchService: AdvancedSearchService;
  let mockFetch: any;

  beforeEach(() => {
    searchService = new AdvancedSearchService('/api/search', 'test-api-key');
    mockFetch = vi.mocked(fetch);
    
    // Clear localStorage
    localStorage.clear();
    
    // Reset fetch mock
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('search', () => {
    it('should perform search with query and filters', async () => {
      const mockResponse: SearchResponse = {
        results: [
          {
            id: '1',
            title: 'Test NFT',
            description: 'Test description',
            collection: 'Test Collection',
            creator: 'Test Creator',
            price: 2.5,
            priceFormatted: '2.5 SOL',
            image: '/test-image.jpg',
            category: 'art',
            rarity: 'rare',
            status: 'buy-now',
            likes: 100,
            views: 500,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z'
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1,
        facets: {
          categories: [],
          status: [],
          rarity: [],
          priceRanges: [],
          collections: [],
          creators: []
        },
        suggestions: {
          trending: [],
          collections: [],
          creators: [],
          related: []
        },
        recommendations: {
          similar: [],
          popular: [],
          trending: [],
          recentlyViewed: []
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const filters: SearchFilters = {
        categories: ['art'],
        status: ['buy-now'],
        page: 1,
        limit: 20
      };

      const result = await searchService.search('test query', filters);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/search'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle search errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(searchService.search('test query')).rejects.toThrow('Search failed. Please try again.');
    });

    it('should track search analytics', async () => {
      const mockResponse: SearchResponse = {
        results: [],
        total: 0,
        page: 1,
        totalPages: 0,
        facets: {
          categories: [],
          status: [],
          rarity: [],
          priceRanges: [],
          collections: [],
          creators: []
        },
        suggestions: {
          trending: [],
          collections: [],
          creators: [],
          related: []
        },
        recommendations: {
          similar: [],
          popular: [],
          trending: [],
          recentlyViewed: []
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await searchService.search('test query');

      // Check that analytics were tracked
      const analytics = searchService['analytics'];
      expect(analytics).toHaveLength(1);
      expect(analytics[0].query).toBe('test query');
      expect(analytics[0].resultsCount).toBe(0);
    });

    it('should update search history', async () => {
      const mockResponse: SearchResponse = {
        results: [],
        total: 0,
        page: 1,
        totalPages: 0,
        facets: {
          categories: [],
          status: [],
          rarity: [],
          priceRanges: [],
          collections: [],
          creators: []
        },
        suggestions: {
          trending: [],
          collections: [],
          creators: [],
          related: []
        },
        recommendations: {
          similar: [],
          popular: [],
          trending: [],
          recentlyViewed: []
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await searchService.search('test query 1');
      await searchService.search('test query 2');

      const history = searchService.getSearchHistory();
      expect(history).toEqual(['test query 2', 'test query 1']);
    });
  });

  describe('getSuggestions', () => {
    it('should get search suggestions', async () => {
      const mockSuggestions = {
        trending: [
          {
            id: '1',
            title: 'Trending NFT',
            subtitle: 'Collection',
            type: 'collection' as const
          }
        ],
        collections: [],
        creators: [],
        related: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuggestions)
      });

      const result = await searchService.getSuggestions('test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/suggestions'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockSuggestions);
    });

    it('should handle suggestions errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchService.getSuggestions('test');

      expect(result).toEqual({
        trending: [],
        collections: [],
        creators: [],
        related: []
      });
    });
  });

  describe('getRecommendations', () => {
    it('should get search recommendations', async () => {
      const mockRecommendations = {
        similar: [],
        popular: [],
        trending: [],
        recentlyViewed: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRecommendations)
      });

      const result = await searchService.getRecommendations();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/recommendations'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockRecommendations);
    });

    it('should handle recommendations errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchService.getRecommendations();

      expect(result).toEqual({
        similar: [],
        popular: [],
        trending: [],
        recentlyViewed: []
      });
    });
  });

  describe('getFacets', () => {
    it('should get search facets', async () => {
      const mockFacets = {
        categories: [
          { value: 'art', label: 'Art', count: 100 }
        ],
        status: [],
        rarity: [],
        priceRanges: [],
        collections: [],
        creators: []
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockFacets)
      });

      const result = await searchService.getFacets('test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/facets'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockFacets);
    });

    it('should handle facets errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchService.getFacets('test');

      expect(result).toEqual({
        categories: [],
        status: [],
        rarity: [],
        priceRanges: [],
        collections: [],
        creators: []
      });
    });
  });

  describe('getTrendingSearches', () => {
    it('should get trending searches', async () => {
      const mockTrending = {
        searches: ['crypto punks', 'bored apes', 'art blocks']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTrending)
      });

      const result = await searchService.getTrendingSearches();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/trending'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(['crypto punks', 'bored apes', 'art blocks']);
    });

    it('should handle trending searches errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchService.getTrendingSearches();

      expect(result).toEqual([]);
    });
  });

  describe('getPopularCollections', () => {
    it('should get popular collections', async () => {
      const mockCollections = {
        collections: [
          {
            id: '1',
            title: 'Popular Collection',
            subtitle: '1,000 items',
            type: 'collection' as const
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCollections)
      });

      const result = await searchService.getPopularCollections();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/collections/popular'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockCollections.collections);
    });

    it('should handle popular collections errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchService.getPopularCollections();

      expect(result).toEqual([]);
    });
  });

  describe('getPopularCreators', () => {
    it('should get popular creators', async () => {
      const mockCreators = {
        creators: [
          {
            id: '1',
            title: 'Popular Creator',
            subtitle: '500 items',
            type: 'creator' as const
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCreators)
      });

      const result = await searchService.getPopularCreators();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/creators/popular'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockCreators.creators);
    });

    it('should handle popular creators errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchService.getPopularCreators();

      expect(result).toEqual([]);
    });
  });

  describe('searchCollections', () => {
    it('should search collections', async () => {
      const mockCollections = {
        collections: [
          {
            id: '1',
            title: 'Search Result Collection',
            subtitle: '100 items',
            type: 'collection' as const
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCollections)
      });

      const result = await searchService.searchCollections('test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/collections/search'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockCollections.collections);
    });

    it('should handle search collections errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchService.searchCollections('test');

      expect(result).toEqual([]);
    });
  });

  describe('searchCreators', () => {
    it('should search creators', async () => {
      const mockCreators = {
        creators: [
          {
            id: '1',
            title: 'Search Result Creator',
            subtitle: '50 items',
            type: 'creator' as const
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCreators)
      });

      const result = await searchService.searchCreators('test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/creators/search'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockCreators.creators);
    });

    it('should handle search creators errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchService.searchCreators('test');

      expect(result).toEqual([]);
    });
  });

  describe('getSimilarNFTs', () => {
    it('should get similar NFTs', async () => {
      const mockResults = {
        results: [
          {
            id: '2',
            title: 'Similar NFT',
            description: 'Similar description',
            collection: 'Similar Collection',
            creator: 'Similar Creator',
            price: 3.0,
            priceFormatted: '3.0 SOL',
            image: '/similar-image.jpg',
            category: 'art',
            rarity: 'rare',
            status: 'buy-now',
            likes: 50,
            views: 200,
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z'
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResults)
      });

      const result = await searchService.getSimilarNFTs('1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/similar'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockResults.results);
    });

    it('should handle similar NFTs errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchService.getSimilarNFTs('1');

      expect(result).toEqual([]);
    });
  });

  describe('getSearchAnalytics', () => {
    it('should get search analytics', async () => {
      const mockAnalytics = {
        analytics: [
          {
            query: 'test query',
            filters: {},
            resultsCount: 10,
            clickThroughRate: 0.5,
            timeSpent: 30,
            userSatisfaction: 0.8
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAnalytics)
      });

      const result = await searchService.getSearchAnalytics();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/analytics'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockAnalytics.analytics);
    });

    it('should handle search analytics errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchService.getSearchAnalytics();

      expect(result).toEqual([]);
    });
  });

  describe('saveUserPreferences', () => {
    it('should save user preferences', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      const preferences = { theme: 'dark', language: 'en' };
      await searchService.saveUserPreferences(preferences);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/preferences'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            user_id: 'anonymous',
            preferences
          })
        })
      );

      expect(searchService.getUserPreferences()).toEqual(preferences);
    });

    it('should handle save preferences errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const preferences = { theme: 'dark' };
      await searchService.saveUserPreferences(preferences);

      // Should not throw error
      expect(searchService.getUserPreferences()).toEqual(preferences);
    });
  });

  describe('getUserPreferences', () => {
    it('should return user preferences', () => {
      const preferences = { theme: 'dark', language: 'en' };
      searchService['userPreferences'] = preferences;

      expect(searchService.getUserPreferences()).toEqual(preferences);
    });
  });

  describe('getSearchHistory', () => {
    it('should return search history', () => {
      const history = ['query 1', 'query 2', 'query 3'];
      searchService['searchHistory'] = history;

      expect(searchService.getSearchHistory()).toEqual(history);
    });
  });

  describe('clearSearchHistory', () => {
    it('should clear search history', () => {
      searchService['searchHistory'] = ['query 1', 'query 2'];
      searchService.clearSearchHistory();

      expect(searchService.getSearchHistory()).toEqual([]);
    });
  });

  describe('trackSearchClick', () => {
    it('should track search click', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await searchService.trackSearchClick('result-1', 'test query', 1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/track/click'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            result_id: 'result-1',
            query: 'test query',
            position: 1,
            user_id: 'anonymous',
            timestamp: expect.any(String)
          })
        })
      );
    });

    it('should handle track click errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(searchService.trackSearchClick('result-1', 'test query', 1)).resolves.not.toThrow();
    });
  });

  describe('trackSearchImpression', () => {
    it('should track search impression', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({})
      });

      await searchService.trackSearchImpression('result-1', 'test query', 1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/track/impression'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            result_id: 'result-1',
            query: 'test query',
            position: 1,
            user_id: 'anonymous',
            timestamp: expect.any(String)
          })
        })
      );
    });

    it('should handle track impression errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(searchService.trackSearchImpression('result-1', 'test query', 1)).resolves.not.toThrow();
    });
  });

  describe('getAutocompleteSuggestions', () => {
    it('should get autocomplete suggestions', async () => {
      const mockSuggestions = {
        suggestions: ['crypto', 'crypto punks', 'crypto art']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuggestions)
      });

      const result = await searchService.getAutocompleteSuggestions('crypto');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/autocomplete'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockSuggestions.suggestions);
    });

    it('should handle autocomplete errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchService.getAutocompleteSuggestions('crypto');

      expect(result).toEqual([]);
    });
  });

  describe('getSearchPerformance', () => {
    it('should get search performance metrics', async () => {
      const mockPerformance = {
        averageResponseTime: 150,
        successRate: 0.95,
        popularQueries: ['crypto punks', 'bored apes'],
        topCategories: ['art', 'gaming']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPerformance)
      });

      const result = await searchService.getSearchPerformance();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search/performance'),
        expect.objectContaining({
          method: 'GET'
        })
      );

      expect(result).toEqual(mockPerformance);
    });

    it('should handle performance errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await searchService.getSearchPerformance();

      expect(result).toEqual({
        averageResponseTime: 0,
        successRate: 0,
        popularQueries: [],
        topCategories: []
      });
    });
  });

  describe('exportSearchData', () => {
    it('should export search data', () => {
      const history = ['query 1', 'query 2'];
      const preferences = { theme: 'dark' };
      const analytics = [
        {
          query: 'test',
          filters: {},
          resultsCount: 10,
          clickThroughRate: 0.5,
          timeSpent: 30,
          userSatisfaction: 0.8
        }
      ];

      searchService['searchHistory'] = history;
      searchService['userPreferences'] = preferences;
      searchService['analytics'] = analytics;

      const result = searchService.exportSearchData();

      expect(result).toEqual({
        history,
        preferences,
        analytics
      });
    });
  });

  describe('importSearchData', () => {
    it('should import search data', () => {
      const data = {
        history: ['imported query 1', 'imported query 2'],
        preferences: { theme: 'light' },
        analytics: [
          {
            query: 'imported test',
            filters: {},
            resultsCount: 5,
            clickThroughRate: 0.3,
            timeSpent: 20,
            userSatisfaction: 0.7
          }
        ]
      };

      searchService.importSearchData(data);

      expect(searchService.getSearchHistory()).toEqual(data.history);
      expect(searchService.getUserPreferences()).toEqual(data.preferences);
    });
  });

  describe('buildSearchParams', () => {
    it('should build search parameters correctly', () => {
      const filters: SearchFilters = {
        categories: ['art', 'gaming'],
        status: ['buy-now'],
        rarity: ['rare'],
        priceMin: 1.0,
        priceMax: 10.0,
        collections: ['collection-1'],
        creators: ['creator-1'],
        sort: 'price-low',
        page: 2,
        limit: 50
      };

      const params = searchService['buildSearchParams']('test query', filters);

      expect(params).toEqual({
        q: 'test query',
        page: 2,
        limit: 50,
        sort: 'price-low',
        user_id: 'anonymous',
        categories: 'art,gaming',
        status: 'buy-now',
        rarity: 'rare',
        price_min: 1.0,
        price_max: 10.0,
        collections: 'collection-1',
        creators: 'creator-1'
      });
    });

    it('should handle empty filters', () => {
      const params = searchService['buildSearchParams']('test query', {});

      expect(params).toEqual({
        q: 'test query',
        page: 1,
        limit: 20,
        sort: 'relevance',
        user_id: 'anonymous'
      });
    });
  });

  describe('localStorage integration', () => {
    it('should save and load user preferences from localStorage', () => {
      const preferences = { theme: 'dark', language: 'en' };
      
      // Save preferences
      searchService['userPreferences'] = preferences;
      searchService['saveUserPreferencesToStorage']();

      // Create new service instance
      const newService = new AdvancedSearchService();
      
      // Check that preferences are loaded
      expect(newService.getUserPreferences()).toEqual(preferences);
    });

    it('should save and load search history from localStorage', () => {
      const history = ['query 1', 'query 2', 'query 3'];
      
      // Save history
      searchService['searchHistory'] = history;
      searchService['saveSearchHistoryToStorage']();

      // Create new service instance
      const newService = new AdvancedSearchService();
      
      // Check that history is loaded
      expect(newService.getSearchHistory()).toEqual(history);
    });
  });
});

/**
 * AI Services Integration
 * Centralized integration for all AI-powered services
 */

import { AIRecommendationsService } from './ai-recommendations-service';
import { PredictiveAnalyticsService } from './predictive-analytics-service';
import { AISearchService } from './ai-search-service';
import { FraudDetectionService } from './fraud-detection-service';

export interface AIServicesConfig {
  apiBaseUrl: string;
  apiKey: string;
  modelVersion: string;
  enableLogging: boolean;
  enableCaching: boolean;
  cacheTimeout: number;
}

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'product' | 'user' | 'content';
  score: number;
  reason: string;
  metadata: Record<string, any>;
}

export interface PredictiveInsight {
  id: string;
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  timeframe: string;
  recommendations: string[];
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: string;
  score: number;
  category: string;
  metadata: Record<string, any>;
}

export interface FraudAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  riskScore: number;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  createdAt: string;
  metadata: Record<string, any>;
}

export class AIServicesIntegration {
  private config: AIServicesConfig;
  private recommendationsService: AIRecommendationsService;
  private analyticsService: PredictiveAnalyticsService;
  private searchService: AISearchService;
  private fraudDetectionService: FraudDetectionService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();

  constructor(config: AIServicesConfig) {
    this.config = config;
    this.recommendationsService = new AIRecommendationsService(config);
    this.analyticsService = new PredictiveAnalyticsService(config);
    this.searchService = new AISearchService(config);
    this.fraudDetectionService = new FraudDetectionService(config);
  }

  /**
   * Get AI-powered recommendations
   */
  async getRecommendations(
    userId: string,
    type: 'products' | 'users' | 'content' = 'products',
    limit: number = 20
  ): Promise<AIRecommendation[]> {
    const cacheKey = `recommendations_${userId}_${type}_${limit}`;
    
    if (this.config.enableCaching && this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      const recommendations = await this.recommendationsService.getRecommendations(
        userId,
        type,
        limit
      );

      if (this.config.enableCaching) {
        this.cache.set(cacheKey, {
          data: recommendations,
          timestamp: Date.now()
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Failed to get AI recommendations:', error);
      throw error;
    }
  }

  /**
   * Get predictive analytics insights
   */
  async getPredictiveInsights(
    timeframe: '7d' | '30d' | '90d' | '1y' = '30d',
    category?: string
  ): Promise<PredictiveInsight[]> {
    const cacheKey = `insights_${timeframe}_${category || 'all'}`;
    
    if (this.config.enableCaching && this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      const insights = await this.analyticsService.getInsights(timeframe, category);

      if (this.config.enableCaching) {
        this.cache.set(cacheKey, {
          data: insights,
          timestamp: Date.now()
        });
      }

      return insights;
    } catch (error) {
      console.error('Failed to get predictive insights:', error);
      throw error;
    }
  }

  /**
   * Perform AI-powered search
   */
  async search(
    query: string,
    filters: Record<string, any> = {},
    limit: number = 20
  ): Promise<SearchResult[]> {
    const cacheKey = `search_${query}_${JSON.stringify(filters)}_${limit}`;
    
    if (this.config.enableCaching && this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      const results = await this.searchService.search(query, filters, limit);

      if (this.config.enableCaching) {
        this.cache.set(cacheKey, {
          data: results,
          timestamp: Date.now()
        });
      }

      return results;
    } catch (error) {
      console.error('Failed to perform AI search:', error);
      throw error;
    }
  }

  /**
   * Get fraud detection alerts
   */
  async getFraudAlerts(
    severity?: 'low' | 'medium' | 'high' | 'critical',
    status?: 'open' | 'investigating' | 'resolved' | 'false_positive',
    limit: number = 50
  ): Promise<FraudAlert[]> {
    const cacheKey = `fraud_alerts_${severity || 'all'}_${status || 'all'}_${limit}`;
    
    if (this.config.enableCaching && this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data;
    }

    try {
      const alerts = await this.fraudDetectionService.getAlerts(severity, status, limit);

      if (this.config.enableCaching) {
        this.cache.set(cacheKey, {
          data: alerts,
          timestamp: Date.now()
        });
      }

      return alerts;
    } catch (error) {
      console.error('Failed to get fraud alerts:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive AI dashboard data
   */
  async getDashboardData(): Promise<{
    recommendations: AIRecommendation[];
    insights: PredictiveInsight[];
    recentAlerts: FraudAlert[];
    searchTrends: any[];
    performanceMetrics: any;
  }> {
    try {
      const [recommendations, insights, recentAlerts, searchTrends, performanceMetrics] = await Promise.all([
        this.getRecommendations('current_user', 'products', 10),
        this.getPredictiveInsights('30d'),
        this.getFraudAlerts(undefined, 'open', 10),
        this.getSearchTrends(),
        this.getPerformanceMetrics()
      ]);

      return {
        recommendations,
        insights,
        recentAlerts,
        searchTrends,
        performanceMetrics
      };
    } catch (error) {
      console.error('Failed to get dashboard data:', error);
      throw error;
    }
  }

  /**
   * Train AI models
   */
  async trainModels(): Promise<{
    recommendations: boolean;
    analytics: boolean;
    search: boolean;
    fraudDetection: boolean;
  }> {
    try {
      const [recommendations, analytics, search, fraudDetection] = await Promise.all([
        this.recommendationsService.trainModel(),
        this.analyticsService.trainModel(),
        this.searchService.trainModel(),
        this.fraudDetectionService.trainModel()
      ]);

      return {
        recommendations,
        analytics,
        search,
        fraudDetection
      };
    } catch (error) {
      console.error('Failed to train AI models:', error);
      throw error;
    }
  }

  /**
   * Get AI model performance metrics
   */
  async getModelPerformance(): Promise<{
    recommendations: any;
    analytics: any;
    search: any;
    fraudDetection: any;
  }> {
    try {
      const [recommendations, analytics, search, fraudDetection] = await Promise.all([
        this.recommendationsService.getModelPerformance(),
        this.analyticsService.getModelPerformance(),
        this.searchService.getModelPerformance(),
        this.fraudDetectionService.getModelPerformance()
      ]);

      return {
        recommendations,
        analytics,
        search,
        fraudDetection
      };
    } catch (error) {
      console.error('Failed to get model performance:', error);
      throw error;
    }
  }

  /**
   * Generate AI-powered report
   */
  async generateReport(
    type: 'comprehensive' | 'recommendations' | 'analytics' | 'fraud' | 'search',
    timeframe: string,
    format: 'pdf' | 'excel' | 'csv' | 'json' = 'pdf'
  ): Promise<Blob> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/ai/reports/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          type,
          timeframe,
          format,
          modelVersion: this.config.modelVersion
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Failed to generate AI report:', error);
      throw error;
    }
  }

  /**
   * Get search trends
   */
  private async getSearchTrends(): Promise<any[]> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/ai/search/trends`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get search trends: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get search trends:', error);
      return [];
    }
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<any> {
    try {
      const response = await fetch(`${this.config.apiBaseUrl}/api/ai/performance`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get performance metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {};
    }
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    return Date.now() - cached.timestamp < this.config.cacheTimeout;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitRate: 0 // This would need to be tracked separately
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AIServicesConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AIServicesConfig {
    return { ...this.config };
  }

  /**
   * Health check for all AI services
   */
  async healthCheck(): Promise<{
    recommendations: boolean;
    analytics: boolean;
    search: boolean;
    fraudDetection: boolean;
    overall: boolean;
  }> {
    try {
      const [recommendations, analytics, search, fraudDetection] = await Promise.allSettled([
        this.recommendationsService.healthCheck(),
        this.analyticsService.healthCheck(),
        this.searchService.healthCheck(),
        this.fraudDetectionService.healthCheck()
      ]);

      const results = {
        recommendations: recommendations.status === 'fulfilled' && recommendations.value,
        analytics: analytics.status === 'fulfilled' && analytics.value,
        search: search.status === 'fulfilled' && search.value,
        fraudDetection: fraudDetection.status === 'fulfilled' && fraudDetection.value,
        overall: false
      };

      results.overall = Object.values(results).every(status => status === true);

      return results;
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        recommendations: false,
        analytics: false,
        search: false,
        fraudDetection: false,
        overall: false
      };
    }
  }
}

// Default configuration
export const defaultAIConfig: AIServicesConfig = {
  apiBaseUrl: process.env.AI_API_BASE_URL || 'http://localhost:8000',
  apiKey: process.env.AI_API_KEY || '',
  modelVersion: '1.0.0',
  enableLogging: true,
  enableCaching: true,
  cacheTimeout: 5 * 60 * 1000, // 5 minutes
};

// Create singleton instance
export const aiServices = new AIServicesIntegration(defaultAIConfig);

// Export individual services for direct access
export {
  AIRecommendationsService,
  PredictiveAnalyticsService,
  AISearchService,
  FraudDetectionService
};



/**
 * Copy Trading Service
 * Social trading and portfolio sharing features
 */

import { productionWalletService } from './production-wallet-service';
import { productionAuthService } from './production-auth-service';
import { socialFeaturesService } from './social-features-service';

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  creator: string;
  creatorName: string;
  creatorAvatar: string;
  type: 'manual' | 'automated' | 'hybrid';
  status: 'active' | 'paused' | 'stopped' | 'completed';
  performance: {
    totalReturn: number;
    totalReturnPercentage: number;
    winRate: number;
    maxDrawdown: number;
    sharpeRatio: number;
    totalTrades: number;
    profitableTrades: number;
    averageTradeSize: number;
    bestTrade: number;
    worstTrade: number;
  };
  risk: {
    level: 'low' | 'medium' | 'high';
    maxPositionSize: number;
    stopLoss: number;
    takeProfit: number;
    maxDailyLoss: number;
  };
  followers: number;
  totalCopied: number;
  isPublic: boolean;
  isFollowing: boolean;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface CopyTrade {
  id: string;
  strategyId: string;
  follower: string;
  originalTrade: {
    id: string;
    type: 'buy' | 'sell';
    nftId: string;
    price: number;
    currency: string;
    timestamp: number;
  };
  copiedTrade: {
    id: string;
    type: 'buy' | 'sell';
    nftId: string;
    price: number;
    currency: string;
    timestamp: number;
    status: 'pending' | 'executed' | 'failed' | 'cancelled';
  };
  performance: {
    entryPrice: number;
    exitPrice?: number;
    profitLoss: number;
    profitLossPercentage: number;
    holdingPeriod: number;
  };
  status: 'active' | 'completed' | 'stopped' | 'failed';
  createdAt: number;
  completedAt?: number;
}

export interface Portfolio {
  id: string;
  name: string;
  description: string;
  owner: string;
  ownerName: string;
  ownerAvatar: string;
  isPublic: boolean;
  isFollowing: boolean;
  nfts: PortfolioNFT[];
  performance: {
    totalValue: number;
    totalCost: number;
    profitLoss: number;
    profitLossPercentage: number;
    totalReturn: number;
    totalReturnPercentage: number;
    winRate: number;
    sharpeRatio: number;
  };
  followers: number;
  totalCopied: number;
  createdAt: number;
  updatedAt: number;
  tags: string[];
}

export interface PortfolioNFT {
  id: string;
  nftId: string;
  name: string;
  image: string;
  collection: string;
  entryPrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
  holdingPeriod: number;
  addedAt: number;
}

export interface SocialTradingState {
  strategies: TradingStrategy[];
  copyTrades: CopyTrade[];
  portfolios: Portfolio[];
  myStrategies: TradingStrategy[];
  myPortfolios: Portfolio[];
  followingStrategies: TradingStrategy[];
  followingPortfolios: Portfolio[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
}

export interface SocialTradingError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: number;
}

export class CopyTradingService {
  private state: SocialTradingState = {
    strategies: [],
    copyTrades: [],
    portfolios: [],
    myStrategies: [],
    myPortfolios: [],
    followingStrategies: [],
    followingPortfolios: [],
    isLoading: false,
    error: null,
    lastUpdated: 0
  };

  private listeners: Set<(state: SocialTradingState) => void> = new Set();
  private readonly STORAGE_KEY = 'soladia-copy-trading-state';
  private readonly STRATEGIES_URL = '/api/copy-trading/strategies';
  private readonly PORTFOLIOS_URL = '/api/copy-trading/portfolios';
  private readonly COPY_TRADES_URL = '/api/copy-trading/copy-trades';

  constructor() {
    this.loadCopyTradingStateFromStorage();
    this.initializeCopyTrading();
  }

  /**
   * Initialize copy trading
   */
  private async initializeCopyTrading(): Promise<void> {
    try {
      if (productionAuthService.isAuthenticated()) {
        await this.loadStrategies();
        await this.loadPortfolios();
        await this.loadMyStrategies();
        await this.loadMyPortfolios();
        await this.loadFollowingStrategies();
        await this.loadFollowingPortfolios();
        await this.loadCopyTrades();
      }
    } catch (error) {
      console.error('Failed to initialize copy trading:', error);
    }
  }

  /**
   * Load trading strategies
   */
  async loadStrategies(): Promise<TradingStrategy[]> {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await fetch(this.STRATEGIES_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load strategies: ${response.statusText}`);
      }

      const data = await response.json();
      const strategies = data.strategies || [];

      this.setState({ strategies, isLoading: false });
      this.saveCopyTradingStateToStorage();
      this.notifyListeners();

      return strategies;

    } catch (error) {
      this.handleCopyTradingError(error);
      return [];
    }
  }

  /**
   * Load portfolios
   */
  async loadPortfolios(): Promise<Portfolio[]> {
    try {
      const response = await fetch(this.PORTFOLIOS_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load portfolios: ${response.statusText}`);
      }

      const data = await response.json();
      const portfolios = data.portfolios || [];

      this.setState({ portfolios });
      this.saveCopyTradingStateToStorage();

      return portfolios;

    } catch (error) {
      this.handleCopyTradingError(error);
      return [];
    }
  }

  /**
   * Load my strategies
   */
  async loadMyStrategies(): Promise<TradingStrategy[]> {
    try {
      const response = await fetch(`${this.STRATEGIES_URL}/my`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load my strategies: ${response.statusText}`);
      }

      const data = await response.json();
      const strategies = data.strategies || [];

      this.setState({ myStrategies: strategies });
      this.saveCopyTradingStateToStorage();

      return strategies;

    } catch (error) {
      this.handleCopyTradingError(error);
      return [];
    }
  }

  /**
   * Load my portfolios
   */
  async loadMyPortfolios(): Promise<Portfolio[]> {
    try {
      const response = await fetch(`${this.PORTFOLIOS_URL}/my`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load my portfolios: ${response.statusText}`);
      }

      const data = await response.json();
      const portfolios = data.portfolios || [];

      this.setState({ myPortfolios: portfolios });
      this.saveCopyTradingStateToStorage();

      return portfolios;

    } catch (error) {
      this.handleCopyTradingError(error);
      return [];
    }
  }

  /**
   * Load following strategies
   */
  async loadFollowingStrategies(): Promise<TradingStrategy[]> {
    try {
      const response = await fetch(`${this.STRATEGIES_URL}/following`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load following strategies: ${response.statusText}`);
      }

      const data = await response.json();
      const strategies = data.strategies || [];

      this.setState({ followingStrategies: strategies });
      this.saveCopyTradingStateToStorage();

      return strategies;

    } catch (error) {
      this.handleCopyTradingError(error);
      return [];
    }
  }

  /**
   * Load following portfolios
   */
  async loadFollowingPortfolios(): Promise<Portfolio[]> {
    try {
      const response = await fetch(`${this.PORTFOLIOS_URL}/following`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load following portfolios: ${response.statusText}`);
      }

      const data = await response.json();
      const portfolios = data.portfolios || [];

      this.setState({ followingPortfolios: portfolios });
      this.saveCopyTradingStateToStorage();

      return portfolios;

    } catch (error) {
      this.handleCopyTradingError(error);
      return [];
    }
  }

  /**
   * Load copy trades
   */
  async loadCopyTrades(): Promise<CopyTrade[]> {
    try {
      const response = await fetch(this.COPY_TRADES_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load copy trades: ${response.statusText}`);
      }

      const data = await response.json();
      const copyTrades = data.copyTrades || [];

      this.setState({ copyTrades });
      this.saveCopyTradingStateToStorage();

      return copyTrades;

    } catch (error) {
      this.handleCopyTradingError(error);
      return [];
    }
  }

  /**
   * Create trading strategy
   */
  async createStrategy(strategy: Omit<TradingStrategy, 'id' | 'createdAt' | 'updatedAt' | 'followers' | 'totalCopied' | 'isFollowing'>): Promise<TradingStrategy | null> {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await fetch(this.STRATEGIES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(strategy)
      });

      if (!response.ok) {
        throw new Error(`Failed to create strategy: ${response.statusText}`);
      }

      const data = await response.json();
      const newStrategy: TradingStrategy = {
        ...strategy,
        id: data.strategy.id,
        followers: 0,
        totalCopied: 0,
        isFollowing: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.setState({
        myStrategies: [...this.state.myStrategies, newStrategy],
        isLoading: false
      });

      this.saveCopyTradingStateToStorage();
      this.notifyListeners();

      return newStrategy;

    } catch (error) {
      this.handleCopyTradingError(error);
      return null;
    }
  }

  /**
   * Create portfolio
   */
  async createPortfolio(portfolio: Omit<Portfolio, 'id' | 'createdAt' | 'updatedAt' | 'followers' | 'totalCopied' | 'isFollowing'>): Promise<Portfolio | null> {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await fetch(this.PORTFOLIOS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(portfolio)
      });

      if (!response.ok) {
        throw new Error(`Failed to create portfolio: ${response.statusText}`);
      }

      const data = await response.json();
      const newPortfolio: Portfolio = {
        ...portfolio,
        id: data.portfolio.id,
        followers: 0,
        totalCopied: 0,
        isFollowing: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      this.setState({
        myPortfolios: [...this.state.myPortfolios, newPortfolio],
        isLoading: false
      });

      this.saveCopyTradingStateToStorage();
      this.notifyListeners();

      return newPortfolio;

    } catch (error) {
      this.handleCopyTradingError(error);
      return null;
    }
  }

  /**
   * Follow strategy
   */
  async followStrategy(strategyId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.STRATEGIES_URL}/${strategyId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to follow strategy: ${response.statusText}`);
      }

      // Update strategy in state
      const updatedStrategies = this.state.strategies.map(strategy =>
        strategy.id === strategyId
          ? { ...strategy, isFollowing: true, followers: strategy.followers + 1 }
          : strategy
      );

      this.setState({ strategies: updatedStrategies });
      this.saveCopyTradingStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleCopyTradingError(error);
      return false;
    }
  }

  /**
   * Unfollow strategy
   */
  async unfollowStrategy(strategyId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.STRATEGIES_URL}/${strategyId}/unfollow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to unfollow strategy: ${response.statusText}`);
      }

      // Update strategy in state
      const updatedStrategies = this.state.strategies.map(strategy =>
        strategy.id === strategyId
          ? { ...strategy, isFollowing: false, followers: Math.max(0, strategy.followers - 1) }
          : strategy
      );

      this.setState({ strategies: updatedStrategies });
      this.saveCopyTradingStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleCopyTradingError(error);
      return false;
    }
  }

  /**
   * Follow portfolio
   */
  async followPortfolio(portfolioId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.PORTFOLIOS_URL}/${portfolioId}/follow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to follow portfolio: ${response.statusText}`);
      }

      // Update portfolio in state
      const updatedPortfolios = this.state.portfolios.map(portfolio =>
        portfolio.id === portfolioId
          ? { ...portfolio, isFollowing: true, followers: portfolio.followers + 1 }
          : portfolio
      );

      this.setState({ portfolios: updatedPortfolios });
      this.saveCopyTradingStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleCopyTradingError(error);
      return false;
    }
  }

  /**
   * Unfollow portfolio
   */
  async unfollowPortfolio(portfolioId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.PORTFOLIOS_URL}/${portfolioId}/unfollow`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to unfollow portfolio: ${response.statusText}`);
      }

      // Update portfolio in state
      const updatedPortfolios = this.state.portfolios.map(portfolio =>
        portfolio.id === portfolioId
          ? { ...portfolio, isFollowing: false, followers: Math.max(0, portfolio.followers - 1) }
          : portfolio
      );

      this.setState({ portfolios: updatedPortfolios });
      this.saveCopyTradingStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleCopyTradingError(error);
      return false;
    }
  }

  /**
   * Copy trade
   */
  async copyTrade(strategyId: string, tradeData: any): Promise<CopyTrade | null> {
    try {
      this.setState({ isLoading: true, error: null });

      const response = await fetch(this.COPY_TRADES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify({
          strategyId,
          ...tradeData
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to copy trade: ${response.statusText}`);
      }

      const data = await response.json();
      const copyTrade: CopyTrade = data.copyTrade;

      this.setState({
        copyTrades: [...this.state.copyTrades, copyTrade],
        isLoading: false
      });

      this.saveCopyTradingStateToStorage();
      this.notifyListeners();

      return copyTrade;

    } catch (error) {
      this.handleCopyTradingError(error);
      return null;
    }
  }

  /**
   * Get strategy performance
   */
  async getStrategyPerformance(strategyId: string): Promise<any> {
    try {
      const response = await fetch(`${this.STRATEGIES_URL}/${strategyId}/performance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get strategy performance: ${response.statusText}`);
      }

      const data = await response.json();
      return data.performance;

    } catch (error) {
      this.handleCopyTradingError(error);
      return null;
    }
  }

  /**
   * Get portfolio performance
   */
  async getPortfolioPerformance(portfolioId: string): Promise<any> {
    try {
      const response = await fetch(`${this.PORTFOLIOS_URL}/${portfolioId}/performance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get portfolio performance: ${response.statusText}`);
      }

      const data = await response.json();
      return data.performance;

    } catch (error) {
      this.handleCopyTradingError(error);
      return null;
    }
  }

  /**
   * Search strategies
   */
  async searchStrategies(query: string, filters?: any): Promise<TradingStrategy[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`${this.STRATEGIES_URL}/search?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to search strategies: ${response.statusText}`);
      }

      const data = await response.json();
      return data.strategies || [];

    } catch (error) {
      this.handleCopyTradingError(error);
      return [];
    }
  }

  /**
   * Search portfolios
   */
  async searchPortfolios(query: string, filters?: any): Promise<Portfolio[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`${this.PORTFOLIOS_URL}/search?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to search portfolios: ${response.statusText}`);
      }

      const data = await response.json();
      return data.portfolios || [];

    } catch (error) {
      this.handleCopyTradingError(error);
      return [];
    }
  }

  /**
   * Get auth token
   */
  private getAuthToken(): string {
    return localStorage.getItem('soladia-auth-token') || '';
  }

  /**
   * Get current state
   */
  getState(): SocialTradingState {
    return { ...this.state };
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: SocialTradingState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get strategies
   */
  getStrategies(): TradingStrategy[] {
    return [...this.state.strategies];
  }

  /**
   * Get portfolios
   */
  getPortfolios(): Portfolio[] {
    return [...this.state.portfolios];
  }

  /**
   * Get my strategies
   */
  getMyStrategies(): TradingStrategy[] {
    return [...this.state.myStrategies];
  }

  /**
   * Get my portfolios
   */
  getMyPortfolios(): Portfolio[] {
    return [...this.state.myPortfolios];
  }

  /**
   * Get following strategies
   */
  getFollowingStrategies(): TradingStrategy[] {
    return [...this.state.followingStrategies];
  }

  /**
   * Get following portfolios
   */
  getFollowingPortfolios(): Portfolio[] {
    return [...this.state.followingPortfolios];
  }

  /**
   * Get copy trades
   */
  getCopyTrades(): CopyTrade[] {
    return [...this.state.copyTrades];
  }

  /**
   * Handle copy trading errors
   */
  private handleCopyTradingError(error: any): void {
    const copyTradingError = this.createCopyTradingError(
      error.code || 'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      error.details
    );

    this.setState({
      isLoading: false,
      error: copyTradingError.message,
      lastUpdated: Date.now()
    });

    console.error('Copy trading error:', copyTradingError);
  }

  /**
   * Create copy trading error
   */
  private createCopyTradingError(code: string, message: string, details?: any): SocialTradingError {
    return {
      code,
      message,
      details,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Set copy trading state
   */
  private setState(updates: Partial<SocialTradingState>): void {
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
        console.error('Error in copy trading state listener:', error);
      }
    });
  }

  /**
   * Save copy trading state to storage
   */
  private saveCopyTradingStateToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save copy trading state to storage:', error);
    }
  }

  /**
   * Load copy trading state from storage
   */
  private loadCopyTradingStateFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.setState(state);
      }
    } catch (error) {
      console.warn('Failed to load copy trading state from storage:', error);
    }
  }

  /**
   * Clear copy trading data
   */
  clearCopyTradingData(): void {
    this.setState({
      strategies: [],
      copyTrades: [],
      portfolios: [],
      myStrategies: [],
      myPortfolios: [],
      followingStrategies: [],
      followingPortfolios: [],
      error: null
    });
    this.saveCopyTradingStateToStorage();
  }
}

// Export singleton instance
export const copyTradingService = new CopyTradingService();
export default copyTradingService;

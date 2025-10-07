/**
 * Production-Grade Solana Wallet Service
 * Complete wallet management with comprehensive error handling, retry logic, and state management
 */

import { solanaService } from './solana';

export interface WalletConnection {
  publicKey: string;
  balance: number;
  network: string;
  walletType: 'phantom' | 'solflare' | 'backpack';
  connected: boolean;
  timestamp: number;
  version?: string;
  features?: string[];
}

export interface WalletState {
  connected: boolean;
  address: string | null;
  balance: number;
  network: string;
  walletType: string | null;
  error: string | null;
  loading: boolean;
  lastUpdated: number;
  reconnectAttempts: number;
  isReconnecting: boolean;
}

export interface WalletError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: number;
}

export interface WalletCapabilities {
  canSign: boolean;
  canSignAll: boolean;
  canRequestAirdrop: boolean;
  canSwitchNetwork: boolean;
  supportedNetworks: string[];
  maxSignatures: number;
}

export class ProductionWalletService {
  private state: WalletState = {
    connected: false,
    address: null,
    balance: 0,
    network: 'mainnet',
    walletType: null,
    error: null,
    loading: false,
    lastUpdated: 0,
    reconnectAttempts: 0,
    isReconnecting: false
  };

  private listeners: Set<(state: WalletState) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private balanceUpdateInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private capabilities: WalletCapabilities | null = null;

  // Wallet detection and connection
  private readonly SUPPORTED_WALLETS = ['phantom', 'solflare', 'backpack'] as const;
  private readonly NETWORKS = ['mainnet', 'devnet', 'testnet'] as const;
  private readonly STORAGE_KEY = 'soladia-wallet-state';
  private readonly VERSION = '2.0.0';

  constructor() {
    this.initializeWalletDetection();
    this.setupEventListeners();
    this.startHealthCheck();
  }

  /**
   * Initialize wallet detection and connection
   */
  private async initializeWalletDetection(): Promise<void> {
    try {
      this.setState({ loading: true });
      
      // Load saved state from storage
      const savedState = this.loadWalletStateFromStorage();
      if (savedState && savedState.connected) {
        // Verify the saved wallet is still available
        const wallet = this.getWalletObject(savedState.walletType);
        if (wallet && wallet.isConnected?.()) {
          await this.refreshWalletState();
          return;
        }
      }

      // Check for any connected wallet
      const connectedWallet = await this.detectConnectedWallet();
      if (connectedWallet) {
        await this.updateWalletState(connectedWallet);
      }
    } catch (error) {
      console.warn('Failed to initialize wallet detection:', error);
      this.handleWalletError(error);
    } finally {
      this.setState({ loading: false });
    }
  }

  /**
   * Setup event listeners for wallet changes
   */
  private setupEventListeners(): void {
    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.state.connected) {
        this.refreshWalletState();
      }
    });

    // Storage changes for multi-tab sync
    window.addEventListener('storage', (event) => {
      if (event.key === this.STORAGE_KEY) {
        this.loadWalletStateFromStorage();
      }
    });

    // Before unload cleanup
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Network changes
    window.addEventListener('online', () => {
      if (this.state.connected) {
        this.refreshWalletState();
      }
    });

    window.addEventListener('offline', () => {
      this.setState({ error: 'Network connection lost' });
    });
  }

  /**
   * Start health check for connected wallet
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      if (this.state.connected) {
        this.performHealthCheck();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform health check on connected wallet
   */
  private async performHealthCheck(): Promise<void> {
    try {
      if (!this.state.walletType) return;

      const wallet = this.getWalletObject(this.state.walletType);
      if (!wallet || !wallet.isConnected?.()) {
        await this.handleDisconnection();
        return;
      }

      // Verify wallet is still responsive
      await this.refreshBalance();
    } catch (error) {
      console.warn('Health check failed:', error);
      await this.handleDisconnection();
    }
  }

  /**
   * Detect which wallet is currently connected
   */
  private async detectConnectedWallet(): Promise<WalletConnection | null> {
    for (const walletType of this.SUPPORTED_WALLETS) {
      try {
        const wallet = this.getWalletObject(walletType);
        if (wallet?.isConnected?.()) {
          const response = await wallet.connect();
          const connection = await this.createWalletConnection(walletType, response);
          return connection;
        }
      } catch (error) {
        console.warn(`Failed to detect ${walletType} wallet:`, error);
      }
    }
    return null;
  }

  /**
   * Create wallet connection object
   */
  private async createWalletConnection(
    walletType: string,
    response: any
  ): Promise<WalletConnection> {
    const connection: WalletConnection = {
      publicKey: response.publicKey.toString(),
      balance: 0,
      network: 'mainnet',
      walletType: walletType as any,
      connected: true,
      timestamp: Date.now(),
      version: response.version || 'unknown',
      features: response.features || []
    };

    // Get wallet balance
    try {
      const balanceResponse = await solanaService.getWalletBalance(connection.publicKey);
      if (balanceResponse.success) {
        connection.balance = balanceResponse.data.balance_sol;
      }
    } catch (error) {
      console.warn('Failed to get wallet balance:', error);
    }

    // Detect wallet capabilities
    this.capabilities = await this.detectWalletCapabilities(walletType);

    return connection;
  }

  /**
   * Detect wallet capabilities
   */
  private async detectWalletCapabilities(walletType: string): Promise<WalletCapabilities> {
    const wallet = this.getWalletObject(walletType);
    
    return {
      canSign: !!wallet?.signTransaction,
      canSignAll: !!wallet?.signAllTransactions,
      canRequestAirdrop: walletType === 'phantom', // Phantom supports airdrop
      canSwitchNetwork: !!wallet?.switchNetwork,
      supportedNetworks: this.NETWORKS,
      maxSignatures: walletType === 'phantom' ? 10 : 5
    };
  }

  /**
   * Connect to a specific wallet
   */
  async connectWallet(walletType: 'phantom' | 'solflare' | 'backpack'): Promise<WalletConnection> {
    this.setState({ loading: true, error: null, reconnectAttempts: 0 });

    try {
      const wallet = this.getWalletObject(walletType);
      if (!wallet) {
        throw this.createWalletError('WALLET_NOT_FOUND', `${walletType} wallet not found`);
      }

      // Check if already connected
      if (wallet.isConnected?.()) {
        const response = await wallet.connect();
        const connection = await this.createWalletConnection(walletType, response);
        await this.updateWalletState(connection);
        return connection;
      }

      // Connect to wallet with timeout
      const connectionPromise = wallet.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), 10000);
      });

      const response = await Promise.race([connectionPromise, timeoutPromise]);
      const connection = await this.createWalletConnection(walletType, response);

      await this.updateWalletState(connection);
      this.reconnectAttempts = 0;

      // Start balance updates
      this.startBalanceUpdates();

      return connection;

    } catch (error) {
      const walletError = this.handleWalletError(error);
      this.setState({ loading: false, error: walletError.message });
      throw walletError;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    this.setState({ loading: true, error: null });

    try {
      if (this.state.walletType) {
        const wallet = this.getWalletObject(this.state.walletType);
        if (wallet?.disconnect) {
          await wallet.disconnect();
        }
      }

      this.cleanup();
      this.setState({
        connected: false,
        address: null,
        balance: 0,
        walletType: null,
        loading: false,
        lastUpdated: Date.now(),
        reconnectAttempts: 0,
        isReconnecting: false
      });

      this.saveWalletStateToStorage();
      this.notifyListeners();

    } catch (error) {
      const walletError = this.handleWalletError(error);
      this.setState({ loading: false, error: walletError.message });
      throw walletError;
    }
  }

  /**
   * Sign transaction
   */
  async signTransaction(transaction: any): Promise<any> {
    if (!this.state.connected || !this.state.walletType) {
      throw this.createWalletError('NOT_CONNECTED', 'Wallet not connected');
    }

    if (!this.capabilities?.canSign) {
      throw this.createWalletError('FEATURE_NOT_SUPPORTED', 'Transaction signing not supported');
    }

    try {
      const wallet = this.getWalletObject(this.state.walletType);
      const signedTransaction = await wallet.signTransaction(transaction);
      return signedTransaction;
    } catch (error) {
      throw this.handleWalletError(error);
    }
  }

  /**
   * Sign multiple transactions
   */
  async signAllTransactions(transactions: any[]): Promise<any[]> {
    if (!this.state.connected || !this.state.walletType) {
      throw this.createWalletError('NOT_CONNECTED', 'Wallet not connected');
    }

    if (!this.capabilities?.canSignAll) {
      throw this.createWalletError('FEATURE_NOT_SUPPORTED', 'Batch signing not supported');
    }

    if (transactions.length > (this.capabilities?.maxSignatures || 5)) {
      throw this.createWalletError('TOO_MANY_TRANSACTIONS', 'Too many transactions to sign');
    }

    try {
      const wallet = this.getWalletObject(this.state.walletType);
      const signedTransactions = await wallet.signAllTransactions(transactions);
      return signedTransactions;
    } catch (error) {
      throw this.handleWalletError(error);
    }
  }

  /**
   * Request airdrop
   */
  async requestAirdrop(amount: number = 1): Promise<string> {
    if (!this.state.connected || !this.state.walletType) {
      throw this.createWalletError('NOT_CONNECTED', 'Wallet not connected');
    }

    if (!this.capabilities?.canRequestAirdrop) {
      throw this.createWalletError('FEATURE_NOT_SUPPORTED', 'Airdrop not supported');
    }

    try {
      const response = await solanaService.requestAirdrop(this.state.address!, amount);
      if (response.success) {
        await this.refreshBalance();
        return response.data.signature;
      } else {
        throw new Error(response.error || 'Airdrop failed');
      }
    } catch (error) {
      throw this.handleWalletError(error);
    }
  }

  /**
   * Switch network
   */
  async switchNetwork(network: string): Promise<void> {
    if (!this.state.connected || !this.state.walletType) {
      throw this.createWalletError('NOT_CONNECTED', 'Wallet not connected');
    }

    if (!this.capabilities?.canSwitchNetwork) {
      throw this.createWalletError('FEATURE_NOT_SUPPORTED', 'Network switching not supported');
    }

    try {
      const wallet = this.getWalletObject(this.state.walletType);
      await wallet.switchNetwork(network);
      
      this.setState({ network });
      this.saveWalletStateToStorage();
    } catch (error) {
      throw this.handleWalletError(error);
    }
  }

  /**
   * Refresh wallet state
   */
  async refreshWalletState(): Promise<void> {
    if (!this.state.connected || !this.state.walletType) {
      return;
    }

    try {
      const wallet = this.getWalletObject(this.state.walletType);
      if (!wallet?.isConnected?.()) {
        await this.handleDisconnection();
        return;
      }

      await this.refreshBalance();
      this.setState({ lastUpdated: Date.now() });
    } catch (error) {
      console.warn('Failed to refresh wallet state:', error);
      await this.handleDisconnection();
    }
  }

  /**
   * Refresh wallet balance
   */
  private async refreshBalance(): Promise<void> {
    if (!this.state.address) return;

    try {
      const response = await solanaService.getWalletBalance(this.state.address);
      if (response.success) {
        this.setState({ balance: response.data.balance_sol });
      }
    } catch (error) {
      console.warn('Failed to refresh balance:', error);
    }
  }

  /**
   * Start automatic balance updates
   */
  private startBalanceUpdates(): void {
    this.stopBalanceUpdates();
    this.balanceUpdateInterval = setInterval(() => {
      this.refreshBalance();
    }, 10000); // Update every 10 seconds
  }

  /**
   * Stop automatic balance updates
   */
  private stopBalanceUpdates(): void {
    if (this.balanceUpdateInterval) {
      clearInterval(this.balanceUpdateInterval);
      this.balanceUpdateInterval = null;
    }
  }

  /**
   * Handle wallet disconnection
   */
  private async handleDisconnection(): Promise<void> {
    this.setState({ isReconnecting: true });
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), this.maxReconnectDelay);
      
      this.reconnectTimeout = setTimeout(async () => {
        try {
          await this.refreshWalletState();
          this.setState({ isReconnecting: false });
        } catch (error) {
          await this.handleDisconnection();
        }
      }, delay);
    } else {
      await this.disconnectWallet();
    }
  }

  /**
   * Update wallet state
   */
  private async updateWalletState(connection: WalletConnection): Promise<void> {
    this.setState({
      connected: connection.connected,
      address: connection.publicKey,
      balance: connection.balance,
      network: connection.network,
      walletType: connection.walletType,
      loading: false,
      error: null,
      lastUpdated: connection.timestamp,
      reconnectAttempts: 0,
      isReconnecting: false
    });

    this.saveWalletStateToStorage();
    this.notifyListeners();
  }

  /**
   * Get wallet object by type
   */
  private getWalletObject(walletType: string): any {
    switch (walletType) {
      case 'phantom':
        return window.solana;
      case 'solflare':
        return window.solflare;
      case 'backpack':
        return window.backpack;
      default:
        return null;
    }
  }

  /**
   * Handle wallet errors
   */
  private handleWalletError(error: any): WalletError {
    let code = 'UNKNOWN_ERROR';
    let message = 'An unknown error occurred';
    let retryable = false;

    if (error.code) {
      code = error.code;
    }

    if (error.message) {
      message = error.message;
    }

    // Determine if error is retryable
    switch (code) {
      case 'NETWORK_ERROR':
      case 'TIMEOUT':
      case 'RATE_LIMITED':
        retryable = true;
        break;
      case 'USER_REJECTED':
      case 'WALLET_NOT_FOUND':
      case 'FEATURE_NOT_SUPPORTED':
        retryable = false;
        break;
      default:
        retryable = true;
    }

    const walletError: WalletError = {
      code,
      message,
      details: error.details,
      retryable,
      timestamp: Date.now()
    };

    console.error('Wallet error:', walletError);
    return walletError;
  }

  /**
   * Create wallet error
   */
  private createWalletError(code: string, message: string, details?: any): WalletError {
    return {
      code,
      message,
      details,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Set wallet state
   */
  private setState(updates: Partial<WalletState>): void {
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
        console.error('Error in wallet state listener:', error);
      }
    });
  }

  /**
   * Save wallet state to storage
   */
  private saveWalletStateToStorage(): void {
    try {
      const stateToSave = {
        ...this.state,
        timestamp: Date.now()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save wallet state to storage:', error);
    }
  }

  /**
   * Load wallet state from storage
   */
  private loadWalletStateFromStorage(): WalletState | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        // Check if state is not too old (24 hours)
        if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
          return state;
        }
      }
    } catch (error) {
      console.warn('Failed to load wallet state from storage:', error);
    }
    return null;
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: WalletState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current wallet state
   */
  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * Get wallet capabilities
   */
  getCapabilities(): WalletCapabilities | null {
    return this.capabilities;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.state.connected;
  }

  /**
   * Get wallet address
   */
  getAddress(): string | null {
    return this.state.address;
  }

  /**
   * Get wallet balance
   */
  getBalance(): number {
    return this.state.balance;
  }

  /**
   * Get wallet type
   */
  getWalletType(): string | null {
    return this.state.walletType;
  }

  /**
   * Get wallet network
   */
  getNetwork(): string {
    return this.state.network;
  }

  /**
   * Get wallet error
   */
  getError(): string | null {
    return this.state.error;
  }

  /**
   * Check if wallet is loading
   */
  isLoading(): boolean {
    return this.state.loading;
  }

  /**
   * Check if wallet is reconnecting
   */
  isReconnecting(): boolean {
    return this.state.isReconnecting;
  }

  /**
   * Get supported wallets
   */
  getSupportedWallets(): string[] {
    return [...this.SUPPORTED_WALLETS];
  }

  /**
   * Get supported networks
   */
  getSupportedNetworks(): string[] {
    return [...this.NETWORKS];
  }

  /**
   * Get service version
   */
  getVersion(): string {
    return this.VERSION;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.stopBalanceUpdates();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Destroy service instance
   */
  destroy(): void {
    this.cleanup();
    this.listeners.clear();
    this.setState({
      connected: false,
      address: null,
      balance: 0,
      walletType: null,
      error: null,
      loading: false,
      lastUpdated: 0,
      reconnectAttempts: 0,
      isReconnecting: false
    });
  }
}

// Export singleton instance
export const productionWalletService = new ProductionWalletService();
export default productionWalletService;

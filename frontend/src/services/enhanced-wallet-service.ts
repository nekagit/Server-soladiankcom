/**
 * Enhanced Solana Wallet Service
 * Comprehensive wallet management with error handling and state management
 */

import { solanaService } from './solana';

export interface WalletConnection {
  publicKey: string;
  balance: number;
  network: string;
  walletType: 'phantom' | 'solflare' | 'backpack';
  connected: boolean;
  timestamp: number;
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
}

export interface WalletError {
  code: string;
  message: string;
  details?: any;
}

export class EnhancedWalletService {
  private state: WalletState = {
    connected: false,
    address: null,
    balance: 0,
    network: 'mainnet',
    walletType: null,
    error: null,
    loading: false,
    lastUpdated: 0
  };

  private listeners: Set<(state: WalletState) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000;

  constructor() {
    this.initializeWalletDetection();
    this.setupEventListeners();
  }

  /**
   * Initialize wallet detection and connection
   */
  private async initializeWalletDetection(): Promise<void> {
    try {
      // Check if any wallet is already connected
      const connectedWallet = await this.detectConnectedWallet();
      if (connectedWallet) {
        await this.updateWalletState(connectedWallet);
      }
    } catch (error) {
      console.warn('Failed to initialize wallet detection:', error);
    }
  }

  /**
   * Setup event listeners for wallet changes
   */
  private setupEventListeners(): void {
    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.refreshWalletState();
      }
    });

    // Listen for storage changes (for multi-tab sync)
    window.addEventListener('storage', (event) => {
      if (event.key === 'soladia-wallet-state') {
        this.loadWalletStateFromStorage();
      }
    });

    // Listen for beforeunload to cleanup
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Detect which wallet is currently connected
   */
  private async detectConnectedWallet(): Promise<WalletConnection | null> {
    const wallets = [
      { name: 'phantom', object: window.solana },
      { name: 'solflare', object: window.solflare },
      { name: 'backpack', object: window.backpack }
    ];

    for (const wallet of wallets) {
      if (wallet.object?.isConnected?.()) {
        try {
          const response = await wallet.object.connect();
          return {
            publicKey: response.publicKey.toString(),
            balance: 0, // Will be updated separately
            network: 'mainnet',
            walletType: wallet.name as any,
            connected: true,
            timestamp: Date.now()
          };
        } catch (error) {
          console.warn(`Failed to connect to ${wallet.name}:`, error);
        }
      }
    }

    return null;
  }

  /**
   * Connect to a specific wallet
   */
  async connectWallet(walletType: 'phantom' | 'solflare' | 'backpack'): Promise<WalletConnection> {
    this.setState({ loading: true, error: null });

    try {
      const wallet = this.getWalletObject(walletType);
      if (!wallet) {
        throw new WalletError('WALLET_NOT_FOUND', `${walletType} wallet not found`);
      }

      // Check if already connected
      if (wallet.isConnected?.()) {
        const response = await wallet.connect();
        const connection = {
          publicKey: response.publicKey.toString(),
          balance: 0,
          network: 'mainnet',
          walletType,
          connected: true,
          timestamp: Date.now()
        };

        await this.updateWalletState(connection);
        return connection;
      }

      // Connect to wallet
      const response = await wallet.connect();
      const connection: WalletConnection = {
        publicKey: response.publicKey.toString(),
        balance: 0,
        network: 'mainnet',
        walletType,
        connected: true,
        timestamp: Date.now()
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

      await this.updateWalletState(connection);
      this.reconnectAttempts = 0;

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
        const wallet = this.getWalletObject(this.state.walletType as any);
        if (wallet?.disconnect) {
          await wallet.disconnect();
        }
      }

      this.setState({
        connected: false,
        address: null,
        balance: 0,
        walletType: null,
        loading: false,
        lastUpdated: Date.now()
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
      lastUpdated: connection.timestamp
    });

    this.saveWalletStateToStorage();
    this.notifyListeners();
  }

  /**
   * Refresh wallet state
   */
  async refreshWalletState(): Promise<void> {
    if (!this.state.connected || !this.state.address) {
      return;
    }

    try {
      const balanceResponse = await solanaService.getWalletBalance(this.state.address);
      if (balanceResponse.success) {
        this.setState({
          balance: balanceResponse.data.balance_sol,
          lastUpdated: Date.now()
        });
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('Failed to refresh wallet state:', error);
    }
  }

  /**
   * Handle wallet errors
   */
  private handleWalletError(error: any): WalletError {
    if (error.code === 4001) {
      return new WalletError('USER_REJECTED', 'User rejected the connection request');
    } else if (error.code === -32002) {
      return new WalletError('ALREADY_CONNECTED', 'Wallet is already connected');
    } else if (error.message?.includes('Wallet not found')) {
      return new WalletError('WALLET_NOT_FOUND', 'Wallet not found. Please install a Solana wallet.');
    } else if (error.message?.includes('User rejected')) {
      return new WalletError('USER_REJECTED', 'User rejected the connection request');
    } else if (error.message?.includes('Insufficient funds')) {
      return new WalletError('INSUFFICIENT_FUNDS', 'Insufficient funds for this transaction');
    } else {
      return new WalletError('UNKNOWN_ERROR', error.message || 'An unknown error occurred');
    }
  }

  /**
   * Set wallet state
   */
  private setState(updates: Partial<WalletState>): void {
    this.state = { ...this.state, ...updates };
  }

  /**
   * Get current wallet state
   */
  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.state.connected && this.state.address !== null;
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
   * Get network
   */
  getNetwork(): string {
    return this.state.network;
  }

  /**
   * Get error
   */
  getError(): string | null {
    return this.state.error;
  }

  /**
   * Check if loading
   */
  isLoading(): boolean {
    return this.state.loading;
  }

  /**
   * Add state change listener
   */
  addListener(listener: (state: WalletState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('Error in wallet state listener:', error);
      }
    });
  }

  /**
   * Save wallet state to localStorage
   */
  private saveWalletStateToStorage(): void {
    try {
      const stateToSave = {
        connected: this.state.connected,
        address: this.state.address,
        walletType: this.state.walletType,
        network: this.state.network,
        lastUpdated: this.state.lastUpdated
      };
      localStorage.setItem('soladia-wallet-state', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save wallet state to storage:', error);
    }
  }

  /**
   * Load wallet state from localStorage
   */
  private loadWalletStateFromStorage(): void {
    try {
      const savedState = localStorage.getItem('soladia-wallet-state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        if (parsedState.connected && parsedState.address) {
          this.setState({
            connected: parsedState.connected,
            address: parsedState.address,
            walletType: parsedState.walletType,
            network: parsedState.network,
            lastUpdated: parsedState.lastUpdated
          });
          this.notifyListeners();
        }
      }
    } catch (error) {
      console.warn('Failed to load wallet state from storage:', error);
    }
  }

  /**
   * Get supported wallets
   */
  getSupportedWallets(): Array<{ name: string; available: boolean; installed: boolean }> {
    const wallets = [
      { name: 'phantom', object: window.solana },
      { name: 'solflare', object: window.solflare },
      { name: 'backpack', object: window.backpack }
    ];

    return wallets.map(wallet => ({
      name: wallet.name,
      available: !!wallet.object,
      installed: !!wallet.object?.isConnected
    }));
  }

  /**
   * Switch network
   */
  async switchNetwork(network: 'mainnet' | 'devnet' | 'testnet'): Promise<void> {
    if (!this.isConnected()) {
      throw new WalletError('NOT_CONNECTED', 'Wallet is not connected');
    }

    try {
      this.setState({ loading: true, error: null });

      // Update network in state
      this.setState({
        network,
        loading: false,
        lastUpdated: Date.now()
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
    if (!this.isConnected()) {
      throw new WalletError('NOT_CONNECTED', 'Wallet is not connected');
    }

    try {
      const wallet = this.getWalletObject(this.state.walletType!);
      if (!wallet?.signTransaction) {
        throw new WalletError('SIGN_NOT_SUPPORTED', 'Wallet does not support transaction signing');
      }

      return await wallet.signTransaction(transaction);

    } catch (error) {
      const walletError = this.handleWalletError(error);
      throw walletError;
    }
  }

  /**
   * Sign multiple transactions
   */
  async signAllTransactions(transactions: any[]): Promise<any[]> {
    if (!this.isConnected()) {
      throw new WalletError('NOT_CONNECTED', 'Wallet is not connected');
    }

    try {
      const wallet = this.getWalletObject(this.state.walletType!);
      if (!wallet?.signAllTransactions) {
        throw new WalletError('SIGN_NOT_SUPPORTED', 'Wallet does not support batch transaction signing');
      }

      return await wallet.signAllTransactions(transactions);

    } catch (error) {
      const walletError = this.handleWalletError(error);
      throw walletError;
    }
  }

  /**
   * Request wallet action
   */
  async request(action: string, params?: any): Promise<any> {
    if (!this.isConnected()) {
      throw new WalletError('NOT_CONNECTED', 'Wallet is not connected');
    }

    try {
      const wallet = this.getWalletObject(this.state.walletType!);
      if (!wallet?.request) {
        throw new WalletError('REQUEST_NOT_SUPPORTED', 'Wallet does not support custom requests');
      }

      return await wallet.request({ method: action, params });

    } catch (error) {
      const walletError = this.handleWalletError(error);
      throw walletError;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.listeners.clear();
    this.setState({
      connected: false,
      address: null,
      balance: 0,
      walletType: null,
      error: null,
      loading: false,
      lastUpdated: 0
    });
  }

  /**
   * Reconnect with exponential backoff
   */
  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setState({ error: 'Maximum reconnection attempts reached' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(async () => {
      try {
        if (this.state.walletType) {
          await this.connectWallet(this.state.walletType as any);
        }
      } catch (error) {
        console.warn('Reconnection attempt failed:', error);
        await this.attemptReconnect();
      }
    }, delay);
  }
}

// Create singleton instance
export const enhancedWalletService = new EnhancedWalletService();

// Export types
export type { WalletConnection, WalletState, WalletError };

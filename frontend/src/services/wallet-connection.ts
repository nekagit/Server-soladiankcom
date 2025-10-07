/**
 * Wallet connection service for Solana wallets
 */

export interface WalletInfo {
  address: string;
  balance: number;
  balance_sol: number;
  wallet_type: 'phantom' | 'solflare' | 'backpack';
  is_connected: boolean;
}

export interface WalletConnectionState {
  isConnected: boolean;
  wallet: WalletInfo | null;
  isLoading: boolean;
  error: string | null;
}

export interface WalletAdapter {
  name: string;
  icon: string;
  isInstalled: () => boolean;
  connect: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
  request: (method: string, params?: any) => Promise<any>;
}

class WalletConnectionManager {
  private state: WalletConnectionState = {
    isConnected: false,
    wallet: null,
    isLoading: false,
    error: null,
  };

  private listeners: Array<(state: WalletConnectionState) => void> = [];
  private currentWallet: WalletAdapter | null = null;

  constructor() {
    this.initializeWallet();
  }

  private initializeWallet(): void {
    // Check if wallet is already connected
    const savedWallet = this.getSavedWallet();
    if (savedWallet) {
      this.state.wallet = savedWallet;
      this.state.isConnected = true;
      this.notifyListeners();
    }
  }

  public subscribe(listener: (state: WalletConnectionState) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  public getState(): WalletConnectionState {
    return { ...this.state };
  }

  private setState(updates: Partial<WalletConnectionState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  private getSavedWallet(): WalletInfo | null {
    if (typeof window === 'undefined') return null;
    
    const saved = localStorage.getItem('wallet_info');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse saved wallet:', error);
        return null;
      }
    }
    return null;
  }

  private saveWallet(wallet: WalletInfo): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wallet_info', JSON.stringify(wallet));
    }
  }

  private clearSavedWallet(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wallet_info');
    }
  }

  public async connectWallet(walletType: 'phantom' | 'solflare' | 'backpack'): Promise<boolean> {
    this.setState({ isLoading: true, error: null });

    try {
      const adapter = this.getWalletAdapter(walletType);
      if (!adapter) {
        throw new Error(`${walletType} wallet not found`);
      }

      if (!adapter.isInstalled()) {
        throw new Error(`${walletType} wallet is not installed`);
      }

      const response = await adapter.connect();
      const address = response.publicKey.toString();

      // Get wallet balance
      const balance = await this.getWalletBalance(address);

      const walletInfo: WalletInfo = {
        address,
        balance: balance.balance,
        balance_sol: balance.balance_sol,
        wallet_type: walletType,
        is_connected: true,
      };

      this.currentWallet = adapter;
      this.setState({
        isConnected: true,
        wallet: walletInfo,
        isLoading: false,
        error: null,
      });

      this.saveWallet(walletInfo);
      return true;
    } catch (error) {
      this.setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Wallet connection failed',
      });
      return false;
    }
  }

  public async disconnectWallet(): Promise<void> {
    this.setState({ isLoading: true });

    try {
      if (this.currentWallet) {
        await this.currentWallet.disconnect();
      }
    } catch (error) {
      console.error('Disconnect error:', error);
    } finally {
      this.currentWallet = null;
      this.setState({
        isConnected: false,
        wallet: null,
        isLoading: false,
        error: null,
      });

      this.clearSavedWallet();
    }
  }

  public async signTransaction(transaction: any): Promise<any> {
    if (!this.currentWallet) {
      throw new Error('No wallet connected');
    }

    return this.currentWallet.signTransaction(transaction);
  }

  public async signAllTransactions(transactions: any[]): Promise<any[]> {
    if (!this.currentWallet) {
      throw new Error('No wallet connected');
    }

    return this.currentWallet.signAllTransactions(transactions);
  }

  public async request(method: string, params?: any): Promise<any> {
    if (!this.currentWallet) {
      throw new Error('No wallet connected');
    }

    return this.currentWallet.request(method, params);
  }

  private getWalletAdapter(walletType: string): WalletAdapter | null {
    if (typeof window === 'undefined') return null;

    switch (walletType) {
      case 'phantom':
        if (window.solana?.isPhantom) {
          return {
            name: 'Phantom',
            icon: 'https://phantom.app/img/phantom-logo.svg',
            isInstalled: () => !!window.solana?.isPhantom,
            connect: () => window.solana.connect(),
            disconnect: () => window.solana.disconnect(),
            signTransaction: (transaction) => window.solana.signTransaction(transaction),
            signAllTransactions: (transactions) => window.solana.signAllTransactions(transactions),
            request: (method, params) => window.solana.request({ method, params }),
          };
        }
        break;

      case 'solflare':
        if (window.solflare?.isSolflare) {
          return {
            name: 'Solflare',
            icon: 'https://solflare.com/assets/solflare-logo.svg',
            isInstalled: () => !!window.solflare?.isSolflare,
            connect: () => window.solflare.connect(),
            disconnect: () => window.solflare.disconnect(),
            signTransaction: (transaction) => window.solflare.signTransaction(transaction),
            signAllTransactions: (transactions) => window.solflare.signAllTransactions(transactions),
            request: (method, params) => window.solflare.request({ method, params }),
          };
        }
        break;

      case 'backpack':
        if (window.backpack?.isBackpack) {
          return {
            name: 'Backpack',
            icon: 'https://backpack.app/assets/backpack-logo.svg',
            isInstalled: () => !!window.backpack?.isBackpack,
            connect: () => window.backpack.connect(),
            disconnect: () => window.backpack.disconnect(),
            signTransaction: (transaction) => window.backpack.signTransaction(transaction),
            signAllTransactions: (transactions) => window.backpack.signAllTransactions(transactions),
            request: (method, params) => window.backpack.request({ method, params }),
          };
        }
        break;
    }

    return null;
  }

  private async getWalletBalance(address: string): Promise<{ balance: number; balance_sol: number }> {
    try {
      // Try to get balance from our API first
      const response = await fetch(`/api/solana/wallets/${address}/balance`);
      if (response.ok) {
        const data = await response.json();
        return {
          balance: data.balance || 0,
          balance_sol: data.balance_sol || 0,
        };
      }
    } catch (error) {
      console.warn('Failed to get balance from API:', error);
    }

    // Fallback to wallet's own balance method
    if (this.currentWallet) {
      try {
        const balance = await this.currentWallet.request('getBalance');
        return {
          balance: balance.value || 0,
          balance_sol: (balance.value || 0) / 1e9, // Convert lamports to SOL
        };
      } catch (error) {
        console.warn('Failed to get balance from wallet:', error);
      }
    }

    return { balance: 0, balance_sol: 0 };
  }

  public async refreshBalance(): Promise<void> {
    if (!this.state.wallet) return;

    try {
      const balance = await this.getWalletBalance(this.state.wallet.address);
      
      this.setState({
        wallet: {
          ...this.state.wallet,
          balance: balance.balance,
          balance_sol: balance.balance_sol,
        },
      });

      this.saveWallet(this.state.wallet);
    } catch (error) {
      console.error('Failed to refresh balance:', error);
    }
  }

  public getAvailableWallets(): Array<{ type: string; name: string; icon: string; installed: boolean }> {
    const wallets = [
      { type: 'phantom', name: 'Phantom', icon: 'https://phantom.app/img/phantom-logo.svg' },
      { type: 'solflare', name: 'Solflare', icon: 'https://solflare.com/assets/solflare-logo.svg' },
      { type: 'backpack', name: 'Backpack', icon: 'https://backpack.app/assets/backpack-logo.svg' },
    ];

    return wallets.map(wallet => ({
      ...wallet,
      installed: this.getWalletAdapter(wallet.type)?.isInstalled() || false,
    }));
  }
}

// Create singleton instance
export const walletConnectionManager = new WalletConnectionManager();

// Export types
export type { WalletInfo, WalletConnectionState, WalletAdapter };



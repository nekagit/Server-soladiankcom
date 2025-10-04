// Enhanced Solana wallet service with multi-wallet support
import type { SolanaWallet, SolanaTransaction } from '../../types';

export interface WalletProvider {
  name: string;
  icon: string;
  isInstalled: () => boolean;
  connect: () => Promise<{ publicKey: string }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
  signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  getAccount: () => Promise<{ publicKey: string }>;
}

export interface EnhancedSolanaWallet extends SolanaWallet {
  provider: string;
  network: 'mainnet-beta' | 'testnet' | 'devnet';
  isConnected: boolean;
  autoConnect: boolean;
}

export class EnhancedSolanaWalletService {
  private wallet: EnhancedSolanaWallet | null = null;
  private providers: Map<string, WalletProvider> = new Map();
  private currentProvider: WalletProvider | null = null;
  private network: 'mainnet-beta' | 'testnet' | 'devnet' = 'devnet';

  constructor() {
    this.initializeProviders();
    this.setupEventListeners();
  }

  private initializeProviders() {
    // Phantom Wallet
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      this.providers.set('phantom', {
        name: 'Phantom',
        icon: '👻',
        isInstalled: () => !!window.solana?.isPhantom,
        connect: () => window.solana.connect(),
        disconnect: () => window.solana.disconnect(),
        signTransaction: (tx) => window.solana.signTransaction(tx),
        signAllTransactions: (txs) => window.solana.signAllTransactions(txs),
        signMessage: (msg) => window.solana.signMessage(msg),
        getAccount: () => window.solana.getAccount()
      });
    }

    // Solflare Wallet
    if (typeof window !== 'undefined' && window.solflare) {
      this.providers.set('solflare', {
        name: 'Solflare',
        icon: '☀️',
        isInstalled: () => !!window.solflare,
        connect: () => window.solflare.connect(),
        disconnect: () => window.solflare.disconnect(),
        signTransaction: (tx) => window.solflare.signTransaction(tx),
        signAllTransactions: (txs) => window.solflare.signAllTransactions(txs),
        signMessage: (msg) => window.solflare.signMessage(msg),
        getAccount: () => window.solflare.getAccount()
      });
    }

    // Backpack Wallet
    if (typeof window !== 'undefined' && window.backpack) {
      this.providers.set('backpack', {
        name: 'Backpack',
        icon: '🎒',
        isInstalled: () => !!window.backpack,
        connect: () => window.backpack.connect(),
        disconnect: () => window.backpack.disconnect(),
        signTransaction: (tx) => window.backpack.signTransaction(tx),
        signAllTransactions: (txs) => window.backpack.signAllTransactions(txs),
        signMessage: (msg) => window.backpack.signMessage(msg),
        getAccount: () => window.backpack.getAccount()
      });
    }
  }

  private setupEventListeners() {
    if (typeof window === 'undefined') return;

    // Listen for wallet account changes
    window.addEventListener('solana#accountChanged', (event: any) => {
      if (this.wallet && event.detail.publicKey) {
        this.wallet.publicKey = event.detail.publicKey.toString();
        this.dispatchEvent('wallet:accountChanged', { wallet: this.wallet });
      }
    });

    // Listen for wallet disconnection
    window.addEventListener('solana#disconnect', () => {
      this.wallet = null;
      this.currentProvider = null;
      this.dispatchEvent('wallet:disconnected', {});
    });
  }

  async connect(providerName?: string): Promise<EnhancedSolanaWallet> {
    try {
      let provider: WalletProvider | null = null;

      if (providerName) {
        provider = this.providers.get(providerName) || null;
      } else {
        // Auto-select first available provider
        for (const [name, prov] of this.providers) {
          if (prov.isInstalled()) {
            provider = prov;
            break;
          }
        }
      }

      if (!provider) {
        throw new Error('No wallet provider available. Please install a Solana wallet.');
      }

      if (!provider.isInstalled()) {
        throw new Error(`${provider.name} wallet is not installed.`);
      }

      const response = await provider.connect();
      
      this.wallet = {
        publicKey: response.publicKey.toString(),
        connected: true,
        balance: 0,
        provider: provider.name,
        network: this.network,
        isConnected: true,
        autoConnect: true
      };

      this.currentProvider = provider;

      // Get balance
      await this.updateBalance();

      // Dispatch events
      this.dispatchEvent('wallet:connected', { wallet: this.wallet });
      this.dispatchEvent('wallet:providerChanged', { provider: provider.name });

      return this.wallet;
    } catch (error) {
      throw new Error(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.currentProvider) {
      throw new Error('No wallet connected');
    }

    try {
      await this.currentProvider.disconnect();
      this.wallet = null;
      this.currentProvider = null;

      this.dispatchEvent('wallet:disconnected', {});
    } catch (error) {
      throw new Error(`Failed to disconnect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async switchProvider(providerName: string): Promise<EnhancedSolanaWallet> {
    if (this.wallet) {
      await this.disconnect();
    }

    return await this.connect(providerName);
  }

  async updateBalance(): Promise<number> {
    if (!this.wallet || !this.currentProvider) {
      return 0;
    }

    try {
      // In a real implementation, this would make an RPC call
      // For now, we'll simulate it
      const balance = Math.random() * 100;
      this.wallet.balance = balance;
      return balance;
    } catch (error) {
      console.error('Failed to update balance:', error);
      return 0;
    }
  }

  async signTransaction(transaction: any): Promise<any> {
    if (!this.currentProvider || !this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this.currentProvider.signTransaction(transaction);
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async signAllTransactions(transactions: any[]): Promise<any[]> {
    if (!this.currentProvider || !this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this.currentProvider.signAllTransactions(transactions);
    } catch (error) {
      throw new Error(`Failed to sign transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.currentProvider || !this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await this.currentProvider.signMessage(message);
      return result.signature;
    } catch (error) {
      throw new Error(`Failed to sign message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendPayment(to: string, amount: number, memo?: string): Promise<SolanaTransaction> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      // In a real implementation, this would create and send a Solana transaction
      const transaction: SolanaTransaction = {
        signature: this.generateSignature(),
        amount,
        from: this.wallet.publicKey,
        to,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Simulate transaction confirmation
      setTimeout(() => {
        transaction.status = 'confirmed';
        this.dispatchEvent('transaction:confirmed', { transaction });
      }, 2000);

      this.dispatchEvent('transaction:created', { transaction });

      return transaction;
    } catch (error) {
      throw new Error(`Failed to send payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Getters
  isConnected(): boolean {
    return this.wallet?.isConnected || false;
  }

  getPublicKey(): string | null {
    return this.wallet?.publicKey || null;
  }

  getBalance(): number {
    return this.wallet?.balance || 0;
  }

  getWallet(): EnhancedSolanaWallet | null {
    return this.wallet;
  }

  getCurrentProvider(): string | null {
    return this.currentProvider?.name || null;
  }

  getAvailableProviders(): WalletProvider[] {
    return Array.from(this.providers.values()).filter(p => p.isInstalled());
  }

  getProvider(name: string): WalletProvider | null {
    return this.providers.get(name) || null;
  }

  setNetwork(network: 'mainnet-beta' | 'testnet' | 'devnet'): void {
    this.network = network;
    if (this.wallet) {
      this.wallet.network = network;
    }
  }

  getNetwork(): string {
    return this.network;
  }

  // Utility methods
  formatAddress(address: string, length: number = 8): string {
    if (address.length <= length * 2) {
      return address;
    }
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }

  formatBalance(balance: number, decimals: number = 9): string {
    return (balance / Math.pow(10, decimals)).toFixed(4);
  }

  private generateSignature(): string {
    return Array.from({ length: 88 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
  }

  private dispatchEvent(eventName: string, detail: any): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  }

  // Event listeners
  on(eventName: string, callback: (detail: any) => void): void {
    if (typeof window !== 'undefined') {
      window.addEventListener(eventName, (event: any) => callback(event.detail));
    }
  }

  off(eventName: string, callback: (detail: any) => void): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener(eventName, callback);
    }
  }
}

// Create and export a singleton instance
export const enhancedSolanaWalletService = new EnhancedSolanaWalletService();

// Extend window interface for additional wallet providers
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: string }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
      signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
      getAccount: () => Promise<{ publicKey: string }>;
    };
    solflare?: {
      connect: () => Promise<{ publicKey: string }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
      signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
      getAccount: () => Promise<{ publicKey: string }>;
    };
    backpack?: {
      connect: () => Promise<{ publicKey: string }>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
      signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
      getAccount: () => Promise<{ publicKey: string }>;
    };
  }
}

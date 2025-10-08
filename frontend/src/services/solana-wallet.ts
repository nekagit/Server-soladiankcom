/**
 * Solana Wallet Integration Service
 * Handles wallet connection, transactions, and Solana blockchain interactions
 */

export interface Wallet {
  publicKey: string;
  connected: boolean;
  name: string;
  icon: string;
}

export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  animation_url?: string;
  external_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    files: Array<{
      uri: string;
      type: string;
    }>;
    category: string;
  };
}

export interface TokenBalance {
  mint: string;
  amount: number;
  decimals: number;
  uiAmount: number;
  symbol?: string;
  name?: string;
}

class SolanaWalletService {
  private wallet: Wallet | null = null;
  private connection: any = null;
  private subscribers: ((wallet: Wallet | null) => void)[] = [];

  constructor() {
    this.initializeConnection();
    this.setupWalletListeners();
  }

  /**
   * Initialize Solana connection
   */
  private async initializeConnection() {
    if (typeof window === 'undefined') return;

    try {
      // Dynamic import to avoid SSR issues
      const { Connection, clusterApiUrl } = await import('@solana/web3.js');
      this.connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
    } catch (error) {
      console.error('Failed to initialize Solana connection:', error);
    }
  }

  /**
   * Setup wallet event listeners
   */
  private setupWalletListeners() {
    if (typeof window === 'undefined') return;

    // Listen for wallet changes
    window.addEventListener('solana#initialized', () => {
      this.detectWallets();
    });

    // Listen for account changes
    window.addEventListener('solana#accountChanged', (event: any) => {
      if (this.wallet) {
        this.wallet.publicKey = event.detail.publicKey;
        this.notifySubscribers();
      }
    });

    // Listen for disconnect
    window.addEventListener('solana#disconnect', () => {
      this.disconnect();
    });
  }

  /**
   * Detect available wallets
   */
  private detectWallets(): Wallet[] {
    const wallets: Wallet[] = [];

    // Phantom Wallet
    if ((window as any).solana?.isPhantom) {
      wallets.push({
        publicKey: '',
        connected: false,
        name: 'Phantom',
        icon: 'https://phantom.app/img/logo.png',
      });
    }

    // Solflare Wallet
    if ((window as any).solflare?.isSolflare) {
      wallets.push({
        publicKey: '',
        connected: false,
        name: 'Solflare',
        icon: 'https://solflare.com/favicon.ico',
      });
    }

    // Backpack Wallet
    if ((window as any).backpack) {
      wallets.push({
        publicKey: '',
        connected: false,
        name: 'Backpack',
        icon: 'https://backpack.app/favicon.ico',
      });
    }

    return wallets;
  }

  /**
   * Get available wallets
   */
  getAvailableWallets(): Wallet[] {
    return this.detectWallets();
  }

  /**
   * Connect to wallet
   */
  async connectWallet(walletName: string): Promise<{ success: boolean; error?: string }> {
    try {
      let provider: any = null;

      switch (walletName.toLowerCase()) {
        case 'phantom':
          provider = (window as any).solana;
          break;
        case 'solflare':
          provider = (window as any).solflare;
          break;
        case 'backpack':
          provider = (window as any).backpack;
          break;
        default:
          throw new Error('Unsupported wallet');
      }

      if (!provider) {
        throw new Error(`${walletName} wallet not found`);
      }

      // Request connection
      const response = await provider.connect();

      this.wallet = {
        publicKey: response.publicKey.toString(),
        connected: true,
        name: walletName,
        icon: this.detectWallets().find(w => w.name === walletName)?.icon || '',
      };

      this.notifySubscribers();
      return { success: true };
    } catch (error) {
      console.error('Wallet connection failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    if (this.wallet) {
      try {
        const provider = this.getProvider();
        if (provider && provider.disconnect) {
          await provider.disconnect();
        }
      } catch (error) {
        console.error('Wallet disconnect failed:', error);
      }
    }

    this.wallet = null;
    this.notifySubscribers();
  }

  /**
   * Get current wallet
   */
  getWallet(): Wallet | null {
    return this.wallet;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.wallet?.connected || false;
  }

  /**
   * Get wallet provider
   */
  private getProvider(): any {
    if (!this.wallet) return null;

    switch (this.wallet.name.toLowerCase()) {
      case 'phantom':
        return (window as any).solana;
      case 'solflare':
        return (window as any).solflare;
      case 'backpack':
        return (window as any).backpack;
      default:
        return null;
    }
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<number> {
    if (!this.wallet || !this.connection) {
      throw new Error('Wallet not connected');
    }

    try {
      const { PublicKey } = await import('@solana/web3.js');
      const publicKey = new PublicKey(this.wallet.publicKey);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Get token balances
   */
  async getTokenBalances(): Promise<TokenBalance[]> {
    if (!this.wallet || !this.connection) {
      throw new Error('Wallet not connected');
    }

    try {
      const { PublicKey } = await import('@solana/web3.js');
      const publicKey = new PublicKey(this.wallet.publicKey);

      // Get token accounts
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      return tokenAccounts.value.map(account => {
        const parsed = account.account.data.parsed.info;
        return {
          mint: parsed.mint,
          amount: parsed.tokenAmount.amount,
          decimals: parsed.tokenAmount.decimals,
          uiAmount: parsed.tokenAmount.uiAmount,
        };
      });
    } catch (error) {
      console.error('Failed to get token balances:', error);
      throw error;
    }
  }

  /**
   * Send SOL transaction
   */
  async sendSOL(to: string, amount: number): Promise<TransactionResult> {
    if (!this.wallet || !this.connection) {
      throw new Error('Wallet not connected');
    }

    try {
      const {
        PublicKey,
        Transaction,
        SystemProgram,
        LAMPORTS_PER_SOL
      } = await import('@solana/web3.js');

      const fromPubkey = new PublicKey(this.wallet.publicKey);
      const toPubkey = new PublicKey(to);
      const lamports = amount * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      const provider = this.getProvider();
      const { signature } = await provider.signAndSendTransaction(transaction);

      return { signature, success: true };
    } catch (error) {
      console.error('SOL transaction failed:', error);
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    }
  }

  /**
   * Sign message
   */
  async signMessage(message: string): Promise<{ signature: string; success: boolean; error?: string }> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const provider = this.getProvider();
      const encodedMessage = new TextEncoder().encode(message);
      const { signature } = await provider.signMessage(encodedMessage);

      return { signature: signature.toString(), success: true };
    } catch (error) {
      console.error('Message signing failed:', error);
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Signing failed'
      };
    }
  }

  /**
   * Create NFT
   */
  async createNFT(metadata: NFTMetadata): Promise<TransactionResult> {
    if (!this.wallet || !this.connection) {
      throw new Error('Wallet not connected');
    }

    try {
      // This is a simplified implementation
      // In a real app, you would use a proper NFT creation service
      const { PublicKey, Transaction } = await import('@solana/web3.js');

      // Mock NFT creation - replace with actual implementation
      const transaction = new Transaction();

      const provider = this.getProvider();
      const { signature } = await provider.signAndSendTransaction(transaction);

      return { signature, success: true };
    } catch (error) {
      console.error('NFT creation failed:', error);
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'NFT creation failed'
      };
    }
  }

  /**
   * Buy NFT
   */
  async buyNFT(nftId: string, price: number): Promise<TransactionResult> {
    if (!this.wallet || !this.connection) {
      throw new Error('Wallet not connected');
    }

    try {
      // Mock NFT purchase - replace with actual marketplace contract interaction
      const { Transaction } = await import('@solana/web3.js');

      const transaction = new Transaction();

      const provider = this.getProvider();
      const { signature } = await provider.signAndSendTransaction(transaction);

      return { signature, success: true };
    } catch (error) {
      console.error('NFT purchase failed:', error);
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Purchase failed'
      };
    }
  }

  /**
   * Place bid on NFT
   */
  async placeBid(nftId: string, bidAmount: number): Promise<TransactionResult> {
    if (!this.wallet || !this.connection) {
      throw new Error('Wallet not connected');
    }

    try {
      // Mock bid placement - replace with actual auction contract interaction
      const { Transaction } = await import('@solana/web3.js');

      const transaction = new Transaction();

      const provider = this.getProvider();
      const { signature } = await provider.signAndSendTransaction(transaction);

      return { signature, success: true };
    } catch (error) {
      console.error('Bid placement failed:', error);
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Bid failed'
      };
    }
  }

  /**
   * Subscribe to wallet changes
   */
  subscribe(callback: (wallet: Wallet | null) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  /**
   * Notify subscribers
   */
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.wallet));
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit: number = 10): Promise<any[]> {
    if (!this.wallet || !this.connection) {
      throw new Error('Wallet not connected');
    }

    try {
      const { PublicKey } = await import('@solana/web3.js');
      const publicKey = new PublicKey(this.wallet.publicKey);

      const signatures = await this.connection.getSignaturesForAddress(publicKey, { limit });

      return signatures.map(sig => ({
        signature: sig.signature,
        slot: sig.slot,
        blockTime: sig.blockTime,
        confirmationStatus: sig.confirmationStatus,
        err: sig.err,
      }));
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      throw error;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; network: string } {
    return {
      connected: this.isConnected(),
      network: 'mainnet-beta',
    };
  }
}

// Create singleton instance
export const solanaWalletService = new SolanaWalletService();

// Export for global access
if (typeof window !== 'undefined') {
  (window as any).solanaWalletService = solanaWalletService;
}

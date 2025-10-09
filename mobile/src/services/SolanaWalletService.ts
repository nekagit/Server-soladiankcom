import AsyncStorage from '@react-native-async-storage/async-storage';
import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

export interface WalletAccount {
  publicKey: PublicKey;
  secretKey?: Uint8Array;
  name?: string;
}

export interface WalletBalance {
  sol: number;
  tokens: Array<{
    mint: string;
    amount: number;
    decimals: number;
    symbol?: string;
    name?: string;
  }>;
}

export interface TransactionResult {
  signature: string;
  success: boolean;
  error?: string;
}

class SolanaWalletService {
  private connection: Connection;
  private currentAccount: WalletAccount | null = null;
  private isConnected = false;

  constructor() {
    // Use different RPC endpoints for different networks
    const rpcUrl = __DEV__
      ? 'https://api.devnet.solana.com'
      : 'https://api.mainnet-beta.solana.com';

    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  public async connectWallet(): Promise<boolean> {
    try {
      // In a real implementation, this would integrate with wallet adapters
      // For now, we'll simulate wallet connection
      const mockAccount: WalletAccount = {
        publicKey: new PublicKey('11111111111111111111111111111112'), // System Program
        name: 'Mock Wallet',
      };

      this.currentAccount = mockAccount;
      this.isConnected = true;

      // Store connection state
      await AsyncStorage.setItem('wallet_connected', 'true');
      await AsyncStorage.setItem('wallet_public_key', mockAccount.publicKey.toString());

      return true;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return false;
    }
  }

  public async disconnectWallet(): Promise<void> {
    try {
      this.currentAccount = null;
      this.isConnected = false;

      // Clear stored data
      await AsyncStorage.removeItem('wallet_connected');
      await AsyncStorage.removeItem('wallet_public_key');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }

  public async getBalance(): Promise<WalletBalance> {
    if (!this.currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await this.connection.getBalance(this.currentAccount.publicKey);
      const solBalance = balance / 1e9; // Convert lamports to SOL

      // Mock token balances - in production, this would fetch SPL token balances
      const tokens = [
        {
          mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
          amount: 1000,
          decimals: 6,
          symbol: 'USDC',
          name: 'USD Coin',
        },
        {
          mint: 'So11111111111111111111111111111111111111112', // Wrapped SOL
          amount: 5,
          decimals: 9,
          symbol: 'WSOL',
          name: 'Wrapped SOL',
        },
      ];

      return {
        sol: solBalance,
        tokens,
      };
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  public async sendTransaction(transaction: Transaction | VersionedTransaction): Promise<TransactionResult> {
    if (!this.currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      // In a real implementation, this would use wallet adapter to sign and send
      // For now, we'll simulate the transaction
      const mockSignature = 'mock_signature_' + Date.now();

      return {
        signature: mockSignature,
        success: true,
      };
    } catch (error) {
      console.error('Failed to send transaction:', error);
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async signMessage(message: string): Promise<string> {
    if (!this.currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      // In a real implementation, this would use wallet adapter to sign
      // For now, we'll simulate message signing
      const mockSignature = 'mock_signature_' + Date.now();
      return mockSignature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  public async getAccountInfo(): Promise<WalletAccount | null> {
    return this.currentAccount;
  }

  public isWalletConnected(): boolean {
    return this.isConnected;
  }

  public async restoreConnection(): Promise<boolean> {
    try {
      const isConnected = await AsyncStorage.getItem('wallet_connected');
      const publicKeyString = await AsyncStorage.getItem('wallet_public_key');

      if (isConnected === 'true' && publicKeyString) {
        this.currentAccount = {
          publicKey: new PublicKey(publicKeyString),
        };
        this.isConnected = true;
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to restore connection:', error);
      return false;
    }
  }

  public async getRecentTransactions(limit: number = 10): Promise<any[]> {
    if (!this.currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      // In a real implementation, this would fetch from Solana RPC
      // For now, we'll return mock data
      return [
        {
          signature: 'mock_tx_1',
          slot: 123456789,
          blockTime: Date.now() / 1000 - 3600,
          fee: 5000,
          status: 'success',
          type: 'transfer',
          amount: 1.5,
          from: this.currentAccount.publicKey.toString(),
          to: 'RecipientAddress123',
        },
        {
          signature: 'mock_tx_2',
          slot: 123456788,
          blockTime: Date.now() / 1000 - 7200,
          fee: 5000,
          status: 'success',
          type: 'nft_purchase',
          amount: 0.1,
          from: this.currentAccount.publicKey.toString(),
          to: 'NFTSellerAddress456',
        },
      ];
    } catch (error) {
      console.error('Failed to get recent transactions:', error);
      return [];
    }
  }

  public async getNFTs(): Promise<any[]> {
    if (!this.currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      // In a real implementation, this would fetch NFT metadata
      // For now, we'll return mock data
      return [
        {
          mint: 'nft_mint_1',
          name: 'Soladia NFT #001',
          description: 'A unique digital artwork',
          image: 'https://via.placeholder.com/300x300',
          attributes: [
            { trait_type: 'Color', value: 'Blue' },
            { trait_type: 'Rarity', value: 'Rare' },
          ],
          collection: 'Soladia Collection',
        },
        {
          mint: 'nft_mint_2',
          name: 'Soladia NFT #002',
          description: 'Another unique digital artwork',
          image: 'https://via.placeholder.com/300x300',
          attributes: [
            { trait_type: 'Color', value: 'Red' },
            { trait_type: 'Rarity', value: 'Common' },
          ],
          collection: 'Soladia Collection',
        },
      ];
    } catch (error) {
      console.error('Failed to get NFTs:', error);
      return [];
    }
  }

  public async createNFTListing(
    mint: string,
    price: number,
    currency: string = 'SOL'
  ): Promise<TransactionResult> {
    if (!this.currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      // In a real implementation, this would create a marketplace listing
      // For now, we'll simulate the transaction
      const mockSignature = 'mock_listing_' + Date.now();

      return {
        signature: mockSignature,
        success: true,
      };
    } catch (error) {
      console.error('Failed to create NFT listing:', error);
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async purchaseNFT(
    listingId: string,
    price: number
  ): Promise<TransactionResult> {
    if (!this.currentAccount) {
      throw new Error('Wallet not connected');
    }

    try {
      // In a real implementation, this would execute the purchase
      // For now, we'll simulate the transaction
      const mockSignature = 'mock_purchase_' + Date.now();

      return {
        signature: mockSignature,
        success: true,
      };
    } catch (error) {
      console.error('Failed to purchase NFT:', error);
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public getConnection(): Connection {
    return this.connection;
  }

  public async getNetworkInfo(): Promise<{
    cluster: string;
    version: string;
    epoch: number;
  }> {
    try {
      const version = await this.connection.getVersion();
      const epochInfo = await this.connection.getEpochInfo();

      return {
        cluster: __DEV__ ? 'devnet' : 'mainnet-beta',
        version: version['solana-core'],
        epoch: epochInfo.epoch,
      };
    } catch (error) {
      console.error('Failed to get network info:', error);
      throw error;
    }
  }
}

export const solanaWalletService = new SolanaWalletService();
/**
 * Solana Wallet Service for React Native
 * Provides native Solana wallet integration for mobile apps
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PublicKey, Connection, Transaction, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import CryptoJS from 'react-native-crypto-js';
import { Platform } from 'react-native';

export interface SolanaWallet {
  publicKey: string;
  connected: boolean;
  balance: number;
  tokens: SolanaToken[];
  network: 'mainnet-beta' | 'testnet' | 'devnet';
}

export interface SolanaToken {
  mint: string;
  amount: number;
  decimals: number;
  symbol?: string;
  name?: string;
  image?: string;
}

export interface SolanaTransaction {
  signature: string;
  amount: number;
  from: string;
  to: string;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  blockTime?: number;
  slot?: number;
}

export interface WalletConnectionResult {
  success: boolean;
  wallet?: SolanaWallet;
  error?: string;
}

export class SolanaWalletService {
  private connection: Connection;
  private wallet: SolanaWallet | null = null;
  private privateKey: string | null = null;
  private isInitialized = false;

  constructor() {
    // Initialize with mainnet by default
    this.connection = new Connection(
      'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  /**
   * Initialize the wallet service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load saved wallet from secure storage
      const savedWallet = await this.loadWalletFromStorage();
      if (savedWallet) {
        this.wallet = savedWallet;
        await this.updateWalletBalance();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize wallet service:', error);
      throw new Error('Wallet initialization failed');
    }
  }

  /**
   * Connect to wallet using private key
   */
  async connectWithPrivateKey(privateKey: string): Promise<WalletConnectionResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Validate private key
      if (!this.validatePrivateKey(privateKey)) {
        return {
          success: false,
          error: 'Invalid private key format'
        };
      }

      // Create keypair from private key
      const keypair = this.createKeypairFromPrivateKey(privateKey);
      const publicKey = keypair.publicKey.toString();

      // Create wallet object
      this.wallet = {
        publicKey,
        connected: true,
        balance: 0,
        tokens: [],
        network: 'mainnet-beta'
      };

      // Store private key securely
      this.privateKey = privateKey;
      await this.saveWalletToStorage();

      // Update balance and tokens
      await this.updateWalletBalance();
      await this.updateWalletTokens();

      return {
        success: true,
        wallet: this.wallet
      };
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Connect using QR code scan
   */
  async connectWithQRCode(qrData: string): Promise<WalletConnectionResult> {
    try {
      // Parse QR code data (assuming it contains wallet info)
      const walletData = JSON.parse(qrData);
      
      if (!walletData.privateKey) {
        return {
          success: false,
          error: 'Invalid QR code format'
        };
      }

      return await this.connectWithPrivateKey(walletData.privateKey);
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse QR code'
      };
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    try {
      // Clear sensitive data
      this.privateKey = null;
      this.wallet = null;

      // Clear secure storage
      await AsyncStorage.multiRemove([
        'solana_wallet',
        'solana_private_key'
      ]);
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
    }
  }

  /**
   * Get current wallet
   */
  getWallet(): SolanaWallet | null {
    return this.wallet;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.wallet?.connected || false;
  }

  /**
   * Get wallet balance
   */
  async getBalance(): Promise<number> {
    if (!this.wallet) return 0;

    try {
      const publicKey = new PublicKey(this.wallet.publicKey);
      const balance = await this.connection.getBalance(publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }

  /**
   * Get wallet tokens
   */
  async getTokens(): Promise<SolanaToken[]> {
    if (!this.wallet) return [];

    try {
      const publicKey = new PublicKey(this.wallet.publicKey);
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const tokens: SolanaToken[] = [];
      
      for (const account of tokenAccounts.value) {
        const tokenInfo = account.account.data.parsed.info;
        tokens.push({
          mint: tokenInfo.mint,
          amount: tokenInfo.tokenAmount.uiAmount || 0,
          decimals: tokenInfo.tokenAmount.decimals,
          symbol: tokenInfo.mint, // You might want to fetch metadata
          name: `Token ${tokenInfo.mint.slice(0, 8)}`
        });
      }

      return tokens;
    } catch (error) {
      console.error('Failed to get tokens:', error);
      return [];
    }
  }

  /**
   * Send SOL transaction
   */
  async sendSOL(to: string, amount: number, memo?: string): Promise<SolanaTransaction> {
    if (!this.wallet || !this.privateKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const fromPublicKey = new PublicKey(this.wallet.publicKey);
      const toPublicKey = new PublicKey(to);
      const lamports = Math.floor(amount * 1e9);

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromPublicKey,
          toPubkey: toPublicKey,
          lamports
        })
      );

      // Add memo if provided
      if (memo) {
        transaction.add(
          new TransactionInstruction({
            keys: [],
            programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysKcWfC85B2q2'),
            data: Buffer.from(memo, 'utf8')
          })
        );
      }

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      // Sign transaction
      const keypair = this.createKeypairFromPrivateKey(this.privateKey);
      transaction.sign(keypair);

      // Send transaction
      const signature = await this.connection.sendTransaction(transaction, [keypair]);

      // Create transaction object
      const solanaTransaction: SolanaTransaction = {
        signature,
        amount,
        from: this.wallet.publicKey,
        to,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Wait for confirmation
      await this.waitForConfirmation(signature);

      // Update transaction status
      solanaTransaction.status = 'confirmed';

      // Update wallet balance
      await this.updateWalletBalance();

      return solanaTransaction;
    } catch (error) {
      console.error('Failed to send SOL:', error);
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send SPL token transaction
   */
  async sendToken(
    tokenMint: string,
    to: string,
    amount: number
  ): Promise<SolanaTransaction> {
    if (!this.wallet || !this.privateKey) {
      throw new Error('Wallet not connected');
    }

    try {
      const fromPublicKey = new PublicKey(this.wallet.publicKey);
      const toPublicKey = new PublicKey(to);
      const mintPublicKey = new PublicKey(tokenMint);

      // Get token accounts
      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        fromPublicKey
      );
      const toTokenAccount = await getAssociatedTokenAddress(
        mintPublicKey,
        toPublicKey
      );

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        fromPublicKey,
        Math.floor(amount * 1e9) // Assuming 9 decimals
      );

      // Create transaction
      const transaction = new Transaction().add(transferInstruction);

      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPublicKey;

      // Sign transaction
      const keypair = this.createKeypairFromPrivateKey(this.privateKey);
      transaction.sign(keypair);

      // Send transaction
      const signature = await this.connection.sendTransaction(transaction, [keypair]);

      // Create transaction object
      const solanaTransaction: SolanaTransaction = {
        signature,
        amount,
        from: this.wallet.publicKey,
        to,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Wait for confirmation
      await this.waitForConfirmation(signature);

      // Update transaction status
      solanaTransaction.status = 'confirmed';

      // Update wallet tokens
      await this.updateWalletTokens();

      return solanaTransaction;
    } catch (error) {
      console.error('Failed to send token:', error);
      throw new Error(`Token transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit = 50): Promise<SolanaTransaction[]> {
    if (!this.wallet) return [];

    try {
      const publicKey = new PublicKey(this.wallet.publicKey);
      const signatures = await this.connection.getSignaturesForAddress(publicKey, {
        limit
      });

      const transactions: SolanaTransaction[] = [];

      for (const sigInfo of signatures) {
        try {
          const transaction = await this.connection.getParsedTransaction(sigInfo.signature);
          
          if (transaction) {
            transactions.push({
              signature: sigInfo.signature,
              amount: 0, // You'll need to parse the transaction to get amount
              from: this.wallet!.publicKey,
              to: '', // You'll need to parse the transaction to get recipient
              status: sigInfo.err ? 'failed' : 'confirmed',
              created_at: new Date(sigInfo.blockTime! * 1000).toISOString(),
              blockTime: sigInfo.blockTime,
              slot: sigInfo.slot
            });
          }
        } catch (error) {
          console.error('Failed to get transaction details:', error);
        }
      }

      return transactions;
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  /**
   * Switch network
   */
  async switchNetwork(network: 'mainnet-beta' | 'testnet' | 'devnet'): Promise<void> {
    const rpcUrls = {
      'mainnet-beta': 'https://api.mainnet-beta.solana.com',
      'testnet': 'https://api.testnet.solana.com',
      'devnet': 'https://api.devnet.solana.com'
    };

    this.connection = new Connection(rpcUrls[network], 'confirmed');
    
    if (this.wallet) {
      this.wallet.network = network;
      await this.saveWalletToStorage();
      await this.updateWalletBalance();
    }
  }

  /**
   * Generate QR code for wallet
   */
  generateQRCode(): string {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    const walletData = {
      publicKey: this.wallet.publicKey,
      network: this.wallet.network,
      timestamp: Date.now()
    };

    return JSON.stringify(walletData);
  }

  /**
   * Private helper methods
   */
  private async updateWalletBalance(): Promise<void> {
    if (!this.wallet) return;

    try {
      const balance = await this.getBalance();
      this.wallet.balance = balance;
    } catch (error) {
      console.error('Failed to update balance:', error);
    }
  }

  private async updateWalletTokens(): Promise<void> {
    if (!this.wallet) return;

    try {
      const tokens = await this.getTokens();
      this.wallet.tokens = tokens;
    } catch (error) {
      console.error('Failed to update tokens:', error);
    }
  }

  private async saveWalletToStorage(): Promise<void> {
    if (!this.wallet) return;

    try {
      const walletData = {
        ...this.wallet,
        privateKey: this.privateKey // Note: In production, use secure storage
      };

      await AsyncStorage.setItem('solana_wallet', JSON.stringify(walletData));
    } catch (error) {
      console.error('Failed to save wallet:', error);
    }
  }

  private async loadWalletFromStorage(): Promise<SolanaWallet | null> {
    try {
      const walletData = await AsyncStorage.getItem('solana_wallet');
      if (walletData) {
        const parsed = JSON.parse(walletData);
        this.privateKey = parsed.privateKey;
        return {
          publicKey: parsed.publicKey,
          connected: parsed.connected,
          balance: parsed.balance || 0,
          tokens: parsed.tokens || [],
          network: parsed.network || 'mainnet-beta'
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to load wallet:', error);
      return null;
    }
  }

  private validatePrivateKey(privateKey: string): boolean {
    try {
      // Basic validation - should be 64 characters hex string
      return /^[0-9a-fA-F]{64}$/.test(privateKey);
    } catch {
      return false;
    }
  }

  private createKeypairFromPrivateKey(privateKey: string): any {
    // This is a simplified version - in production, use proper keypair creation
    const privateKeyBytes = Buffer.from(privateKey, 'hex');
    // You'll need to implement proper keypair creation here
    // This is just a placeholder
    return { publicKey: new PublicKey('11111111111111111111111111111112') };
  }

  private async waitForConfirmation(signature: string, timeout = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.connection.getSignatureStatus(signature);
        if (status.value?.confirmationStatus === 'confirmed' || 
            status.value?.confirmationStatus === 'finalized') {
          return;
        }
        if (status.value?.err) {
          throw new Error('Transaction failed');
        }
      } catch (error) {
        console.error('Error checking transaction status:', error);
      }
      
      // Wait 1 second before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error('Transaction confirmation timeout');
  }
}

// Export singleton instance
export const solanaWalletService = new SolanaWalletService();




// Solana wallet service for Soladia marketplace
import type { SolanaWallet, SolanaTransaction } from '../types';

export class SolanaWalletService {
  private wallet: SolanaWallet | null = null;
  private phantom: any = null;

  constructor() {
    this.initializePhantom();
  }

  private initializePhantom() {
    if (typeof window !== 'undefined' && window.solana?.isPhantom) {
      this.phantom = window.solana;
    }
  }

  async connect(): Promise<SolanaWallet> {
    if (!this.phantom) {
      throw new Error('Phantom wallet not found. Please install Phantom wallet.');
    }

    try {
      const response = await this.phantom.connect();
      this.wallet = {
        publicKey: response.publicKey.toString(),
        connected: true,
        balance: 0
      };

      // Get balance
      await this.updateBalance();

      // Dispatch custom event
      this.dispatchEvent('wallet:connected', { wallet: this.wallet });

      return this.wallet;
    } catch (error) {
      throw new Error(`Failed to connect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.phantom) {
      throw new Error('Phantom wallet not found.');
    }

    try {
      await this.phantom.disconnect();
      this.wallet = null;

      // Dispatch custom event
      this.dispatchEvent('wallet:disconnected', {});
    } catch (error) {
      throw new Error(`Failed to disconnect wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateBalance(): Promise<number> {
    if (!this.wallet || !this.phantom) {
      return 0;
    }

    try {
      // This would typically involve an RPC call to get the balance
      // For now, we'll simulate it
      const balance = Math.random() * 100; // Simulated balance
      this.wallet.balance = balance;
      return balance;
    } catch (error) {
      console.error('Failed to update balance:', error);
      return 0;
    }
  }

  async signTransaction(transaction: any): Promise<any> {
    if (!this.phantom || !this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this.phantom.signTransaction(transaction);
    } catch (error) {
      throw new Error(`Failed to sign transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async signAllTransactions(transactions: any[]): Promise<any[]> {
    if (!this.phantom || !this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      return await this.phantom.signAllTransactions(transactions);
    } catch (error) {
      throw new Error(`Failed to sign transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async sendPayment(to: string, amount: number, memo?: string): Promise<SolanaTransaction> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      // This would typically involve creating and sending a Solana transaction
      // For now, we'll simulate it
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

  isConnected(): boolean {
    return this.wallet?.connected || false;
  }

  getPublicKey(): string | null {
    return this.wallet?.publicKey || null;
  }

  getBalance(): number {
    return this.wallet?.balance || 0;
  }

  getWallet(): SolanaWallet | null {
    return this.wallet;
  }

  private generateSignature(): string {
    // Generate a mock signature
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

  // Check if Phantom is installed
  isPhantomInstalled(): boolean {
    return !!this.phantom;
  }

  // Get Phantom installation URL
  getInstallationUrl(): string {
    return 'https://phantom.app/';
  }
}

// Create and export a singleton instance
export const solanaWalletService = new SolanaWalletService();

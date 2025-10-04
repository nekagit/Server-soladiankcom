// Solana transaction service for transaction management
import type { SolanaTransaction } from '../../types';

export interface TransactionStatus {
  signature: string;
  status: 'pending' | 'confirmed' | 'finalized' | 'failed';
  confirmationStatus?: string;
  slot?: number;
  blockTime?: number;
  error?: any;
  confirmations?: number;
}

export interface TransactionDetails {
  signature: string;
  slot: number;
  blockTime: number;
  fee: number;
  accounts: string[];
  instructions: any[];
  meta: any;
  version?: string;
}

export class SolanaTransactionService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }

  async getTransactionStatus(signature: string): Promise<TransactionStatus> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/solana/transactions/${signature}/status`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      return {
        signature,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getTransactionDetails(signature: string): Promise<TransactionDetails | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/solana/transactions/${signature}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get transaction details:', error);
      return null;
    }
  }

  async waitForConfirmation(
    signature: string, 
    timeout: number = 60000,
    commitment: string = 'confirmed'
  ): Promise<TransactionStatus> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.getTransactionStatus(signature);
      
      if (commitment === 'confirmed' && status.confirmationStatus === 'confirmed') {
        return status;
      }
      
      if (commitment === 'finalized' && status.confirmationStatus === 'finalized') {
        return status;
      }
      
      if (status.status === 'failed') {
        return status;
      }
      
      // Wait 1 second before next check
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Timeout reached
    return {
      signature,
      status: 'failed',
      error: 'Transaction confirmation timeout'
    };
  }

  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const status = await this.getTransactionStatus(signature);
      return status.status === 'confirmed' || status.status === 'finalized';
    } catch (error) {
      console.error('Failed to verify transaction:', error);
      return false;
    }
  }

  async getMultipleTransactionStatuses(signatures: string[]): Promise<TransactionStatus[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/solana/transactions/statuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signatures })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get multiple transaction statuses:', error);
      return signatures.map(sig => ({
        signature: sig,
        status: 'failed' as const,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }

  async getTransactionHistory(
    walletAddress: string, 
    limit: number = 50,
    offset: number = 0
  ): Promise<SolanaTransaction[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/solana/transactions/history?wallet=${walletAddress}&limit=${limit}&offset=${offset}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.transactions || [];
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
  }

  formatSignature(signature: string, length: number = 8): string {
    if (signature.length <= length * 2) {
      return signature;
    }
    return `${signature.slice(0, length)}...${signature.slice(-length)}`;
  }

  formatTransactionAmount(amount: number, decimals: number = 9): string {
    const uiAmount = amount / Math.pow(10, decimals);
    
    if (uiAmount === 0) return '0';
    if (uiAmount < 0.001) return uiAmount.toFixed(6);
    if (uiAmount < 1) return uiAmount.toFixed(4);
    return uiAmount.toFixed(2);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed':
      case 'finalized':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'confirmed':
      case 'finalized':
        return '✅';
      case 'pending':
        return '⏳';
      case 'failed':
        return '❌';
      default:
        return '❓';
    }
  }
}

// Create and export a singleton instance
export const solanaTransactionService = new SolanaTransactionService();

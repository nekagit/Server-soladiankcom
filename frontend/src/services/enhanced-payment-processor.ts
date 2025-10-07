/**
 * Enhanced Payment Processor Service
 * Comprehensive payment processing with Solana integration
 */

import { solanaService } from './solana';
import { enhancedWalletService } from './enhanced-wallet-service';

export interface PaymentRequest {
  amount: number;
  currency: 'SOL' | 'USDC' | 'USDT' | 'RAY' | 'SRM';
  recipient: string;
  memo?: string;
  reference?: string;
}

export interface PaymentResponse {
  success: boolean;
  signature?: string;
  transactionId?: string;
  error?: string;
  details?: {
    amount: number;
    currency: string;
    recipient: string;
    fee: number;
    network: string;
    timestamp: number;
  };
}

export interface PaymentStatus {
  confirmed: boolean;
  success: boolean;
  signature: string;
  blockTime?: number;
  slot?: number;
  error?: string;
}

export interface EscrowPayment {
  escrowAddress: string;
  amount: number;
  currency: string;
  buyer: string;
  seller: string;
  status: 'pending' | 'funded' | 'released' | 'cancelled';
  createdAt: number;
  expiresAt: number;
}

export interface AuctionBid {
  auctionId: string;
  bidder: string;
  amount: number;
  currency: string;
  timestamp: number;
  signature: string;
}

export class EnhancedPaymentProcessor {
  private paymentHistory: PaymentResponse[] = [];
  private escrowPayments: Map<string, EscrowPayment> = new Map();
  private auctionBids: Map<string, AuctionBid[]> = new Map();

  constructor() {
    this.loadPaymentHistory();
  }

  /**
   * Process SOL payment
   */
  async processSOLPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      if (!enhancedWalletService.isConnected()) {
        throw new Error('Wallet not connected');
      }

      if (request.currency !== 'SOL') {
        throw new Error('Invalid currency for SOL payment');
      }

      const walletAddress = enhancedWalletService.getAddress();
      if (!walletAddress) {
        throw new Error('Wallet address not available');
      }

      // Validate payment amount
      if (request.amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      // Check wallet balance
      const balance = enhancedWalletService.getBalance();
      if (balance < request.amount) {
        throw new Error('Insufficient SOL balance');
      }

      // Create transfer transaction
      const transactionData = {
        from_address: walletAddress,
        to_address: request.recipient,
        amount: request.amount,
        memo: request.memo,
        reference: request.reference
      };

      const response = await solanaService.createTransferTransaction(transactionData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create transaction');
      }

      // Sign transaction
      const signedTransaction = await enhancedWalletService.signTransaction(response.data.transaction);
      
      // Send transaction
      const sendResponse = await solanaService.sendTransaction(signedTransaction);
      
      if (!sendResponse.success) {
        throw new Error(sendResponse.error || 'Failed to send transaction');
      }

      const paymentResponse: PaymentResponse = {
        success: true,
        signature: sendResponse.data.signature,
        transactionId: sendResponse.data.signature,
        details: {
          amount: request.amount,
          currency: request.currency,
          recipient: request.recipient,
          fee: response.data.fee || 0.000005, // Default fee
          network: enhancedWalletService.getNetwork(),
          timestamp: Date.now()
        }
      };

      this.paymentHistory.push(paymentResponse);
      this.savePaymentHistory();

      return paymentResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const paymentResponse: PaymentResponse = {
        success: false,
        error: errorMessage
      };

      this.paymentHistory.push(paymentResponse);
      this.savePaymentHistory();

      return paymentResponse;
    }
  }

  /**
   * Process SPL token payment
   */
  async processSPLTokenPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      if (!enhancedWalletService.isConnected()) {
        throw new Error('Wallet not connected');
      }

      if (request.currency === 'SOL') {
        throw new Error('Use processSOLPayment for SOL payments');
      }

      const walletAddress = enhancedWalletService.getAddress();
      if (!walletAddress) {
        throw new Error('Wallet address not available');
      }

      // Get token mint address
      const tokenMint = this.getTokenMintAddress(request.currency);
      if (!tokenMint) {
        throw new Error(`Unsupported currency: ${request.currency}`);
      }

      // Validate payment amount
      if (request.amount <= 0) {
        throw new Error('Invalid payment amount');
      }

      // Check token balance
      const tokenBalance = await this.getTokenBalance(walletAddress, tokenMint);
      if (tokenBalance < request.amount) {
        throw new Error(`Insufficient ${request.currency} balance`);
      }

      // Create token transfer transaction
      const transferData = {
        mint: tokenMint,
        from_address: walletAddress,
        to_address: request.recipient,
        amount: request.amount,
        memo: request.memo,
        reference: request.reference
      };

      const response = await solanaService.transferToken(transferData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create token transfer');
      }

      // Sign transaction
      const signedTransaction = await enhancedWalletService.signTransaction(response.data.transaction);
      
      // Send transaction
      const sendResponse = await solanaService.sendTransaction(signedTransaction);
      
      if (!sendResponse.success) {
        throw new Error(sendResponse.error || 'Failed to send transaction');
      }

      const paymentResponse: PaymentResponse = {
        success: true,
        signature: sendResponse.data.signature,
        transactionId: sendResponse.data.signature,
        details: {
          amount: request.amount,
          currency: request.currency,
          recipient: request.recipient,
          fee: response.data.fee || 0.000005,
          network: enhancedWalletService.getNetwork(),
          timestamp: Date.now()
        }
      };

      this.paymentHistory.push(paymentResponse);
      this.savePaymentHistory();

      return paymentResponse;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const paymentResponse: PaymentResponse = {
        success: false,
        error: errorMessage
      };

      this.paymentHistory.push(paymentResponse);
      this.savePaymentHistory();

      return paymentResponse;
    }
  }

  /**
   * Process payment with automatic currency detection
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (request.currency === 'SOL') {
      return this.processSOLPayment(request);
    } else {
      return this.processSPLTokenPayment(request);
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(signature: string): Promise<PaymentStatus> {
    try {
      const response = await solanaService.verifyTransaction(signature);
      
      if (!response.success) {
        return {
          confirmed: false,
          success: false,
          signature,
          error: response.error
        };
      }

      return {
        confirmed: response.data.confirmed,
        success: response.data.success,
        signature,
        blockTime: response.data.blockTime,
        slot: response.data.slot,
        error: response.data.error
      };

    } catch (error) {
      return {
        confirmed: false,
        success: false,
        signature,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Create escrow payment
   */
  async createEscrowPayment(
    amount: number,
    currency: string,
    seller: string,
    expiresInHours: number = 24
  ): Promise<EscrowPayment> {
    try {
      if (!enhancedWalletService.isConnected()) {
        throw new Error('Wallet not connected');
      }

      const buyer = enhancedWalletService.getAddress();
      if (!buyer) {
        throw new Error('Wallet address not available');
      }

      const escrowData = {
        amount,
        currency,
        buyer,
        seller,
        expires_in_hours: expiresInHours
      };

      const response = await solanaService.createEscrow(escrowData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create escrow');
      }

      const escrowPayment: EscrowPayment = {
        escrowAddress: response.data.escrow_address,
        amount,
        currency,
        buyer,
        seller,
        status: 'pending',
        createdAt: Date.now(),
        expiresAt: Date.now() + (expiresInHours * 60 * 60 * 1000)
      };

      this.escrowPayments.set(escrowPayment.escrowAddress, escrowPayment);
      this.saveEscrowPayments();

      return escrowPayment;

    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to create escrow payment');
    }
  }

  /**
   * Fund escrow payment
   */
  async fundEscrow(escrowAddress: string): Promise<PaymentResponse> {
    try {
      const escrow = this.escrowPayments.get(escrowAddress);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (escrow.status !== 'pending') {
        throw new Error('Escrow is not in pending status');
      }

      const response = await solanaService.fundEscrow(escrowAddress);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fund escrow');
      }

      // Update escrow status
      escrow.status = 'funded';
      this.escrowPayments.set(escrowAddress, escrow);
      this.saveEscrowPayments();

      return {
        success: true,
        signature: response.data.signature,
        transactionId: response.data.signature,
        details: {
          amount: escrow.amount,
          currency: escrow.currency,
          recipient: escrow.seller,
          fee: response.data.fee || 0.000005,
          network: enhancedWalletService.getNetwork(),
          timestamp: Date.now()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fund escrow'
      };
    }
  }

  /**
   * Release escrow payment
   */
  async releaseEscrow(escrowAddress: string): Promise<PaymentResponse> {
    try {
      const escrow = this.escrowPayments.get(escrowAddress);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (escrow.status !== 'funded') {
        throw new Error('Escrow is not funded');
      }

      const response = await solanaService.releaseEscrow(escrowAddress);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to release escrow');
      }

      // Update escrow status
      escrow.status = 'released';
      this.escrowPayments.set(escrowAddress, escrow);
      this.saveEscrowPayments();

      return {
        success: true,
        signature: response.data.signature,
        transactionId: response.data.signature,
        details: {
          amount: escrow.amount,
          currency: escrow.currency,
          recipient: escrow.seller,
          fee: response.data.fee || 0.000005,
          network: enhancedWalletService.getNetwork(),
          timestamp: Date.now()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to release escrow'
      };
    }
  }

  /**
   * Cancel escrow payment
   */
  async cancelEscrow(escrowAddress: string): Promise<PaymentResponse> {
    try {
      const escrow = this.escrowPayments.get(escrowAddress);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (escrow.status === 'released') {
        throw new Error('Escrow has already been released');
      }

      const response = await solanaService.cancelEscrow(escrowAddress);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel escrow');
      }

      // Update escrow status
      escrow.status = 'cancelled';
      this.escrowPayments.set(escrowAddress, escrow);
      this.saveEscrowPayments();

      return {
        success: true,
        signature: response.data.signature,
        transactionId: response.data.signature,
        details: {
          amount: escrow.amount,
          currency: escrow.currency,
          recipient: escrow.buyer,
          fee: response.data.fee || 0.000005,
          network: enhancedWalletService.getNetwork(),
          timestamp: Date.now()
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel escrow'
      };
    }
  }

  /**
   * Place auction bid
   */
  async placeAuctionBid(
    auctionId: string,
    amount: number,
    currency: string
  ): Promise<AuctionBid> {
    try {
      if (!enhancedWalletService.isConnected()) {
        throw new Error('Wallet not connected');
      }

      const bidder = enhancedWalletService.getAddress();
      if (!bidder) {
        throw new Error('Wallet address not available');
      }

      const bidData = {
        auction_id: auctionId,
        bidder,
        amount,
        currency
      };

      const response = await solanaService.placeAuctionBid(bidData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to place bid');
      }

      const bid: AuctionBid = {
        auctionId,
        bidder,
        amount,
        currency,
        timestamp: Date.now(),
        signature: response.data.signature
      };

      // Add bid to auction
      const bids = this.auctionBids.get(auctionId) || [];
      bids.push(bid);
      this.auctionBids.set(auctionId, bids);
      this.saveAuctionBids();

      return bid;

    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to place auction bid');
    }
  }

  /**
   * Get payment history
   */
  getPaymentHistory(): PaymentResponse[] {
    return [...this.paymentHistory];
  }

  /**
   * Get escrow payments
   */
  getEscrowPayments(): EscrowPayment[] {
    return Array.from(this.escrowPayments.values());
  }

  /**
   * Get auction bids
   */
  getAuctionBids(auctionId?: string): AuctionBid[] {
    if (auctionId) {
      return this.auctionBids.get(auctionId) || [];
    }
    
    const allBids: AuctionBid[] = [];
    this.auctionBids.forEach(bids => {
      allBids.push(...bids);
    });
    
    return allBids;
  }

  /**
   * Get token mint address
   */
  private getTokenMintAddress(currency: string): string | null {
    const tokenMints: Record<string, string> = {
      'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
      'SRM': 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt'
    };

    return tokenMints[currency] || null;
  }

  /**
   * Get token balance
   */
  private async getTokenBalance(address: string, mint: string): Promise<number> {
    try {
      const response = await solanaService.getTokenBalance(address, mint);
      return response.success ? response.data.balance : 0;
    } catch (error) {
      console.warn('Failed to get token balance:', error);
      return 0;
    }
  }

  /**
   * Load payment history from localStorage
   */
  private loadPaymentHistory(): void {
    try {
      const saved = localStorage.getItem('soladia-payment-history');
      if (saved) {
        this.paymentHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load payment history:', error);
    }
  }

  /**
   * Save payment history to localStorage
   */
  private savePaymentHistory(): void {
    try {
      localStorage.setItem('soladia-payment-history', JSON.stringify(this.paymentHistory));
    } catch (error) {
      console.warn('Failed to save payment history:', error);
    }
  }

  /**
   * Save escrow payments to localStorage
   */
  private saveEscrowPayments(): void {
    try {
      const escrowArray = Array.from(this.escrowPayments.values());
      localStorage.setItem('soladia-escrow-payments', JSON.stringify(escrowArray));
    } catch (error) {
      console.warn('Failed to save escrow payments:', error);
    }
  }

  /**
   * Save auction bids to localStorage
   */
  private saveAuctionBids(): void {
    try {
      const bidsObject: Record<string, AuctionBid[]> = {};
      this.auctionBids.forEach((bids, auctionId) => {
        bidsObject[auctionId] = bids;
      });
      localStorage.setItem('soladia-auction-bids', JSON.stringify(bidsObject));
    } catch (error) {
      console.warn('Failed to save auction bids:', error);
    }
  }
}

// Create singleton instance
export const enhancedPaymentProcessor = new EnhancedPaymentProcessor();

// Export types
export type { PaymentRequest, PaymentResponse, PaymentStatus, EscrowPayment, AuctionBid };

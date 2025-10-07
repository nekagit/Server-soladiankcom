/**
 * Production-Grade Payment Processor Service
 * Complete payment processing with comprehensive error handling, retry logic, and state management
 */

import { productionWalletService } from './production-wallet-service';
import { solanaService } from './solana';

export interface PaymentRequest {
  id: string;
  type: 'sol' | 'spl' | 'escrow' | 'auction';
  amount: number;
  currency: string;
  recipient: string;
  memo?: string;
  metadata?: any;
  expiresAt?: number;
  retryCount?: number;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  signature?: string;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  error?: string;
  timestamp: number;
  fees?: number;
  network?: string;
}

export interface EscrowPayment {
  id: string;
  amount: number;
  currency: string;
  buyer: string;
  seller: string;
  status: 'created' | 'funded' | 'released' | 'cancelled';
  createdAt: number;
  expiresAt: number;
  metadata?: any;
}

export interface AuctionBid {
  id: string;
  auctionId: string;
  bidder: string;
  amount: number;
  currency: string;
  status: 'active' | 'outbid' | 'won' | 'cancelled';
  timestamp: number;
  signature?: string;
}

export interface PaymentState {
  processing: boolean;
  currentPayment: PaymentRequest | null;
  paymentHistory: PaymentResponse[];
  escrowPayments: EscrowPayment[];
  auctionBids: AuctionBid[];
  error: string | null;
  lastUpdated: number;
}

export interface PaymentError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: number;
}

export class ProductionPaymentProcessor {
  private state: PaymentState = {
    processing: false,
    currentPayment: null,
    paymentHistory: [],
    escrowPayments: [],
    auctionBids: [],
    error: null,
    lastUpdated: 0
  };

  private listeners: Set<(state: PaymentState) => void> = new Set();
  private retryQueue: PaymentRequest[] = [];
  private maxRetries = 3;
  private retryDelay = 1000;
  private maxRetryDelay = 30000;
  private retryTimeout: NodeJS.Timeout | null = null;
  private paymentTimeout: NodeJS.Timeout | null = null;
  private readonly PAYMENT_TIMEOUT = 60000; // 60 seconds
  private readonly STORAGE_KEY = 'soladia-payment-state';

  // Supported currencies
  private readonly SUPPORTED_CURRENCIES = {
    'SOL': { decimals: 9, mint: null },
    'USDC': { decimals: 6, mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    'USDT': { decimals: 6, mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
    'SRM': { decimals: 6, mint: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt' }
  };

  constructor() {
    this.loadPaymentStateFromStorage();
    this.startRetryProcessor();
  }

  /**
   * Process SOL payment
   */
  async processSOLPayment(request: Omit<PaymentRequest, 'id' | 'type' | 'currency'>): Promise<PaymentResponse> {
    const paymentRequest: PaymentRequest = {
      ...request,
      id: this.generatePaymentId(),
      type: 'sol',
      currency: 'SOL'
    };

    return this.processPayment(paymentRequest);
  }

  /**
   * Process SPL token payment
   */
  async processSPLPayment(
    request: Omit<PaymentRequest, 'id' | 'type'> & { currency: string }
  ): Promise<PaymentResponse> {
    if (!this.SUPPORTED_CURRENCIES[request.currency]) {
      throw this.createPaymentError('UNSUPPORTED_CURRENCY', `Currency ${request.currency} not supported`);
    }

    const paymentRequest: PaymentRequest = {
      ...request,
      id: this.generatePaymentId(),
      type: 'spl'
    };

    return this.processPayment(paymentRequest);
  }

  /**
   * Process payment with comprehensive error handling
   */
  private async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    this.setState({ processing: true, currentPayment: request, error: null });

    try {
      // Validate payment request
      this.validatePaymentRequest(request);

      // Check wallet connection
      if (!productionWalletService.isConnected()) {
        throw this.createPaymentError('WALLET_NOT_CONNECTED', 'Wallet not connected');
      }

      // Check wallet balance
      await this.validateWalletBalance(request);

      // Set payment timeout
      this.setPaymentTimeout(request);

      // Process payment based on type
      let response: PaymentResponse;
      switch (request.type) {
        case 'sol':
          response = await this.processSOLTransaction(request);
          break;
        case 'spl':
          response = await this.processSPLTransaction(request);
          break;
        case 'escrow':
          response = await this.processEscrowPayment(request);
          break;
        case 'auction':
          response = await this.processAuctionBid(request);
          break;
        default:
          throw this.createPaymentError('INVALID_PAYMENT_TYPE', 'Invalid payment type');
      }

      // Update state
      this.setState({
        processing: false,
        currentPayment: null,
        paymentHistory: [...this.state.paymentHistory, response],
        lastUpdated: Date.now()
      });

      this.savePaymentStateToStorage();
      this.notifyListeners();

      return response;

    } catch (error) {
      const paymentError = this.handlePaymentError(error, request);
      this.setState({
        processing: false,
        currentPayment: null,
        error: paymentError.message,
        lastUpdated: Date.now()
      });

      // Add to retry queue if retryable
      if (paymentError.retryable && (request.retryCount || 0) < this.maxRetries) {
        this.addToRetryQueue({ ...request, retryCount: (request.retryCount || 0) + 1 });
      }

      throw paymentError;
    } finally {
      this.clearPaymentTimeout();
    }
  }

  /**
   * Process SOL transaction
   */
  private async processSOLTransaction(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const transaction = await solanaService.createTransferTransaction({
        from: productionWalletService.getAddress()!,
        to: request.recipient,
        amount: request.amount
      });

      if (!transaction.success) {
        throw new Error(transaction.error || 'Failed to create transaction');
      }

      const signedTransaction = await productionWalletService.signTransaction(transaction.data);
      const result = await solanaService.sendTransaction(signedTransaction);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send transaction');
      }

      return {
        success: true,
        transactionId: result.data.signature,
        signature: result.data.signature,
        status: 'confirmed',
        timestamp: Date.now(),
        fees: result.data.fees || 0.000005,
        network: productionWalletService.getNetwork()
      };

    } catch (error) {
      throw this.createPaymentError('TRANSACTION_FAILED', 'SOL transaction failed', error);
    }
  }

  /**
   * Process SPL token transaction
   */
  private async processSPLTransaction(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const currency = this.SUPPORTED_CURRENCIES[request.currency];
      if (!currency) {
        throw this.createPaymentError('UNSUPPORTED_CURRENCY', `Currency ${request.currency} not supported`);
      }

      const transaction = await solanaService.createTokenTransferTransaction({
        from: productionWalletService.getAddress()!,
        to: request.recipient,
        amount: request.amount,
        tokenMint: currency.mint!
      });

      if (!transaction.success) {
        throw new Error(transaction.error || 'Failed to create token transaction');
      }

      const signedTransaction = await productionWalletService.signTransaction(transaction.data);
      const result = await solanaService.sendTransaction(signedTransaction);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send token transaction');
      }

      return {
        success: true,
        transactionId: result.data.signature,
        signature: result.data.signature,
        status: 'confirmed',
        timestamp: Date.now(),
        fees: result.data.fees || 0.000005,
        network: productionWalletService.getNetwork()
      };

    } catch (error) {
      throw this.createPaymentError('TOKEN_TRANSACTION_FAILED', 'SPL token transaction failed', error);
    }
  }

  /**
   * Process escrow payment
   */
  private async processEscrowPayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const escrowId = this.generatePaymentId();
      const escrow: EscrowPayment = {
        id: escrowId,
        amount: request.amount,
        currency: request.currency,
        buyer: productionWalletService.getAddress()!,
        seller: request.recipient,
        status: 'created',
        createdAt: Date.now(),
        expiresAt: request.expiresAt || Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        metadata: request.metadata
      };

      // Create escrow account
      const createResult = await solanaService.createEscrowAccount(escrow);
      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create escrow account');
      }

      // Fund escrow
      const fundResult = await this.processSOLTransaction({
        ...request,
        recipient: createResult.data.escrowAddress
      });

      if (!fundResult.success) {
        throw new Error('Failed to fund escrow');
      }

      escrow.status = 'funded';
      this.setState({
        escrowPayments: [...this.state.escrowPayments, escrow]
      });

      return {
        success: true,
        transactionId: fundResult.transactionId,
        signature: fundResult.signature,
        status: 'confirmed',
        timestamp: Date.now(),
        fees: fundResult.fees,
        network: fundResult.network
      };

    } catch (error) {
      throw this.createPaymentError('ESCROW_FAILED', 'Escrow payment failed', error);
    }
  }

  /**
   * Process auction bid
   */
  private async processAuctionBid(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const bidId = this.generatePaymentId();
      const bid: AuctionBid = {
        id: bidId,
        auctionId: request.metadata?.auctionId || 'unknown',
        bidder: productionWalletService.getAddress()!,
        amount: request.amount,
        currency: request.currency,
        status: 'active',
        timestamp: Date.now()
      };

      // Process payment
      const paymentResult = await this.processSOLTransaction(request);
      if (!paymentResult.success) {
        throw new Error('Failed to process bid payment');
      }

      bid.signature = paymentResult.signature;
      this.setState({
        auctionBids: [...this.state.auctionBids, bid]
      });

      return {
        success: true,
        transactionId: paymentResult.transactionId,
        signature: paymentResult.signature,
        status: 'confirmed',
        timestamp: Date.now(),
        fees: paymentResult.fees,
        network: paymentResult.network
      };

    } catch (error) {
      throw this.createPaymentError('AUCTION_BID_FAILED', 'Auction bid failed', error);
    }
  }

  /**
   * Validate payment request
   */
  private validatePaymentRequest(request: PaymentRequest): void {
    if (!request.amount || request.amount <= 0) {
      throw this.createPaymentError('INVALID_AMOUNT', 'Amount must be greater than 0');
    }

    if (!request.recipient) {
      throw this.createPaymentError('INVALID_RECIPIENT', 'Recipient address is required');
    }

    if (request.type === 'spl' && !this.SUPPORTED_CURRENCIES[request.currency]) {
      throw this.createPaymentError('UNSUPPORTED_CURRENCY', `Currency ${request.currency} not supported`);
    }

    if (request.expiresAt && request.expiresAt < Date.now()) {
      throw this.createPaymentError('PAYMENT_EXPIRED', 'Payment has expired');
    }
  }

  /**
   * Validate wallet balance
   */
  private async validateWalletBalance(request: PaymentRequest): Promise<void> {
    const balance = productionWalletService.getBalance();
    const requiredAmount = request.amount + 0.001; // Add small buffer for fees

    if (balance < requiredAmount) {
      throw this.createPaymentError('INSUFFICIENT_FUNDS', `Insufficient balance. Required: ${requiredAmount} SOL, Available: ${balance} SOL`);
    }
  }

  /**
   * Set payment timeout
   */
  private setPaymentTimeout(request: PaymentRequest): void {
    this.clearPaymentTimeout();
    this.paymentTimeout = setTimeout(() => {
      this.handlePaymentTimeout(request);
    }, this.PAYMENT_TIMEOUT);
  }

  /**
   * Clear payment timeout
   */
  private clearPaymentTimeout(): void {
    if (this.paymentTimeout) {
      clearTimeout(this.paymentTimeout);
      this.paymentTimeout = null;
    }
  }

  /**
   * Handle payment timeout
   */
  private handlePaymentTimeout(request: PaymentRequest): void {
    this.setState({
      processing: false,
      currentPayment: null,
      error: 'Payment timeout',
      lastUpdated: Date.now()
    });

    // Add to retry queue
    this.addToRetryQueue(request);
  }

  /**
   * Add payment to retry queue
   */
  private addToRetryQueue(request: PaymentRequest): void {
    this.retryQueue.push(request);
    this.startRetryProcessor();
  }

  /**
   * Start retry processor
   */
  private startRetryProcessor(): void {
    if (this.retryTimeout || this.retryQueue.length === 0) {
      return;
    }

    this.retryTimeout = setTimeout(async () => {
      await this.processRetryQueue();
    }, this.retryDelay);
  }

  /**
   * Process retry queue
   */
  private async processRetryQueue(): Promise<void> {
    this.retryTimeout = null;

    if (this.retryQueue.length === 0) {
      return;
    }

    const request = this.retryQueue.shift()!;
    
    try {
      await this.processPayment(request);
    } catch (error) {
      console.warn('Retry failed:', error);
      if ((request.retryCount || 0) < this.maxRetries) {
        this.retryQueue.push({ ...request, retryCount: (request.retryCount || 0) + 1 });
      }
    }

    // Continue processing queue
    if (this.retryQueue.length > 0) {
      this.retryTimeout = setTimeout(() => {
        this.processRetryQueue();
      }, this.retryDelay);
    }
  }

  /**
   * Release escrow payment
   */
  async releaseEscrow(escrowId: string): Promise<PaymentResponse> {
    try {
      const escrow = this.state.escrowPayments.find(e => e.id === escrowId);
      if (!escrow) {
        throw this.createPaymentError('ESCROW_NOT_FOUND', 'Escrow payment not found');
      }

      if (escrow.status !== 'funded') {
        throw this.createPaymentError('INVALID_ESCROW_STATUS', 'Escrow is not funded');
      }

      const result = await solanaService.releaseEscrow(escrowId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to release escrow');
      }

      escrow.status = 'released';
      this.setState({
        escrowPayments: [...this.state.escrowPayments]
      });

      return {
        success: true,
        transactionId: result.data.signature,
        signature: result.data.signature,
        status: 'confirmed',
        timestamp: Date.now()
      };

    } catch (error) {
      throw this.createPaymentError('ESCROW_RELEASE_FAILED', 'Failed to release escrow', error);
    }
  }

  /**
   * Cancel escrow payment
   */
  async cancelEscrow(escrowId: string): Promise<PaymentResponse> {
    try {
      const escrow = this.state.escrowPayments.find(e => e.id === escrowId);
      if (!escrow) {
        throw this.createPaymentError('ESCROW_NOT_FOUND', 'Escrow payment not found');
      }

      if (escrow.status === 'released') {
        throw this.createPaymentError('INVALID_ESCROW_STATUS', 'Escrow already released');
      }

      const result = await solanaService.cancelEscrow(escrowId);
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel escrow');
      }

      escrow.status = 'cancelled';
      this.setState({
        escrowPayments: [...this.state.escrowPayments]
      });

      return {
        success: true,
        transactionId: result.data.signature,
        signature: result.data.signature,
        status: 'confirmed',
        timestamp: Date.now()
      };

    } catch (error) {
      throw this.createPaymentError('ESCROW_CANCEL_FAILED', 'Failed to cancel escrow', error);
    }
  }

  /**
   * Get payment history
   */
  getPaymentHistory(): PaymentResponse[] {
    return [...this.state.paymentHistory];
  }

  /**
   * Get escrow payments
   */
  getEscrowPayments(): EscrowPayment[] {
    return [...this.state.escrowPayments];
  }

  /**
   * Get auction bids
   */
  getAuctionBids(): AuctionBid[] {
    return [...this.state.auctionBids];
  }

  /**
   * Get current payment state
   */
  getState(): PaymentState {
    return { ...this.state };
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: PaymentState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Generate payment ID
   */
  private generatePaymentId(): string {
    return `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle payment errors
   */
  private handlePaymentError(error: any, request: PaymentRequest): PaymentError {
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
      case 'TRANSACTION_FAILED':
        retryable = true;
        break;
      case 'INSUFFICIENT_FUNDS':
      case 'INVALID_AMOUNT':
      case 'INVALID_RECIPIENT':
      case 'UNSUPPORTED_CURRENCY':
        retryable = false;
        break;
      default:
        retryable = true;
    }

    return {
      code,
      message,
      details: error.details,
      retryable,
      timestamp: Date.now()
    };
  }

  /**
   * Create payment error
   */
  private createPaymentError(code: string, message: string, details?: any): PaymentError {
    return {
      code,
      message,
      details,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Set payment state
   */
  private setState(updates: Partial<PaymentState>): void {
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
        console.error('Error in payment state listener:', error);
      }
    });
  }

  /**
   * Save payment state to storage
   */
  private savePaymentStateToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save payment state to storage:', error);
    }
  }

  /**
   * Load payment state from storage
   */
  private loadPaymentStateFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.setState(state);
      }
    } catch (error) {
      console.warn('Failed to load payment state from storage:', error);
    }
  }

  /**
   * Clear payment history
   */
  clearPaymentHistory(): void {
    this.setState({
      paymentHistory: [],
      escrowPayments: [],
      auctionBids: []
    });
    this.savePaymentStateToStorage();
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return Object.keys(this.SUPPORTED_CURRENCIES);
  }

  /**
   * Check if currency is supported
   */
  isCurrencySupported(currency: string): boolean {
    return currency in this.SUPPORTED_CURRENCIES;
  }

  /**
   * Get currency info
   */
  getCurrencyInfo(currency: string): { decimals: number; mint: string | null } | null {
    return this.SUPPORTED_CURRENCIES[currency] || null;
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    this.clearPaymentTimeout();
    
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  /**
   * Destroy service instance
   */
  destroy(): void {
    this.cleanup();
    this.listeners.clear();
    this.retryQueue = [];
  }
}

// Export singleton instance
export const productionPaymentProcessor = new ProductionPaymentProcessor();
export default productionPaymentProcessor;

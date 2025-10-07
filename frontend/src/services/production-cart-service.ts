/**
 * Production-Grade Shopping Cart Service
 * Complete cart functionality with comprehensive state management and checkout process
 */

import { productionWalletService } from './production-wallet-service';
import { productionPaymentProcessor } from './production-payment-processor';
import { productionAuthService } from './production-auth-service';

export interface CartItem {
  id: string;
  nftId: string;
  name: string;
  image: string;
  price: number;
  currency: string;
  seller: string;
  collection: string;
  quantity: number;
  addedAt: number;
  expiresAt: number;
  metadata?: any;
}

export interface CartCoupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minAmount?: number;
  maxDiscount?: number;
  expiresAt: number;
  used: boolean;
}

export interface CartShipping {
  method: string;
  cost: number;
  currency: string;
  estimatedDays: number;
  address: ShippingAddress;
}

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

export interface CartCheckout {
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  paymentMethod: 'wallet' | 'card' | 'bank';
  shippingAddress?: ShippingAddress;
  billingAddress?: ShippingAddress;
  coupon?: CartCoupon;
  notes?: string;
}

export interface CartState {
  items: CartItem[];
  coupons: CartCoupon[];
  shipping: CartShipping | null;
  checkout: CartCheckout | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;
  totalItems: number;
  totalValue: number;
  currency: string;
}

export interface CartError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: number;
}

export class ProductionCartService {
  private state: CartState = {
    items: [],
    coupons: [],
    shipping: null,
    checkout: null,
    isLoading: false,
    error: null,
    lastUpdated: 0,
    totalItems: 0,
    totalValue: 0,
    currency: 'SOL'
  };

  private listeners: Set<(state: CartState) => void> = new Set();
  private readonly STORAGE_KEY = 'soladia-cart-state';
  private readonly ITEM_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_ITEMS = 50;
  private readonly TAX_RATE = 0.08; // 8% tax rate
  private readonly SHIPPING_RATE = 0.05; // 5% shipping rate

  constructor() {
    this.loadCartStateFromStorage();
    this.startExpiryCheck();
  }

  /**
   * Add item to cart
   */
  async addItem(item: Omit<CartItem, 'id' | 'addedAt' | 'expiresAt'>): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      // Validate item
      this.validateCartItem(item);

      // Check if item already exists
      const existingItem = this.state.items.find(i => i.nftId === item.nftId);
      if (existingItem) {
        // Update quantity
        const updatedItems = this.state.items.map(i =>
          i.nftId === item.nftId
            ? { ...i, quantity: i.quantity + item.quantity, expiresAt: Date.now() + this.ITEM_EXPIRY }
            : i
        );
        this.setState({ items: updatedItems });
      } else {
        // Add new item
        const newItem: CartItem = {
          ...item,
          id: `cart_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          addedAt: Date.now(),
          expiresAt: Date.now() + this.ITEM_EXPIRY
        };

        // Check cart limit
        if (this.state.items.length >= this.MAX_ITEMS) {
          throw this.createCartError('CART_FULL', 'Cart is full. Maximum 50 items allowed.');
        }

        this.setState({ items: [...this.state.items, newItem] });
      }

      this.updateCartTotals();
      this.saveCartStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleCartError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Remove item from cart
   */
  async removeItem(itemId: string): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      const updatedItems = this.state.items.filter(item => item.id !== itemId);
      this.setState({ items: updatedItems });

      this.updateCartTotals();
      this.saveCartStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleCartError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Update item quantity
   */
  async updateItemQuantity(itemId: string, quantity: number): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      if (quantity <= 0) {
        return this.removeItem(itemId);
      }

      const updatedItems = this.state.items.map(item =>
        item.id === itemId
          ? { ...item, quantity, expiresAt: Date.now() + this.ITEM_EXPIRY }
          : item
      );

      this.setState({ items: updatedItems });

      this.updateCartTotals();
      this.saveCartStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleCartError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Clear cart
   */
  async clearCart(): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      this.setState({
        items: [],
        coupons: [],
        shipping: null,
        checkout: null,
        totalItems: 0,
        totalValue: 0
      });

      this.saveCartStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleCartError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Apply coupon
   */
  async applyCoupon(code: string): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      // Validate coupon code
      const coupon = await this.validateCoupon(code);
      if (!coupon) {
        throw this.createCartError('INVALID_COUPON', 'Invalid coupon code');
      }

      // Check if coupon is already applied
      if (this.state.coupons.some(c => c.code === code)) {
        throw this.createCartError('COUPON_ALREADY_APPLIED', 'Coupon already applied');
      }

      // Check coupon expiry
      if (coupon.expiresAt < Date.now()) {
        throw this.createCartError('COUPON_EXPIRED', 'Coupon has expired');
      }

      // Check minimum amount
      if (coupon.minAmount && this.state.totalValue < coupon.minAmount) {
        throw this.createCartError('COUPON_MIN_AMOUNT', `Minimum amount of ${coupon.minAmount} ${this.state.currency} required`);
      }

      this.setState({ coupons: [...this.state.coupons, coupon] });
      this.updateCartTotals();
      this.saveCartStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleCartError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Remove coupon
   */
  async removeCoupon(code: string): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      const updatedCoupons = this.state.coupons.filter(coupon => coupon.code !== code);
      this.setState({ coupons: updatedCoupons });

      this.updateCartTotals();
      this.saveCartStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleCartError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Set shipping address
   */
  async setShippingAddress(address: ShippingAddress): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      // Validate address
      this.validateShippingAddress(address);

      const shipping: CartShipping = {
        method: 'standard',
        cost: this.calculateShippingCost(),
        currency: this.state.currency,
        estimatedDays: 3,
        address
      };

      this.setState({ shipping });
      this.updateCartTotals();
      this.saveCartStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleCartError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Set shipping method
   */
  async setShippingMethod(method: string, cost: number, estimatedDays: number): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      if (!this.state.shipping) {
        throw this.createCartError('NO_SHIPPING_ADDRESS', 'Shipping address required');
      }

      const updatedShipping = {
        ...this.state.shipping,
        method,
        cost,
        estimatedDays
      };

      this.setState({ shipping: updatedShipping });
      this.updateCartTotals();
      this.saveCartStateToStorage();
      this.notifyListeners();

      return true;

    } catch (error) {
      this.handleCartError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Create checkout
   */
  async createCheckout(): Promise<CartCheckout | null> {
    try {
      this.setState({ isLoading: true, error: null });

      if (this.state.items.length === 0) {
        throw this.createCartError('EMPTY_CART', 'Cart is empty');
      }

      // Check if user is authenticated
      if (!productionAuthService.isAuthenticated()) {
        throw this.createCartError('NOT_AUTHENTICATED', 'User must be authenticated to checkout');
      }

      // Check if wallet is connected
      if (!productionWalletService.isConnected()) {
        throw this.createCartError('WALLET_NOT_CONNECTED', 'Wallet must be connected to checkout');
      }

      // Validate all items
      for (const item of this.state.items) {
        await this.validateCartItem(item);
      }

      // Calculate totals
      const subtotal = this.calculateSubtotal();
      const tax = this.calculateTax(subtotal);
      const shipping = this.calculateShipping();
      const discount = this.calculateDiscount(subtotal);
      const total = subtotal + tax + shipping - discount;

      const checkout: CartCheckout = {
        items: [...this.state.items],
        subtotal,
        tax,
        shipping,
        discount,
        total,
        currency: this.state.currency,
        paymentMethod: 'wallet',
        shippingAddress: this.state.shipping?.address,
        billingAddress: this.state.shipping?.address,
        coupon: this.state.coupons[0] || undefined,
        notes: ''
      };

      this.setState({ checkout });
      this.saveCartStateToStorage();
      this.notifyListeners();

      return checkout;

    } catch (error) {
      this.handleCartError(error);
      return null;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Process checkout
   */
  async processCheckout(): Promise<boolean> {
    try {
      this.setState({ isLoading: true, error: null });

      if (!this.state.checkout) {
        throw this.createCartError('NO_CHECKOUT', 'No checkout data available');
      }

      const checkout = this.state.checkout;

      // Process payment for each item
      for (const item of checkout.items) {
        const paymentResult = await productionPaymentProcessor.processSOLPayment({
          amount: item.price * item.quantity,
          recipient: item.seller,
          memo: `Purchase of ${item.name} from ${item.collection}`
        });

        if (!paymentResult.success) {
          throw this.createCartError('PAYMENT_FAILED', `Payment failed for ${item.name}: ${paymentResult.error}`);
        }
      }

      // Clear cart after successful payment
      await this.clearCart();

      return true;

    } catch (error) {
      this.handleCartError(error);
      return false;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  /**
   * Validate cart item
   */
  private async validateCartItem(item: any): Promise<void> {
    if (!item.nftId || !item.name || !item.price || !item.seller) {
      throw this.createCartError('INVALID_ITEM', 'Invalid cart item data');
    }

    if (item.price <= 0) {
      throw this.createCartError('INVALID_PRICE', 'Item price must be greater than 0');
    }

    if (item.quantity <= 0) {
      throw this.createCartError('INVALID_QUANTITY', 'Item quantity must be greater than 0');
    }

    // Check if item is still available
    // This would typically make an API call to verify availability
    // For now, we'll assume all items are available
  }

  /**
   * Validate shipping address
   */
  private validateShippingAddress(address: ShippingAddress): void {
    if (!address.name || !address.street || !address.city || !address.state || !address.zipCode || !address.country) {
      throw this.createCartError('INVALID_ADDRESS', 'All address fields are required');
    }

    // Basic validation for zip code format
    const zipRegex = /^\d{5}(-\d{4})?$/;
    if (!zipRegex.test(address.zipCode)) {
      throw this.createCartError('INVALID_ZIP_CODE', 'Invalid zip code format');
    }
  }

  /**
   * Validate coupon
   */
  private async validateCoupon(code: string): Promise<CartCoupon | null> {
    try {
      const response = await fetch(`/api/coupons/validate?code=${encodeURIComponent(code)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.coupon || null;
    } catch (error) {
      console.error('Failed to validate coupon:', error);
      return null;
    }
  }

  /**
   * Calculate subtotal
   */
  private calculateSubtotal(): number {
    return this.state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }

  /**
   * Calculate tax
   */
  private calculateTax(subtotal: number): number {
    return subtotal * this.TAX_RATE;
  }

  /**
   * Calculate shipping
   */
  private calculateShipping(): number {
    if (!this.state.shipping) {
      return 0;
    }
    return this.state.shipping.cost;
  }

  /**
   * Calculate discount
   */
  private calculateDiscount(subtotal: number): number {
    let totalDiscount = 0;

    this.state.coupons.forEach(coupon => {
      if (coupon.type === 'percentage') {
        const discount = subtotal * (coupon.value / 100);
        const maxDiscount = coupon.maxDiscount || discount;
        totalDiscount += Math.min(discount, maxDiscount);
      } else if (coupon.type === 'fixed') {
        totalDiscount += coupon.value;
      }
    });

    return Math.min(totalDiscount, subtotal);
  }

  /**
   * Calculate shipping cost
   */
  private calculateShippingCost(): number {
    const subtotal = this.calculateSubtotal();
    return subtotal * this.SHIPPING_RATE;
  }

  /**
   * Update cart totals
   */
  private updateCartTotals(): void {
    const totalItems = this.state.items.reduce((total, item) => total + item.quantity, 0);
    const totalValue = this.calculateSubtotal();

    this.setState({
      totalItems,
      totalValue,
      lastUpdated: Date.now()
    });
  }

  /**
   * Start expiry check
   */
  private startExpiryCheck(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredItems = this.state.items.filter(item => item.expiresAt < now);
      
      if (expiredItems.length > 0) {
        const validItems = this.state.items.filter(item => item.expiresAt >= now);
        this.setState({ items: validItems });
        this.updateCartTotals();
        this.saveCartStateToStorage();
        this.notifyListeners();
      }
    }, 60000); // Check every minute
  }

  /**
   * Get cart items
   */
  getCartItems(): CartItem[] {
    return [...this.state.items];
  }

  /**
   * Get cart totals
   */
  getCartTotals(): { subtotal: number; tax: number; shipping: number; discount: number; total: number } {
    const subtotal = this.calculateSubtotal();
    const tax = this.calculateTax(subtotal);
    const shipping = this.calculateShipping();
    const discount = this.calculateDiscount(subtotal);
    const total = subtotal + tax + shipping - discount;

    return { subtotal, tax, shipping, discount, total };
  }

  /**
   * Get cart state
   */
  getState(): CartState {
    return { ...this.state };
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: CartState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Check if cart is empty
   */
  isEmpty(): boolean {
    return this.state.items.length === 0;
  }

  /**
   * Get item count
   */
  getItemCount(): number {
    return this.state.totalItems;
  }

  /**
   * Get total value
   */
  getTotalValue(): number {
    return this.state.totalValue;
  }

  /**
   * Check if item exists in cart
   */
  hasItem(nftId: string): boolean {
    return this.state.items.some(item => item.nftId === nftId);
  }

  /**
   * Get item by NFT ID
   */
  getItemByNftId(nftId: string): CartItem | undefined {
    return this.state.items.find(item => item.nftId === nftId);
  }

  /**
   * Handle cart errors
   */
  private handleCartError(error: any): void {
    const cartError = this.createCartError(
      error.code || 'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      error.details
    );

    this.setState({
      isLoading: false,
      error: cartError.message,
      lastUpdated: Date.now()
    });

    console.error('Cart error:', cartError);
  }

  /**
   * Create cart error
   */
  private createCartError(code: string, message: string, details?: any): CartError {
    return {
      code,
      message,
      details,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Set cart state
   */
  private setState(updates: Partial<CartState>): void {
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
        console.error('Error in cart state listener:', error);
      }
    });
  }

  /**
   * Save cart state to storage
   */
  private saveCartStateToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save cart state to storage:', error);
    }
  }

  /**
   * Load cart state from storage
   */
  private loadCartStateFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.setState(state);
        this.updateCartTotals();
      }
    } catch (error) {
      console.warn('Failed to load cart state from storage:', error);
    }
  }

  /**
   * Clear cart data
   */
  clearCartData(): void {
    this.setState({
      items: [],
      coupons: [],
      shipping: null,
      checkout: null,
      totalItems: 0,
      totalValue: 0,
      error: null
    });
    this.saveCartStateToStorage();
  }
}

// Export singleton instance
export const productionCartService = new ProductionCartService();
export default productionCartService;

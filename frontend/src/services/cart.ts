/**
 * Shopping Cart Service
 * Manages cart state, persistence, and operations
 */

export interface CartItem {
    id: string;
    productId: string;
    title: string;
    price: number;
    image?: string;
    quantity: number;
    variant?: {
        size?: string;
        color?: string;
        [key: string]: any;
    };
    sellerId: string;
    sellerName: string;
    inStock: boolean;
    maxQuantity?: number;
}

export interface Cart {
    items: CartItem[];
    total: number;
    itemCount: number;
    shipping: number;
    tax: number;
    discount: number;
    subtotal: number;
}

export interface CartSummary {
    itemCount: number;
    total: number;
    isEmpty: boolean;
}

class CartService {
    private cart: Cart = {
        items: [],
        total: 0,
        itemCount: 0,
        shipping: 0,
        tax: 0,
        discount: 0,
        subtotal: 0,
    };
    private subscribers: ((cart: Cart) => void)[] = [];
    private storageKey = 'soladia_cart';

    constructor() {
        this.loadFromStorage();
        this.calculateTotals();
    }

    /**
     * Subscribe to cart changes
     */
    subscribe(callback: (cart: Cart) => void): () => void {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }

    /**
     * Get current cart state
     */
    getCart(): Cart {
        return { ...this.cart };
    }

    /**
     * Get cart summary
     */
    getSummary(): CartSummary {
        return {
            itemCount: this.cart.itemCount,
            total: this.cart.total,
            isEmpty: this.cart.items.length === 0,
        };
    }

    /**
     * Add item to cart
     */
    addItem(item: Omit<CartItem, 'quantity'>): boolean {
        const existingItem = this.cart.items.find(
            cartItem =>
                cartItem.productId === item.productId &&
                JSON.stringify(cartItem.variant) === JSON.stringify(item.variant)
        );

        if (existingItem) {
            return this.updateQuantity(existingItem.id, existingItem.quantity + 1);
        }

        const newItem: CartItem = {
            ...item,
            quantity: 1,
        };

        this.cart.items.push(newItem);
        this.calculateTotals();
        this.saveToStorage();
        this.notifySubscribers();
        return true;
    }

    /**
     * Remove item from cart
     */
    removeItem(itemId: string): boolean {
        const itemIndex = this.cart.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return false;

        this.cart.items.splice(itemIndex, 1);
        this.calculateTotals();
        this.saveToStorage();
        this.notifySubscribers();
        return true;
    }

    /**
     * Update item quantity
     */
    updateQuantity(itemId: string, quantity: number): boolean {
        const item = this.cart.items.find(item => item.id === itemId);
        if (!item) return false;

        if (quantity <= 0) {
            return this.removeItem(itemId);
        }

        if (item.maxQuantity && quantity > item.maxQuantity) {
            quantity = item.maxQuantity;
        }

        item.quantity = quantity;
        this.calculateTotals();
        this.saveToStorage();
        this.notifySubscribers();
        return true;
    }

    /**
     * Clear entire cart
     */
    clear(): void {
        this.cart = {
            items: [],
            total: 0,
            itemCount: 0,
            shipping: 0,
            tax: 0,
            discount: 0,
            subtotal: 0,
        };
        this.saveToStorage();
        this.notifySubscribers();
    }

    /**
     * Apply discount code
     */
    applyDiscount(code: string): Promise<{ success: boolean; message: string; discount: number }> {
        // Mock discount validation - replace with actual API call
        return new Promise((resolve) => {
            setTimeout(() => {
                const validCodes: Record<string, number> = {
                    'WELCOME10': 0.1, // 10% off
                    'SAVE20': 0.2,    // 20% off
                    'FREESHIP': 0,    // Free shipping
                };

                if (validCodes[code]) {
                    this.cart.discount = validCodes[code];
                    this.calculateTotals();
                    this.saveToStorage();
                    this.notifySubscribers();
                    resolve({
                        success: true,
                        message: `Discount code "${code}" applied!`,
                        discount: this.cart.discount,
                    });
                } else {
                    resolve({
                        success: false,
                        message: 'Invalid discount code',
                        discount: 0,
                    });
                }
            }, 500);
        });
    }

    /**
     * Remove discount code
     */
    removeDiscount(): void {
        this.cart.discount = 0;
        this.calculateTotals();
        this.saveToStorage();
        this.notifySubscribers();
    }

    /**
     * Calculate shipping cost
     */
    calculateShipping(address?: any): number {
        // Mock shipping calculation - replace with actual logic
        const baseShipping = 9.99;
        const freeShippingThreshold = 100;

        if (this.cart.subtotal >= freeShippingThreshold) {
            return 0;
        }

        return baseShipping;
    }

    /**
     * Calculate tax
     */
    calculateTax(address?: any): number {
        // Mock tax calculation - replace with actual tax service
        const taxRate = 0.08; // 8% tax rate
        return this.cart.subtotal * taxRate;
    }

    /**
     * Calculate all totals
     */
    private calculateTotals(): void {
        this.cart.subtotal = this.cart.items.reduce(
            (sum, item) => sum + (item.price * item.quantity),
            0
        );

        this.cart.itemCount = this.cart.items.reduce(
            (sum, item) => sum + item.quantity,
            0
        );

        this.cart.shipping = this.calculateShipping();
        this.cart.tax = this.calculateTax();

        const discountAmount = this.cart.discount * this.cart.subtotal;
        this.cart.total = this.cart.subtotal + this.cart.shipping + this.cart.tax - discountAmount;

        // Ensure total is never negative
        this.cart.total = Math.max(0, this.cart.total);
    }

    /**
     * Save cart to localStorage
     */
    private saveToStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.cart));
        } catch (error) {
            console.error('Failed to save cart to storage:', error);
        }
    }

    /**
     * Load cart from localStorage
     */
    private loadFromStorage(): void {
        if (typeof window === 'undefined') return;

        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsedCart = JSON.parse(stored);
                this.cart = { ...this.cart, ...parsedCart };
            }
        } catch (error) {
            console.error('Failed to load cart from storage:', error);
            this.cart = {
                items: [],
                total: 0,
                itemCount: 0,
                shipping: 0,
                tax: 0,
                discount: 0,
                subtotal: 0,
            };
        }
    }

    /**
     * Notify subscribers of cart changes
     */
    private notifySubscribers(): void {
        this.subscribers.forEach(callback => callback(this.getCart()));
    }

    /**
     * Get item by ID
     */
    getItem(itemId: string): CartItem | null {
        return this.cart.items.find(item => item.id === itemId) || null;
    }

    /**
     * Check if product is in cart
     */
    isInCart(productId: string, variant?: any): boolean {
        return this.cart.items.some(
            item =>
                item.productId === productId &&
                JSON.stringify(item.variant) === JSON.stringify(variant)
        );
    }

    /**
     * Get cart item count for specific product
     */
    getProductQuantity(productId: string, variant?: any): number {
        const item = this.cart.items.find(
            item =>
                item.productId === productId &&
                JSON.stringify(item.variant) === JSON.stringify(variant)
        );
        return item ? item.quantity : 0;
    }

    /**
     * Validate cart before checkout
     */
    validateCart(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (this.cart.items.length === 0) {
            errors.push('Cart is empty');
        }

        this.cart.items.forEach((item, index) => {
            if (!item.inStock) {
                errors.push(`Item "${item.title}" is out of stock`);
            }

            if (item.maxQuantity && item.quantity > item.maxQuantity) {
                errors.push(`Item "${item.title}" quantity exceeds available stock`);
            }
        });

        return {
            valid: errors.length === 0,
            errors,
        };
    }

    /**
     * Export cart data for checkout
     */
    exportForCheckout(): {
        items: CartItem[];
        totals: {
            subtotal: number;
            shipping: number;
            tax: number;
            discount: number;
            total: number;
        };
    } {
        return {
            items: [...this.cart.items],
            totals: {
                subtotal: this.cart.subtotal,
                shipping: this.cart.shipping,
                tax: this.cart.tax,
                discount: this.cart.discount,
                total: this.cart.total,
            },
        };
    }
}

// Create singleton instance
export const cartService = new CartService();

// Export for global access
if (typeof window !== 'undefined') {
    (window as any).cartService = cartService;
}

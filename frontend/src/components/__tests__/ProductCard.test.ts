/**
 * ProductCard Component Tests
 * Comprehensive testing for the ProductCard component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import ProductCard from '../ProductCard.astro';

// Mock the enhanced payment processor
vi.mock('../../services/enhanced-payment-processor', () => ({
  enhancedPaymentProcessor: {
    processPayment: vi.fn(),
    processSOLPayment: vi.fn(),
    processSPLTokenPayment: vi.fn(),
  }
}));

// Mock the enhanced wallet service
vi.mock('../../services/enhanced-wallet-service', () => ({
  enhancedWalletService: {
    isConnected: vi.fn(() => true),
    getAddress: vi.fn(() => 'test-wallet-address'),
    getBalance: vi.fn(() => 10.0),
    getWalletType: vi.fn(() => 'phantom'),
  }
}));

describe('ProductCard Component', () => {
  const mockProduct = {
    id: '1',
    name: 'Test Product',
    description: 'This is a test product description',
    price: 2.5,
    originalPrice: 3.0,
    discount: 16.67,
    image: 'https://example.com/image.jpg',
    category: 'Electronics',
    rating: 4.5,
    reviewCount: 128,
    seller: 'test-seller',
    inStock: true,
    stockCount: 50,
    tags: ['new', 'popular'],
    nft: false,
    auction: false,
    featured: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders product information correctly', () => {
      render(ProductCard, { product: mockProduct });
      
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('This is a test product description')).toBeInTheDocument();
      expect(screen.getByText('$2.50')).toBeInTheDocument();
      expect(screen.getByText('$3.00')).toBeInTheDocument();
      expect(screen.getByText('16.67% OFF')).toBeInTheDocument();
      expect(screen.getByText('Electronics')).toBeInTheDocument();
      expect(screen.getByText('4.5')).toBeInTheDocument();
      expect(screen.getByText('(128)')).toBeInTheDocument();
    });

    it('renders product image with correct attributes', () => {
      render(ProductCard, { product: mockProduct });
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
      expect(image).toHaveAttribute('alt', 'Test Product');
    });

    it('renders stock information when in stock', () => {
      render(ProductCard, { product: mockProduct });
      
      expect(screen.getByText('In Stock')).toBeInTheDocument();
      expect(screen.getByText('50 available')).toBeInTheDocument();
    });

    it('renders out of stock message when not in stock', () => {
      const outOfStockProduct = { ...mockProduct, inStock: false, stockCount: 0 };
      render(ProductCard, { product: outOfStockProduct });
      
      expect(screen.getByText('Out of Stock')).toBeInTheDocument();
    });

    it('renders tags correctly', () => {
      render(ProductCard, { product: mockProduct });
      
      expect(screen.getByText('new')).toBeInTheDocument();
      expect(screen.getByText('popular')).toBeInTheDocument();
    });

    it('renders featured badge when product is featured', () => {
      render(ProductCard, { product: mockProduct });
      
      expect(screen.getByText('Featured')).toBeInTheDocument();
    });

    it('renders NFT badge when product is NFT', () => {
      const nftProduct = { ...mockProduct, nft: true };
      render(ProductCard, { product: nftProduct });
      
      expect(screen.getByText('NFT')).toBeInTheDocument();
    });

    it('renders auction badge when product is in auction', () => {
      const auctionProduct = { ...mockProduct, auction: true };
      render(ProductCard, { product: auctionProduct });
      
      expect(screen.getByText('Auction')).toBeInTheDocument();
    });
  });

  describe('Price Display', () => {
    it('displays current price correctly', () => {
      render(ProductCard, { product: mockProduct });
      
      const currentPrice = screen.getByText('$2.50');
      expect(currentPrice).toHaveClass('price-current');
    });

    it('displays original price with strikethrough when discounted', () => {
      render(ProductCard, { product: mockProduct });
      
      const originalPrice = screen.getByText('$3.00');
      expect(originalPrice).toHaveClass('price-original');
    });

    it('displays discount percentage correctly', () => {
      render(ProductCard, { product: mockProduct });
      
      const discount = screen.getByText('16.67% OFF');
      expect(discount).toHaveClass('price-discount');
    });

    it('does not display original price when no discount', () => {
      const noDiscountProduct = { ...mockProduct, originalPrice: 2.5, discount: 0 };
      render(ProductCard, { product: noDiscountProduct });
      
      expect(screen.queryByText('$3.00')).not.toBeInTheDocument();
      expect(screen.queryByText('16.67% OFF')).not.toBeInTheDocument();
    });
  });

  describe('Rating Display', () => {
    it('displays star rating correctly', () => {
      render(ProductCard, { product: mockProduct });
      
      const ratingContainer = screen.getByTestId('product-rating');
      expect(ratingContainer).toBeInTheDocument();
      
      const stars = screen.getAllByTestId('rating-star');
      expect(stars).toHaveLength(5);
    });

    it('displays review count correctly', () => {
      render(ProductCard, { product: mockProduct });
      
      expect(screen.getByText('(128)')).toBeInTheDocument();
    });

    it('handles zero reviews', () => {
      const noReviewsProduct = { ...mockProduct, reviewCount: 0 };
      render(ProductCard, { product: noReviewsProduct });
      
      expect(screen.getByText('(0)')).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('renders buy now button when in stock', () => {
      render(ProductCard, { product: mockProduct });
      
      const buyButton = screen.getByTestId('buy-now-btn');
      expect(buyButton).toBeInTheDocument();
      expect(buyButton).toHaveTextContent('Buy Now');
    });

    it('disables buy now button when out of stock', () => {
      const outOfStockProduct = { ...mockProduct, inStock: false };
      render(ProductCard, { product: outOfStockProduct });
      
      const buyButton = screen.getByTestId('buy-now-btn');
      expect(buyButton).toBeDisabled();
      expect(buyButton).toHaveTextContent('Out of Stock');
    });

    it('renders add to cart button', () => {
      render(ProductCard, { product: mockProduct });
      
      const cartButton = screen.getByTestId('add-to-cart-btn');
      expect(cartButton).toBeInTheDocument();
      expect(cartButton).toHaveTextContent('Add to Cart');
    });

    it('renders wishlist button', () => {
      render(ProductCard, { product: mockProduct });
      
      const wishlistButton = screen.getByTestId('wishlist-btn');
      expect(wishlistButton).toBeInTheDocument();
    });

    it('renders share button', () => {
      render(ProductCard, { product: mockProduct });
      
      const shareButton = screen.getByTestId('share-btn');
      expect(shareButton).toBeInTheDocument();
    });
  });

  describe('Buy Now Functionality', () => {
    it('opens payment modal when buy now is clicked', async () => {
      render(ProductCard, { product: mockProduct });
      
      const buyButton = screen.getByTestId('buy-now-btn');
      fireEvent.click(buyButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('payment-modal')).toBeInTheDocument();
      });
    });

    it('displays payment form in modal', async () => {
      render(ProductCard, { product: mockProduct });
      
      const buyButton = screen.getByTestId('buy-now-btn');
      fireEvent.click(buyButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('payment-form')).toBeInTheDocument();
        expect(screen.getByTestId('payment-amount')).toBeInTheDocument();
        expect(screen.getByTestId('payment-currency')).toBeInTheDocument();
      });
    });

    it('pre-fills payment amount with product price', async () => {
      render(ProductCard, { product: mockProduct });
      
      const buyButton = screen.getByTestId('buy-now-btn');
      fireEvent.click(buyButton);
      
      await waitFor(() => {
        const amountInput = screen.getByTestId('payment-amount');
        expect(amountInput).toHaveValue(2.5);
      });
    });

    it('processes payment when form is submitted', async () => {
      const { enhancedPaymentProcessor } = await import('../../services/enhanced-payment-processor');
      vi.mocked(enhancedPaymentProcessor.processPayment).mockResolvedValue({
        success: true,
        signature: 'test-signature',
        transactionId: 'test-signature'
      });

      render(ProductCard, { product: mockProduct });
      
      const buyButton = screen.getByTestId('buy-now-btn');
      fireEvent.click(buyButton);
      
      await waitFor(() => {
        const confirmButton = screen.getByTestId('confirm-payment');
        fireEvent.click(confirmButton);
      });
      
      expect(enhancedPaymentProcessor.processPayment).toHaveBeenCalledWith({
        amount: 2.5,
        currency: 'SOL',
        recipient: 'test-seller',
        memo: 'Payment for Test Product'
      });
    });

    it('handles payment errors gracefully', async () => {
      const { enhancedPaymentProcessor } = await import('../../services/enhanced-payment-processor');
      vi.mocked(enhancedPaymentProcessor.processPayment).mockResolvedValue({
        success: false,
        error: 'Insufficient funds'
      });

      render(ProductCard, { product: mockProduct });
      
      const buyButton = screen.getByTestId('buy-now-btn');
      fireEvent.click(buyButton);
      
      await waitFor(() => {
        const confirmButton = screen.getByTestId('confirm-payment');
        fireEvent.click(confirmButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('payment-error')).toBeInTheDocument();
        expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
      });
    });
  });

  describe('Add to Cart Functionality', () => {
    it('adds product to cart when add to cart is clicked', async () => {
      const mockAddToCart = vi.fn();
      render(ProductCard, { product: mockProduct, onAddToCart: mockAddToCart });
      
      const cartButton = screen.getByTestId('add-to-cart-btn');
      fireEvent.click(cartButton);
      
      expect(mockAddToCart).toHaveBeenCalledWith(mockProduct);
    });

    it('shows loading state during add to cart', async () => {
      const mockAddToCart = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
      render(ProductCard, { product: mockProduct, onAddToCart: mockAddToCart });
      
      const cartButton = screen.getByTestId('add-to-cart-btn');
      fireEvent.click(cartButton);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('shows success message after adding to cart', async () => {
      const mockAddToCart = vi.fn().mockResolvedValue(undefined);
      render(ProductCard, { product: mockProduct, onAddToCart: mockAddToCart });
      
      const cartButton = screen.getByTestId('add-to-cart-btn');
      fireEvent.click(cartButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('success-message')).toBeInTheDocument();
        expect(screen.getByText('Added to cart successfully')).toBeInTheDocument();
      });
    });
  });

  describe('Wishlist Functionality', () => {
    it('toggles wishlist status when wishlist button is clicked', async () => {
      const mockToggleWishlist = vi.fn();
      render(ProductCard, { product: mockProduct, onToggleWishlist: mockToggleWishlist });
      
      const wishlistButton = screen.getByTestId('wishlist-btn');
      fireEvent.click(wishlistButton);
      
      expect(mockToggleWishlist).toHaveBeenCalledWith(mockProduct.id);
    });

    it('shows filled heart when product is in wishlist', () => {
      render(ProductCard, { product: { ...mockProduct, inWishlist: true } });
      
      const wishlistButton = screen.getByTestId('wishlist-btn');
      expect(wishlistButton).toHaveClass('wishlist-active');
    });

    it('shows empty heart when product is not in wishlist', () => {
      render(ProductCard, { product: { ...mockProduct, inWishlist: false } });
      
      const wishlistButton = screen.getByTestId('wishlist-btn');
      expect(wishlistButton).toHaveClass('wishlist-inactive');
    });
  });

  describe('Share Functionality', () => {
    it('opens share modal when share button is clicked', async () => {
      render(ProductCard, { product: mockProduct });
      
      const shareButton = screen.getByTestId('share-btn');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('share-modal')).toBeInTheDocument();
      });
    });

    it('displays share options in modal', async () => {
      render(ProductCard, { product: mockProduct });
      
      const shareButton = screen.getByTestId('share-btn');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('share-twitter')).toBeInTheDocument();
        expect(screen.getByTestId('share-facebook')).toBeInTheDocument();
        expect(screen.getByTestId('share-linkedin')).toBeInTheDocument();
        expect(screen.getByTestId('share-copy-link')).toBeInTheDocument();
      });
    });

    it('copies product link to clipboard', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true
      });

      render(ProductCard, { product: mockProduct });
      
      const shareButton = screen.getByTestId('share-btn');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        const copyButton = screen.getByTestId('share-copy-link');
        fireEvent.click(copyButton);
      });
      
      expect(mockWriteText).toHaveBeenCalledWith(`${window.location.origin}/product/${mockProduct.id}`);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      render(ProductCard, { product: mockProduct });
      
      expect(screen.getByTestId('buy-now-btn')).toHaveAttribute('aria-label', 'Buy Test Product for $2.50');
      expect(screen.getByTestId('add-to-cart-btn')).toHaveAttribute('aria-label', 'Add Test Product to cart');
      expect(screen.getByTestId('wishlist-btn')).toHaveAttribute('aria-label', 'Add Test Product to wishlist');
      expect(screen.getByTestId('share-btn')).toHaveAttribute('aria-label', 'Share Test Product');
    });

    it('has proper ARIA labels for rating', () => {
      render(ProductCard, { product: mockProduct });
      
      const ratingContainer = screen.getByTestId('product-rating');
      expect(ratingContainer).toHaveAttribute('aria-label', 'Product rating: 4.5 out of 5 stars');
    });

    it('has proper ARIA labels for price', () => {
      render(ProductCard, { product: mockProduct });
      
      expect(screen.getByTestId('product-price')).toHaveAttribute('aria-label', 'Price: $2.50 (was $3.00, 16.67% off)');
    });

    it('supports keyboard navigation', () => {
      render(ProductCard, { product: mockProduct });
      
      const buyButton = screen.getByTestId('buy-now-btn');
      buyButton.focus();
      
      expect(document.activeElement).toBe(buyButton);
    });

    it('announces stock status to screen readers', () => {
      render(ProductCard, { product: mockProduct });
      
      const stockStatus = screen.getByTestId('stock-status');
      expect(stockStatus).toHaveAttribute('aria-live', 'polite');
      expect(stockStatus).toHaveTextContent('In Stock');
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true
      });

      render(ProductCard, { product: mockProduct });
      
      const card = screen.getByTestId('product-card');
      expect(card).toHaveClass('mobile-layout');
    });

    it('adapts to tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 768,
        writable: true
      });

      render(ProductCard, { product: mockProduct });
      
      const card = screen.getByTestId('product-card');
      expect(card).toHaveClass('tablet-layout');
    });

    it('adapts to desktop viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true
      });

      render(ProductCard, { product: mockProduct });
      
      const card = screen.getByTestId('product-card');
      expect(card).toHaveClass('desktop-layout');
    });
  });

  describe('Error Handling', () => {
    it('handles missing product image gracefully', () => {
      const productWithoutImage = { ...mockProduct, image: null };
      render(ProductCard, { product: productWithoutImage });
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', '/images/placeholder-product.jpg');
    });

    it('handles invalid product data gracefully', () => {
      const invalidProduct = { ...mockProduct, price: null, name: null };
      render(ProductCard, { product: invalidProduct });
      
      expect(screen.getByText('Product Name Not Available')).toBeInTheDocument();
      expect(screen.getByText('Price Not Available')).toBeInTheDocument();
    });

    it('handles network errors during payment', async () => {
      const { enhancedPaymentProcessor } = await import('../../services/enhanced-payment-processor');
      vi.mocked(enhancedPaymentProcessor.processPayment).mockRejectedValue(new Error('Network error'));

      render(ProductCard, { product: mockProduct });
      
      const buyButton = screen.getByTestId('buy-now-btn');
      fireEvent.click(buyButton);
      
      await waitFor(() => {
        const confirmButton = screen.getByTestId('confirm-payment');
        fireEvent.click(confirmButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('payment-error')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('renders without performance issues', () => {
      const startTime = performance.now();
      render(ProductCard, { product: mockProduct });
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render in less than 100ms
    });

    it('handles rapid button clicks gracefully', async () => {
      const mockAddToCart = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(ProductCard, { product: mockProduct, onAddToCart: mockAddToCart });
      
      const cartButton = screen.getByTestId('add-to-cart-btn');
      
      // Click multiple times rapidly
      fireEvent.click(cartButton);
      fireEvent.click(cartButton);
      fireEvent.click(cartButton);
      
      // Should only call addToCart once
      await waitFor(() => {
        expect(mockAddToCart).toHaveBeenCalledTimes(1);
      });
    });
  });
});
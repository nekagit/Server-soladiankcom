/**
 * NFTCard Component Tests
 * Comprehensive testing for the NFTCard component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import NFTCard from '../solana/NFTCard.astro';

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

describe('NFTCard Component', () => {
  const mockNFT = {
    mint: 'test-nft-mint-address',
    name: 'Test NFT',
    description: 'This is a test NFT description',
    image: 'https://example.com/nft-image.jpg',
    animationUrl: 'https://example.com/nft-animation.mp4',
    attributes: [
      { trait_type: 'Color', value: 'Blue' },
      { trait_type: 'Rarity', value: 'Rare' },
      { trait_type: 'Level', value: '5' }
    ],
    collection: 'Test Collection',
    collectionName: 'Test Collection',
    symbol: 'TST',
    seller: 'test-seller-address',
    owner: 'test-owner-address',
    price: 5.0,
    currency: 'SOL',
    isListed: true,
    isAuction: false,
    auctionEndTime: null,
    highestBid: null,
    bidCount: 0,
    views: 150,
    likes: 25,
    isLiked: false,
    rarity: 'Rare',
    verified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders NFT information correctly', () => {
      render(NFTCard, { nft: mockNFT });
      
      expect(screen.getByText('Test NFT')).toBeInTheDocument();
      expect(screen.getByText('This is a test NFT description')).toBeInTheDocument();
      expect(screen.getByText('Test Collection')).toBeInTheDocument();
      expect(screen.getByText('5.0 SOL')).toBeInTheDocument();
      expect(screen.getByText('Rare')).toBeInTheDocument();
    });

    it('renders NFT image with correct attributes', () => {
      render(NFTCard, { nft: mockNFT });
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'https://example.com/nft-image.jpg');
      expect(image).toHaveAttribute('alt', 'Test NFT');
    });

    it('renders animation when available', () => {
      render(NFTCard, { nft: mockNFT });
      
      const video = screen.getByTestId('nft-animation');
      expect(video).toHaveAttribute('src', 'https://example.com/nft-animation.mp4');
    });

    it('renders attributes correctly', () => {
      render(NFTCard, { nft: mockNFT });
      
      expect(screen.getByText('Color: Blue')).toBeInTheDocument();
      expect(screen.getByText('Rarity: Rare')).toBeInTheDocument();
      expect(screen.getByText('Level: 5')).toBeInTheDocument();
    });

    it('renders verification badge when verified', () => {
      render(NFTCard, { nft: mockNFT });
      
      expect(screen.getByTestId('verified-badge')).toBeInTheDocument();
    });

    it('renders rarity badge', () => {
      render(NFTCard, { nft: mockNFT });
      
      const rarityBadge = screen.getByTestId('rarity-badge');
      expect(rarityBadge).toHaveTextContent('Rare');
    });

    it('renders stats correctly', () => {
      render(NFTCard, { nft: mockNFT });
      
      expect(screen.getByText('150')).toBeInTheDocument(); // views
      expect(screen.getByText('25')).toBeInTheDocument(); // likes
    });
  });

  describe('Price Display', () => {
    it('displays price correctly for listed NFT', () => {
      render(NFTCard, { nft: mockNFT });
      
      const price = screen.getByTestId('nft-price');
      expect(price).toHaveTextContent('5.0 SOL');
    });

    it('displays not for sale when not listed', () => {
      const unlistedNFT = { ...mockNFT, isListed: false };
      render(NFTCard, { nft: unlistedNFT });
      
      expect(screen.getByText('Not for Sale')).toBeInTheDocument();
    });

    it('displays auction information when in auction', () => {
      const auctionNFT = { 
        ...mockNFT, 
        isAuction: true, 
        auctionEndTime: '2024-01-02T00:00:00Z',
        highestBid: 6.0,
        bidCount: 5
      };
      render(NFTCard, { nft: auctionNFT });
      
      expect(screen.getByText('Auction')).toBeInTheDocument();
      expect(screen.getByText('Highest: 6.0 SOL')).toBeInTheDocument();
      expect(screen.getByText('5 bids')).toBeInTheDocument();
    });
  });

  describe('Interactive Elements', () => {
    it('renders buy now button when listed and not auction', () => {
      render(NFTCard, { nft: mockNFT });
      
      const buyButton = screen.getByTestId('buy-nft-btn');
      expect(buyButton).toBeInTheDocument();
      expect(buyButton).toHaveTextContent('Buy Now');
    });

    it('renders place bid button when in auction', () => {
      const auctionNFT = { ...mockNFT, isAuction: true };
      render(NFTCard, { nft: auctionNFT });
      
      const bidButton = screen.getByTestId('place-bid-btn');
      expect(bidButton).toBeInTheDocument();
      expect(bidButton).toHaveTextContent('Place Bid');
    });

    it('renders like button', () => {
      render(NFTCard, { nft: mockNFT });
      
      const likeButton = screen.getByTestId('like-btn');
      expect(likeButton).toBeInTheDocument();
    });

    it('renders share button', () => {
      render(NFTCard, { nft: mockNFT });
      
      const shareButton = screen.getByTestId('share-nft-btn');
      expect(shareButton).toBeInTheDocument();
    });

    it('renders view details button', () => {
      render(NFTCard, { nft: mockNFT });
      
      const viewButton = screen.getByTestId('view-details-btn');
      expect(viewButton).toBeInTheDocument();
      expect(viewButton).toHaveTextContent('View Details');
    });
  });

  describe('Buy NFT Functionality', () => {
    it('opens buy modal when buy now is clicked', async () => {
      render(NFTCard, { nft: mockNFT });
      
      const buyButton = screen.getByTestId('buy-nft-btn');
      fireEvent.click(buyButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('buy-nft-modal')).toBeInTheDocument();
      });
    });

    it('displays NFT details in buy modal', async () => {
      render(NFTCard, { nft: mockNFT });
      
      const buyButton = screen.getByTestId('buy-nft-btn');
      fireEvent.click(buyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Test NFT')).toBeInTheDocument();
        expect(screen.getByText('5.0 SOL')).toBeInTheDocument();
        expect(screen.getByText('Test Collection')).toBeInTheDocument();
      });
    });

    it('processes NFT purchase when confirmed', async () => {
      const { enhancedPaymentProcessor } = await import('../../services/enhanced-payment-processor');
      vi.mocked(enhancedPaymentProcessor.processPayment).mockResolvedValue({
        success: true,
        signature: 'test-signature',
        transactionId: 'test-signature'
      });

      render(NFTCard, { nft: mockNFT });
      
      const buyButton = screen.getByTestId('buy-nft-btn');
      fireEvent.click(buyButton);
      
      await waitFor(() => {
        const confirmButton = screen.getByTestId('confirm-purchase');
        fireEvent.click(confirmButton);
      });
      
      expect(enhancedPaymentProcessor.processPayment).toHaveBeenCalledWith({
        amount: 5.0,
        currency: 'SOL',
        recipient: 'test-seller-address',
        memo: 'Purchase of Test NFT'
      });
    });

    it('handles purchase errors gracefully', async () => {
      const { enhancedPaymentProcessor } = await import('../../services/enhanced-payment-processor');
      vi.mocked(enhancedPaymentProcessor.processPayment).mockResolvedValue({
        success: false,
        error: 'Insufficient funds'
      });

      render(NFTCard, { nft: mockNFT });
      
      const buyButton = screen.getByTestId('buy-nft-btn');
      fireEvent.click(buyButton);
      
      await waitFor(() => {
        const confirmButton = screen.getByTestId('confirm-purchase');
        fireEvent.click(confirmButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('purchase-error')).toBeInTheDocument();
        expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
      });
    });
  });

  describe('Auction Functionality', () => {
    it('opens bid modal when place bid is clicked', async () => {
      const auctionNFT = { ...mockNFT, isAuction: true };
      render(NFTCard, { nft: auctionNFT });
      
      const bidButton = screen.getByTestId('place-bid-btn');
      fireEvent.click(bidButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('bid-modal')).toBeInTheDocument();
      });
    });

    it('displays auction information in bid modal', async () => {
      const auctionNFT = { 
        ...mockNFT, 
        isAuction: true, 
        highestBid: 6.0,
        bidCount: 5
      };
      render(NFTCard, { nft: auctionNFT });
      
      const bidButton = screen.getByTestId('place-bid-btn');
      fireEvent.click(bidButton);
      
      await waitFor(() => {
        expect(screen.getByText('Current Highest: 6.0 SOL')).toBeInTheDocument();
        expect(screen.getByText('5 bids')).toBeInTheDocument();
      });
    });

    it('validates bid amount', async () => {
      const auctionNFT = { ...mockNFT, isAuction: true, highestBid: 6.0 };
      render(NFTCard, { nft: auctionNFT });
      
      const bidButton = screen.getByTestId('place-bid-btn');
      fireEvent.click(bidButton);
      
      await waitFor(() => {
        const bidInput = screen.getByTestId('bid-amount');
        const submitBid = screen.getByTestId('submit-bid');
        
        fireEvent.change(bidInput, { target: { value: '5.0' } });
        fireEvent.click(submitBid);
        
        expect(screen.getByTestId('bid-error')).toBeInTheDocument();
        expect(screen.getByText('Bid must be higher than current highest bid')).toBeInTheDocument();
      });
    });

    it('processes valid bid', async () => {
      const { enhancedPaymentProcessor } = await import('../../services/enhanced-payment-processor');
      vi.mocked(enhancedPaymentProcessor.placeAuctionBid).mockResolvedValue({
        auctionId: 'test-auction',
        bidder: 'test-wallet-address',
        amount: 7.0,
        currency: 'SOL',
        timestamp: Date.now(),
        signature: 'bid-signature'
      });

      const auctionNFT = { ...mockNFT, isAuction: true, highestBid: 6.0 };
      render(NFTCard, { nft: auctionNFT });
      
      const bidButton = screen.getByTestId('place-bid-btn');
      fireEvent.click(bidButton);
      
      await waitFor(() => {
        const bidInput = screen.getByTestId('bid-amount');
        const submitBid = screen.getByTestId('submit-bid');
        
        fireEvent.change(bidInput, { target: { value: '7.0' } });
        fireEvent.click(submitBid);
      });
      
      expect(enhancedPaymentProcessor.placeAuctionBid).toHaveBeenCalledWith(
        'test-auction',
        7.0,
        'SOL'
      );
    });
  });

  describe('Like Functionality', () => {
    it('toggles like status when like button is clicked', async () => {
      const mockToggleLike = vi.fn();
      render(NFTCard, { nft: mockNFT, onToggleLike: mockToggleLike });
      
      const likeButton = screen.getByTestId('like-btn');
      fireEvent.click(likeButton);
      
      expect(mockToggleLike).toHaveBeenCalledWith(mockNFT.mint);
    });

    it('shows filled heart when NFT is liked', () => {
      const likedNFT = { ...mockNFT, isLiked: true };
      render(NFTCard, { nft: likedNFT });
      
      const likeButton = screen.getByTestId('like-btn');
      expect(likeButton).toHaveClass('liked');
    });

    it('shows empty heart when NFT is not liked', () => {
      render(NFTCard, { nft: mockNFT });
      
      const likeButton = screen.getByTestId('like-btn');
      expect(likeButton).toHaveClass('not-liked');
    });

    it('updates like count when liked', async () => {
      const mockToggleLike = vi.fn().mockResolvedValue({ likes: 26 });
      render(NFTCard, { nft: mockNFT, onToggleLike: mockToggleLike });
      
      const likeButton = screen.getByTestId('like-btn');
      fireEvent.click(likeButton);
      
      await waitFor(() => {
        expect(screen.getByText('26')).toBeInTheDocument();
      });
    });
  });

  describe('Share Functionality', () => {
    it('opens share modal when share button is clicked', async () => {
      render(NFTCard, { nft: mockNFT });
      
      const shareButton = screen.getByTestId('share-nft-btn');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('share-nft-modal')).toBeInTheDocument();
      });
    });

    it('displays share options in modal', async () => {
      render(NFTCard, { nft: mockNFT });
      
      const shareButton = screen.getByTestId('share-nft-btn');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('share-twitter')).toBeInTheDocument();
        expect(screen.getByTestId('share-discord')).toBeInTheDocument();
        expect(screen.getByTestId('share-telegram')).toBeInTheDocument();
        expect(screen.getByTestId('share-copy-link')).toBeInTheDocument();
      });
    });

    it('copies NFT link to clipboard', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: mockWriteText },
        writable: true
      });

      render(NFTCard, { nft: mockNFT });
      
      const shareButton = screen.getByTestId('share-nft-btn');
      fireEvent.click(shareButton);
      
      await waitFor(() => {
        const copyButton = screen.getByTestId('share-copy-link');
        fireEvent.click(copyButton);
      });
      
      expect(mockWriteText).toHaveBeenCalledWith(`${window.location.origin}/nft/${mockNFT.mint}`);
    });
  });

  describe('View Details Functionality', () => {
    it('navigates to NFT details page when view details is clicked', () => {
      const mockNavigate = vi.fn();
      render(NFTCard, { nft: mockNFT, onNavigate: mockNavigate });
      
      const viewButton = screen.getByTestId('view-details-btn');
      fireEvent.click(viewButton);
      
      expect(mockNavigate).toHaveBeenCalledWith(`/nft/${mockNFT.mint}`);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for interactive elements', () => {
      render(NFTCard, { nft: mockNFT });
      
      expect(screen.getByTestId('buy-nft-btn')).toHaveAttribute('aria-label', 'Buy Test NFT for 5.0 SOL');
      expect(screen.getByTestId('like-btn')).toHaveAttribute('aria-label', 'Like Test NFT');
      expect(screen.getByTestId('share-nft-btn')).toHaveAttribute('aria-label', 'Share Test NFT');
      expect(screen.getByTestId('view-details-btn')).toHaveAttribute('aria-label', 'View details for Test NFT');
    });

    it('has proper ARIA labels for NFT information', () => {
      render(NFTCard, { nft: mockNFT });
      
      expect(screen.getByTestId('nft-price')).toHaveAttribute('aria-label', 'Price: 5.0 SOL');
      expect(screen.getByTestId('rarity-badge')).toHaveAttribute('aria-label', 'Rarity: Rare');
    });

    it('supports keyboard navigation', () => {
      render(NFTCard, { nft: mockNFT });
      
      const buyButton = screen.getByTestId('buy-nft-btn');
      buyButton.focus();
      
      expect(document.activeElement).toBe(buyButton);
    });

    it('announces NFT status to screen readers', () => {
      render(NFTCard, { nft: mockNFT });
      
      const statusAnnouncement = screen.getByTestId('nft-status-announcement');
      expect(statusAnnouncement).toHaveAttribute('aria-live', 'polite');
      expect(statusAnnouncement).toHaveTextContent('Listed for sale');
    });
  });

  describe('Responsive Design', () => {
    it('adapts to mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 375,
        writable: true
      });

      render(NFTCard, { nft: mockNFT });
      
      const card = screen.getByTestId('nft-card');
      expect(card).toHaveClass('mobile-layout');
    });

    it('adapts to tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 768,
        writable: true
      });

      render(NFTCard, { nft: mockNFT });
      
      const card = screen.getByTestId('nft-card');
      expect(card).toHaveClass('tablet-layout');
    });

    it('adapts to desktop viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        value: 1024,
        writable: true
      });

      render(NFTCard, { nft: mockNFT });
      
      const card = screen.getByTestId('nft-card');
      expect(card).toHaveClass('desktop-layout');
    });
  });

  describe('Error Handling', () => {
    it('handles missing NFT image gracefully', () => {
      const nftWithoutImage = { ...mockNFT, image: null };
      render(NFTCard, { nft: nftWithoutImage });
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', '/images/placeholder-nft.jpg');
    });

    it('handles missing NFT animation gracefully', () => {
      const nftWithoutAnimation = { ...mockNFT, animationUrl: null };
      render(NFTCard, { nft: nftWithoutAnimation });
      
      expect(screen.queryByTestId('nft-animation')).not.toBeInTheDocument();
    });

    it('handles invalid NFT data gracefully', () => {
      const invalidNFT = { ...mockNFT, name: null, price: null };
      render(NFTCard, { nft: invalidNFT });
      
      expect(screen.getByText('NFT Name Not Available')).toBeInTheDocument();
      expect(screen.getByText('Price Not Available')).toBeInTheDocument();
    });

    it('handles network errors during purchase', async () => {
      const { enhancedPaymentProcessor } = await import('../../services/enhanced-payment-processor');
      vi.mocked(enhancedPaymentProcessor.processPayment).mockRejectedValue(new Error('Network error'));

      render(NFTCard, { nft: mockNFT });
      
      const buyButton = screen.getByTestId('buy-nft-btn');
      fireEvent.click(buyButton);
      
      await waitFor(() => {
        const confirmButton = screen.getByTestId('confirm-purchase');
        fireEvent.click(confirmButton);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('purchase-error')).toBeInTheDocument();
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('renders without performance issues', () => {
      const startTime = performance.now();
      render(NFTCard, { nft: mockNFT });
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should render in less than 100ms
    });

    it('handles rapid button clicks gracefully', async () => {
      const mockToggleLike = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(NFTCard, { nft: mockNFT, onToggleLike: mockToggleLike });
      
      const likeButton = screen.getByTestId('like-btn');
      
      // Click multiple times rapidly
      fireEvent.click(likeButton);
      fireEvent.click(likeButton);
      fireEvent.click(likeButton);
      
      // Should only call toggleLike once
      await waitFor(() => {
        expect(mockToggleLike).toHaveBeenCalledTimes(1);
      });
    });
  });
});

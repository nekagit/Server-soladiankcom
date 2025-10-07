/**
 * Production-Grade NFT Marketplace Service
 * Complete NFT marketplace functionality with comprehensive error handling and state management
 */

import { productionWalletService } from './production-wallet-service';
import { productionPaymentProcessor } from './production-payment-processor';
import { solanaService } from './solana';

export interface NFT {
  id: string;
  mint: string;
  name: string;
  description: string;
  image: string;
  animationUrl?: string;
  attributes: NFTAttribute[];
  collection: string;
  owner: string;
  creator: string;
  price?: number;
  currency?: string;
  status: 'available' | 'sold' | 'auction' | 'offers';
  createdAt: number;
  updatedAt: number;
  metadata: NFTMetadata;
}

export interface NFTAttribute {
  trait_type: string;
  value: string | number;
  display_type?: string;
  max_value?: number;
}

export interface NFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  animation_url?: string;
  external_url?: string;
  attributes: NFTAttribute[];
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
    category?: string;
    creators?: Array<{
      address: string;
      share: number;
    }>;
  };
}

export interface NFTCollection {
  id: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  banner?: string;
  creator: string;
  verified: boolean;
  totalSupply: number;
  floorPrice: number;
  volumeTraded: number;
  createdAt: number;
  updatedAt: number;
  nfts: NFT[];
}

export interface NFTOffer {
  id: string;
  nftId: string;
  bidder: string;
  amount: number;
  currency: string;
  status: 'active' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: number;
  expiresAt: number;
  signature?: string;
}

export interface NFTAuction {
  id: string;
  nftId: string;
  seller: string;
  startingPrice: number;
  currentBid: number;
  currency: string;
  status: 'active' | 'ended' | 'cancelled';
  startTime: number;
  endTime: number;
  highestBidder?: string;
  bids: NFTOffer[];
}

export interface MarketplaceState {
  nfts: NFT[];
  collections: NFTCollection[];
  offers: NFTOffer[];
  auctions: NFTAuction[];
  loading: boolean;
  error: string | null;
  filters: MarketplaceFilters;
  pagination: PaginationState;
  lastUpdated: number;
}

export interface MarketplaceFilters {
  search: string;
  collection: string;
  priceMin: number;
  priceMax: number;
  currency: string;
  status: string;
  attributes: Record<string, string>;
  sortBy: 'price' | 'date' | 'name' | 'rarity';
  sortOrder: 'asc' | 'desc';
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface MarketplaceError {
  code: string;
  message: string;
  details?: any;
  retryable: boolean;
  timestamp: number;
}

export class ProductionNFTMarketplace {
  private state: MarketplaceState = {
    nfts: [],
    collections: [],
    offers: [],
    auctions: [],
    loading: false,
    error: null,
    filters: {
      search: '',
      collection: '',
      priceMin: 0,
      priceMax: 0,
      currency: 'SOL',
      status: 'available',
      attributes: {},
      sortBy: 'date',
      sortOrder: 'desc'
    },
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0
    },
    lastUpdated: 0
  };

  private listeners: Set<(state: MarketplaceState) => void> = new Set();
  private searchTimeout: NodeJS.Timeout | null = null;
  private readonly STORAGE_KEY = 'soladia-marketplace-state';
  private readonly SEARCH_DELAY = 300; // 300ms debounce

  constructor() {
    this.loadMarketplaceStateFromStorage();
    this.initializeMarketplace();
  }

  /**
   * Initialize marketplace
   */
  private async initializeMarketplace(): Promise<void> {
    try {
      this.setState({ loading: true, error: null });
      
      // Load initial data
      await Promise.all([
        this.loadNFTs(),
        this.loadCollections(),
        this.loadOffers(),
        this.loadAuctions()
      ]);

      this.setState({ loading: false, lastUpdated: Date.now() });
    } catch (error) {
      this.handleMarketplaceError(error);
    }
  }

  /**
   * Load NFTs from API
   */
  async loadNFTs(): Promise<void> {
    try {
      const response = await fetch('/api/nfts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load NFTs: ${response.statusText}`);
      }

      const data = await response.json();
      this.setState({ nfts: data.nfts || [] });
    } catch (error) {
      console.error('Failed to load NFTs:', error);
      throw error;
    }
  }

  /**
   * Load collections from API
   */
  async loadCollections(): Promise<void> {
    try {
      const response = await fetch('/api/collections', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load collections: ${response.statusText}`);
      }

      const data = await response.json();
      this.setState({ collections: data.collections || [] });
    } catch (error) {
      console.error('Failed to load collections:', error);
      throw error;
    }
  }

  /**
   * Load offers from API
   */
  async loadOffers(): Promise<void> {
    try {
      const response = await fetch('/api/nfts/offers', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load offers: ${response.statusText}`);
      }

      const data = await response.json();
      this.setState({ offers: data.offers || [] });
    } catch (error) {
      console.error('Failed to load offers:', error);
      throw error;
    }
  }

  /**
   * Load auctions from API
   */
  async loadAuctions(): Promise<void> {
    try {
      const response = await fetch('/api/nfts/auctions', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load auctions: ${response.statusText}`);
      }

      const data = await response.json();
      this.setState({ auctions: data.auctions || [] });
    } catch (error) {
      console.error('Failed to load auctions:', error);
      throw error;
    }
  }

  /**
   * Search NFTs
   */
  async searchNFTs(query: string): Promise<NFT[]> {
    if (!query.trim()) {
      return this.state.nfts;
    }

    try {
      this.setState({ loading: true, error: null });

      const response = await fetch(`/api/nfts/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      const nfts = data.nfts || [];

      this.setState({ nfts, loading: false, lastUpdated: Date.now() });
      return nfts;

    } catch (error) {
      this.handleMarketplaceError(error);
      return [];
    }
  }

  /**
   * Filter NFTs
   */
  filterNFTs(filters: Partial<MarketplaceFilters>): NFT[] {
    const newFilters = { ...this.state.filters, ...filters };
    this.setState({ filters: newFilters });

    let filteredNFTs = [...this.state.nfts];

    // Apply search filter
    if (newFilters.search) {
      const searchTerm = newFilters.search.toLowerCase();
      filteredNFTs = filteredNFTs.filter(nft =>
        nft.name.toLowerCase().includes(searchTerm) ||
        nft.description.toLowerCase().includes(searchTerm) ||
        nft.collection.toLowerCase().includes(searchTerm)
      );
    }

    // Apply collection filter
    if (newFilters.collection) {
      filteredNFTs = filteredNFTs.filter(nft => nft.collection === newFilters.collection);
    }

    // Apply price filter
    if (newFilters.priceMin > 0) {
      filteredNFTs = filteredNFTs.filter(nft => (nft.price || 0) >= newFilters.priceMin);
    }
    if (newFilters.priceMax > 0) {
      filteredNFTs = filteredNFTs.filter(nft => (nft.price || 0) <= newFilters.priceMax);
    }

    // Apply currency filter
    if (newFilters.currency) {
      filteredNFTs = filteredNFTs.filter(nft => nft.currency === newFilters.currency);
    }

    // Apply status filter
    if (newFilters.status) {
      filteredNFTs = filteredNFTs.filter(nft => nft.status === newFilters.status);
    }

    // Apply attribute filters
    Object.entries(newFilters.attributes).forEach(([trait, value]) => {
      if (value) {
        filteredNFTs = filteredNFTs.filter(nft =>
          nft.attributes.some(attr => attr.trait_type === trait && attr.value === value)
        );
      }
    });

    // Apply sorting
    filteredNFTs.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (newFilters.sortBy) {
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'date':
          aValue = a.createdAt;
          bValue = b.createdAt;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'rarity':
          aValue = this.calculateRarity(a);
          bValue = this.calculateRarity(b);
          break;
        default:
          return 0;
      }

      if (newFilters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filteredNFTs;
  }

  /**
   * Calculate NFT rarity score
   */
  private calculateRarity(nft: NFT): number {
    // Simple rarity calculation based on attribute uniqueness
    const totalNFTs = this.state.nfts.length;
    let rarityScore = 0;

    nft.attributes.forEach(attr => {
      const sameTraitCount = this.state.nfts.filter(otherNft =>
        otherNft.attributes.some(otherAttr =>
          otherAttr.trait_type === attr.trait_type && otherAttr.value === attr.value
        )
      ).length;

      rarityScore += (totalNFTs - sameTraitCount) / totalNFTs;
    });

    return rarityScore;
  }

  /**
   * Buy NFT
   */
  async buyNFT(nftId: string, price: number, currency: string = 'SOL'): Promise<boolean> {
    try {
      if (!productionWalletService.isConnected()) {
        throw this.createMarketplaceError('WALLET_NOT_CONNECTED', 'Wallet not connected');
      }

      const nft = this.state.nfts.find(n => n.id === nftId);
      if (!nft) {
        throw this.createMarketplaceError('NFT_NOT_FOUND', 'NFT not found');
      }

      if (nft.status !== 'available') {
        throw this.createMarketplaceError('NFT_NOT_AVAILABLE', 'NFT is not available for purchase');
      }

      // Process payment
      const paymentResult = await productionPaymentProcessor.processSOLPayment({
        amount: price,
        recipient: nft.owner,
        memo: `Purchase of ${nft.name}`
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      // Update NFT status
      const updatedNFTs = this.state.nfts.map(n =>
        n.id === nftId ? { ...n, status: 'sold' as const, updatedAt: Date.now() } : n
      );

      this.setState({ nfts: updatedNFTs, lastUpdated: Date.now() });
      this.saveMarketplaceStateToStorage();

      return true;

    } catch (error) {
      this.handleMarketplaceError(error);
      return false;
    }
  }

  /**
   * Make offer on NFT
   */
  async makeOffer(nftId: string, amount: number, currency: string = 'SOL'): Promise<boolean> {
    try {
      if (!productionWalletService.isConnected()) {
        throw this.createMarketplaceError('WALLET_NOT_CONNECTED', 'Wallet not connected');
      }

      const nft = this.state.nfts.find(n => n.id === nftId);
      if (!nft) {
        throw this.createMarketplaceError('NFT_NOT_FOUND', 'NFT not found');
      }

      const offer: NFTOffer = {
        id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nftId,
        bidder: productionWalletService.getAddress()!,
        amount,
        currency,
        status: 'active',
        createdAt: Date.now(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
      };

      // Process payment (escrow)
      const paymentResult = await productionPaymentProcessor.processEscrowPayment({
        amount,
        recipient: nft.owner,
        memo: `Offer for ${nft.name}`,
        metadata: { offerId: offer.id }
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      offer.signature = paymentResult.signature;

      // Add offer to state
      this.setState({
        offers: [...this.state.offers, offer],
        lastUpdated: Date.now()
      });

      this.saveMarketplaceStateToStorage();
      return true;

    } catch (error) {
      this.handleMarketplaceError(error);
      return false;
    }
  }

  /**
   * Accept offer
   */
  async acceptOffer(offerId: string): Promise<boolean> {
    try {
      const offer = this.state.offers.find(o => o.id === offerId);
      if (!offer) {
        throw this.createMarketplaceError('OFFER_NOT_FOUND', 'Offer not found');
      }

      if (offer.status !== 'active') {
        throw this.createMarketplaceError('INVALID_OFFER_STATUS', 'Offer is not active');
      }

      // Release escrow payment
      const paymentResult = await productionPaymentProcessor.releaseEscrow(offerId);
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment release failed');
      }

      // Update offer status
      const updatedOffers = this.state.offers.map(o =>
        o.id === offerId ? { ...o, status: 'accepted' as const } : o
      );

      // Update NFT status
      const updatedNFTs = this.state.nfts.map(n =>
        n.id === offer.nftId ? { ...n, status: 'sold' as const, updatedAt: Date.now() } : n
      );

      this.setState({
        offers: updatedOffers,
        nfts: updatedNFTs,
        lastUpdated: Date.now()
      });

      this.saveMarketplaceStateToStorage();
      return true;

    } catch (error) {
      this.handleMarketplaceError(error);
      return false;
    }
  }

  /**
   * Reject offer
   */
  async rejectOffer(offerId: string): Promise<boolean> {
    try {
      const offer = this.state.offers.find(o => o.id === offerId);
      if (!offer) {
        throw this.createMarketplaceError('OFFER_NOT_FOUND', 'Offer not found');
      }

      // Cancel escrow payment
      const paymentResult = await productionPaymentProcessor.cancelEscrow(offerId);
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment cancellation failed');
      }

      // Update offer status
      const updatedOffers = this.state.offers.map(o =>
        o.id === offerId ? { ...o, status: 'rejected' as const } : o
      );

      this.setState({
        offers: updatedOffers,
        lastUpdated: Date.now()
      });

      this.saveMarketplaceStateToStorage();
      return true;

    } catch (error) {
      this.handleMarketplaceError(error);
      return false;
    }
  }

  /**
   * Create auction
   */
  async createAuction(
    nftId: string,
    startingPrice: number,
    duration: number,
    currency: string = 'SOL'
  ): Promise<boolean> {
    try {
      if (!productionWalletService.isConnected()) {
        throw this.createMarketplaceError('WALLET_NOT_CONNECTED', 'Wallet not connected');
      }

      const nft = this.state.nfts.find(n => n.id === nftId);
      if (!nft) {
        throw this.createMarketplaceError('NFT_NOT_FOUND', 'NFT not found');
      }

      const auction: NFTAuction = {
        id: `auction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nftId,
        seller: productionWalletService.getAddress()!,
        startingPrice,
        currentBid: startingPrice,
        currency,
        status: 'active',
        startTime: Date.now(),
        endTime: Date.now() + duration,
        bids: []
      };

      // Update NFT status
      const updatedNFTs = this.state.nfts.map(n =>
        n.id === nftId ? { ...n, status: 'auction' as const, updatedAt: Date.now() } : n
      );

      this.setState({
        auctions: [...this.state.auctions, auction],
        nfts: updatedNFTs,
        lastUpdated: Date.now()
      });

      this.saveMarketplaceStateToStorage();
      return true;

    } catch (error) {
      this.handleMarketplaceError(error);
      return false;
    }
  }

  /**
   * Place auction bid
   */
  async placeAuctionBid(auctionId: string, amount: number): Promise<boolean> {
    try {
      if (!productionWalletService.isConnected()) {
        throw this.createMarketplaceError('WALLET_NOT_CONNECTED', 'Wallet not connected');
      }

      const auction = this.state.auctions.find(a => a.id === auctionId);
      if (!auction) {
        throw this.createMarketplaceError('AUCTION_NOT_FOUND', 'Auction not found');
      }

      if (auction.status !== 'active') {
        throw this.createMarketplaceError('INVALID_AUCTION_STATUS', 'Auction is not active');
      }

      if (Date.now() > auction.endTime) {
        throw this.createMarketplaceError('AUCTION_ENDED', 'Auction has ended');
      }

      if (amount <= auction.currentBid) {
        throw this.createMarketplaceError('BID_TOO_LOW', 'Bid must be higher than current bid');
      }

      // Process payment (escrow)
      const paymentResult = await productionPaymentProcessor.processEscrowPayment({
        amount,
        recipient: auction.seller,
        memo: `Bid for auction ${auctionId}`,
        metadata: { auctionId, bidAmount: amount }
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed');
      }

      const bid: NFTOffer = {
        id: `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nftId: auction.nftId,
        bidder: productionWalletService.getAddress()!,
        amount,
        currency: auction.currency,
        status: 'active',
        createdAt: Date.now(),
        expiresAt: auction.endTime,
        signature: paymentResult.signature
      };

      // Update auction
      const updatedAuctions = this.state.auctions.map(a =>
        a.id === auctionId
          ? {
              ...a,
              currentBid: amount,
              highestBidder: productionWalletService.getAddress()!,
              bids: [...a.bids, bid]
            }
          : a
      );

      this.setState({
        auctions: updatedAuctions,
        lastUpdated: Date.now()
      });

      this.saveMarketplaceStateToStorage();
      return true;

    } catch (error) {
      this.handleMarketplaceError(error);
      return false;
    }
  }

  /**
   * End auction
   */
  async endAuction(auctionId: string): Promise<boolean> {
    try {
      const auction = this.state.auctions.find(a => a.id === auctionId);
      if (!auction) {
        throw this.createMarketplaceError('AUCTION_NOT_FOUND', 'Auction not found');
      }

      if (auction.status !== 'active') {
        throw this.createMarketplaceError('INVALID_AUCTION_STATUS', 'Auction is not active');
      }

      // Release escrow to highest bidder
      if (auction.highestBidder) {
        const paymentResult = await productionPaymentProcessor.releaseEscrow(auctionId);
        if (!paymentResult.success) {
          throw new Error(paymentResult.error || 'Payment release failed');
        }
      }

      // Update auction status
      const updatedAuctions = this.state.auctions.map(a =>
        a.id === auctionId ? { ...a, status: 'ended' as const } : a
      );

      // Update NFT status
      const updatedNFTs = this.state.nfts.map(n =>
        n.id === auction.nftId ? { ...n, status: 'sold' as const, updatedAt: Date.now() } : n
      );

      this.setState({
        auctions: updatedAuctions,
        nfts: updatedNFTs,
        lastUpdated: Date.now()
      });

      this.saveMarketplaceStateToStorage();
      return true;

    } catch (error) {
      this.handleMarketplaceError(error);
      return false;
    }
  }

  /**
   * Get NFT by ID
   */
  getNFTById(id: string): NFT | undefined {
    return this.state.nfts.find(nft => nft.id === id);
  }

  /**
   * Get collection by ID
   */
  getCollectionById(id: string): NFTCollection | undefined {
    return this.state.collections.find(collection => collection.id === id);
  }

  /**
   * Get user's NFTs
   */
  getUserNFTs(userAddress: string): NFT[] {
    return this.state.nfts.filter(nft => nft.owner === userAddress);
  }

  /**
   * Get user's offers
   */
  getUserOffers(userAddress: string): NFTOffer[] {
    return this.state.offers.filter(offer => offer.bidder === userAddress);
  }

  /**
   * Get user's auctions
   */
  getUserAuctions(userAddress: string): NFTAuction[] {
    return this.state.auctions.filter(auction => auction.seller === userAddress);
  }

  /**
   * Get current marketplace state
   */
  getState(): MarketplaceState {
    return { ...this.state };
  }

  /**
   * Add state change listener
   */
  addStateListener(listener: (state: MarketplaceState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Set marketplace filters
   */
  setFilters(filters: Partial<MarketplaceFilters>): void {
    const newFilters = { ...this.state.filters, ...filters };
    this.setState({ filters: newFilters });
    this.saveMarketplaceStateToStorage();
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    this.setState({
      filters: {
        search: '',
        collection: '',
        priceMin: 0,
        priceMax: 0,
        currency: 'SOL',
        status: 'available',
        attributes: {},
        sortBy: 'date',
        sortOrder: 'desc'
      }
    });
    this.saveMarketplaceStateToStorage();
  }

  /**
   * Handle marketplace errors
   */
  private handleMarketplaceError(error: any): void {
    const marketplaceError = this.createMarketplaceError(
      error.code || 'UNKNOWN_ERROR',
      error.message || 'An unknown error occurred',
      error.details
    );

    this.setState({
      loading: false,
      error: marketplaceError.message,
      lastUpdated: Date.now()
    });

    console.error('Marketplace error:', marketplaceError);
  }

  /**
   * Create marketplace error
   */
  private createMarketplaceError(code: string, message: string, details?: any): MarketplaceError {
    return {
      code,
      message,
      details,
      retryable: false,
      timestamp: Date.now()
    };
  }

  /**
   * Set marketplace state
   */
  private setState(updates: Partial<MarketplaceState>): void {
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
        console.error('Error in marketplace state listener:', error);
      }
    });
  }

  /**
   * Save marketplace state to storage
   */
  private saveMarketplaceStateToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.warn('Failed to save marketplace state to storage:', error);
    }
  }

  /**
   * Load marketplace state from storage
   */
  private loadMarketplaceStateFromStorage(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved);
        this.setState(state);
      }
    } catch (error) {
      console.warn('Failed to load marketplace state from storage:', error);
    }
  }

  /**
   * Refresh marketplace data
   */
  async refresh(): Promise<void> {
    await this.initializeMarketplace();
  }

  /**
   * Clear marketplace data
   */
  clearData(): void {
    this.setState({
      nfts: [],
      collections: [],
      offers: [],
      auctions: [],
      loading: false,
      error: null,
      lastUpdated: 0
    });
    this.saveMarketplaceStateToStorage();
  }
}

// Export singleton instance
export const productionNFTMarketplace = new ProductionNFTMarketplace();
export default productionNFTMarketplace;

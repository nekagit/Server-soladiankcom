// Solana NFT service for marketplace functionality
export interface NFTMetadata {
  mint: string;
  name: string;
  symbol: string;
  description: string;
  image: string;
  externalUrl?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  collection?: string;
  sellerFeeBasisPoints?: number;
  creators?: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
}

export interface NFTOwnership {
  mint: string;
  owner: string;
  amount: number;
  delegate?: string;
  state: string;
  isFrozen: boolean;
}

export interface NFTListing {
  mint: string;
  seller: string;
  price: number; // Price in SOL
  currency: string;
  listingType: 'fixed' | 'auction';
  auctionEnd?: Date;
  currentBid?: number;
  minBid?: number;
  isActive: boolean;
  createdAt: Date;
}

export interface NFTAuction {
  mint: string;
  seller: string;
  startingPrice: number;
  currentBid: number;
  highestBidder?: string;
  auctionEnd: Date;
  isActive: boolean;
  minBidIncrement: number;
}

export class SolanaNFTService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = '/api') {
    this.apiBaseUrl = apiBaseUrl;
  }

  async getNFTMetadata(mint: string): Promise<NFTMetadata | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/solana/nfts/${mint}/metadata`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to get NFT metadata:', error);
      return null;
    }
  }

  async getNFTOwner(mint: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/solana/nfts/${mint}/owner`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.owner || null;
    } catch (error) {
      console.error('Failed to get NFT owner:', error);
      return null;
    }
  }

  async getWalletNFTs(walletAddress: string): Promise<NFTMetadata[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/solana/nfts/wallet/${walletAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.nfts || [];
    } catch (error) {
      console.error('Failed to get wallet NFTs:', error);
      return [];
    }
  }

  async createNFTListing(
    mint: string,
    seller: string,
    price: number,
    listingType: 'fixed' | 'auction' = 'fixed',
    auctionDurationHours: number = 24
  ): Promise<NFTListing | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/solana/nfts/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mint,
          seller,
          price,
          listingType,
          auctionDurationHours
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to create NFT listing:', error);
      return null;
    }
  }

  async placeBid(mint: string, bidder: string, amount: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/solana/nfts/bids`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mint,
          bidder,
          amount
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to place bid:', error);
      return false;
    }
  }

  async buyNFT(mint: string, buyer: string, price: number): Promise<{ success: boolean; signature?: string }> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/solana/nfts/buy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mint,
          buyer,
          price
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to buy NFT:', error);
      return { success: false };
    }
  }

  async cancelListing(mint: string, seller: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/solana/nfts/listings/${mint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seller })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to cancel listing:', error);
      return false;
    }
  }

  async getNFTListings(limit: number = 50, offset: number = 0): Promise<NFTListing[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/solana/nfts/listings?limit=${limit}&offset=${offset}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.listings || [];
    } catch (error) {
      console.error('Failed to get NFT listings:', error);
      return [];
    }
  }

  async searchNFTs(query: string, limit: number = 20): Promise<NFTMetadata[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/solana/nfts/search?q=${encodeURIComponent(query)}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.nfts || [];
    } catch (error) {
      console.error('Failed to search NFTs:', error);
      return [];
    }
  }

  async getNFTAuctions(limit: number = 20): Promise<NFTAuction[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/solana/nfts/auctions?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.auctions || [];
    } catch (error) {
      console.error('Failed to get NFT auctions:', error);
      return [];
    }
  }

  async getCollectionNFTs(collection: string, limit: number = 50): Promise<NFTMetadata[]> {
    try {
      const response = await fetch(
        `${this.apiBaseUrl}/solana/nfts/collection/${collection}?limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.nfts || [];
    } catch (error) {
      console.error('Failed to get collection NFTs:', error);
      return [];
    }
  }

  async getTrendingNFTs(limit: number = 20): Promise<NFTMetadata[]> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/solana/nfts/trending?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.nfts || [];
    } catch (error) {
      console.error('Failed to get trending NFTs:', error);
      return [];
    }
  }

  formatPrice(price: number, currency: string = 'SOL'): string {
    if (price === 0) return 'Free';
    if (price < 0.001) return `${price.toFixed(6)} ${currency}`;
    if (price < 1) return `${price.toFixed(4)} ${currency}`;
    return `${price.toFixed(2)} ${currency}`;
  }

  formatAddress(address: string, length: number = 8): string {
    if (address.length <= length * 2) {
      return address;
    }
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }

  getRarityColor(rarity: string): string {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return 'text-purple-600';
      case 'epic':
        return 'text-blue-600';
      case 'rare':
        return 'text-green-600';
      case 'uncommon':
        return 'text-yellow-600';
      case 'common':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  }

  getRarityIcon(rarity: string): string {
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return '👑';
      case 'epic':
        return '💎';
      case 'rare':
        return '⭐';
      case 'uncommon':
        return '🔸';
      case 'common':
        return '🔹';
      default:
        return '🔹';
    }
  }

  isAuctionActive(auction: NFTAuction): boolean {
    return auction.isActive && new Date() < auction.auctionEnd;
  }

  getTimeRemaining(auctionEnd: Date): string {
    const now = new Date();
    const diff = auctionEnd.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

// Create and export a singleton instance
export const solanaNFTService = new SolanaNFTService();

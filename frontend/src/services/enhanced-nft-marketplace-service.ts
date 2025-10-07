import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletAdapter, WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import { SolanaService } from './solana/solana-service';

export interface NFTData {
  id: string;
  name: string;
  symbol?: string;
  description: string;
  image: string;
  category: string;
  externalUrl?: string;
  price: number;
  royalties: number;
  supply: number;
  listingType: 'fixed' | 'auction' | 'offers';
  attributes: Array<{ trait: string; value: string }>;
  creator: string;
  collection?: string;
  mintAddress?: string;
  metadataUri?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionData {
  id: string;
  name: string;
  description: string;
  image: string;
  bannerImage?: string;
  creator: string;
  itemCount: number;
  floorPrice: number;
  volume: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileData {
  id: string;
  name: string;
  username: string;
  bio: string;
  avatar: string;
  banner?: string;
  nftCount: number;
  collectionCount: number;
  totalSales: number;
  followers: number;
  following: number;
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  status?: 'buy-now' | 'auction' | 'offers';
  sortBy?: 'price' | 'created' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CreateNFTRequest {
  name: string;
  symbol?: string;
  description: string;
  category: string;
  externalUrl?: string;
  price: number;
  royalties: number;
  supply: number;
  listingType: 'fixed' | 'auction' | 'offers';
  attributes: Array<{ trait: string; value: string }>;
  imageFile: File;
}

export interface CreateCollectionRequest {
  name: string;
  description: string;
  imageFile: File;
  bannerFile?: File;
}

export class NFTMarketplaceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'NFTMarketplaceError';
  }
}

export class CollectionError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'CollectionError';
  }
}

export class ProfileError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ProfileError';
  }
}

export class EnhancedNFTMarketplaceService {
  private connection: Connection;
  private wallet: WalletAdapter | null = null;
  private solanaService: SolanaService;

  constructor(network: WalletAdapterNetwork = WalletAdapterNetwork.Devnet) {
    this.connection = new Connection(clusterApiUrl(network), 'confirmed');
    this.solanaService = new SolanaService(network);
  }

  public setWallet(wallet: WalletAdapter | null): void {
    this.wallet = wallet;
  }

  public async getNFTs(filters: SearchFilters = {}): Promise<NFTData[]> {
    try {
      const response = await fetch('/api/nfts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters)
      });

      if (!response.ok) {
        throw new NFTMarketplaceError(`Failed to fetch NFTs: ${response.statusText}`, 'FETCH_NFTS_FAILED');
      }

      const data = await response.json();
      return data.nfts || [];

    } catch (error) {
      console.error('Error fetching NFTs:', error);
      // Return mock data for development
      return this.getMockNFTs();
    }
  }

  public async getNFTById(id: string): Promise<NFTData | null> {
    try {
      const response = await fetch(`/api/nfts/${id}`);
      
      if (!response.ok) {
        throw new NFTMarketplaceError(`Failed to fetch NFT: ${response.statusText}`, 'FETCH_NFT_FAILED');
      }

      const data = await response.json();
      return data.nft || null;

    } catch (error) {
      console.error('Error fetching NFT:', error);
      return null;
    }
  }

  public async createNFT(request: CreateNFTRequest): Promise<NFTData> {
    if (!this.wallet?.publicKey) {
      throw new NFTMarketplaceError('Wallet not connected', 'WALLET_NOT_CONNECTED');
    }

    try {
      // Upload image to IPFS
      const imageUrl = await this.uploadToIPFS(request.imageFile);
      
      // Create metadata
      const metadata = {
        name: request.name,
        symbol: request.symbol,
        description: request.description,
        image: imageUrl,
        external_url: request.externalUrl,
        attributes: request.attributes,
        properties: {
          category: request.category,
          creator: this.wallet.publicKey.toBase58(),
          royalties: request.royalties
        }
      };

      // Upload metadata to IPFS
      const metadataUrl = await this.uploadMetadataToIPFS(metadata);

      // Create NFT on Solana
      const mintAddress = await this.createNFTOnSolana({
        name: request.name,
        symbol: request.symbol || 'NFT',
        metadataUri: metadataUrl,
        supply: request.supply,
        royalties: request.royalties
      });

      // Save to database
      const nftData: NFTData = {
        id: mintAddress,
        name: request.name,
        symbol: request.symbol,
        description: request.description,
        image: imageUrl,
        category: request.category,
        externalUrl: request.externalUrl,
        price: request.price,
        royalties: request.royalties,
        supply: request.supply,
        listingType: request.listingType,
        attributes: request.attributes,
        creator: this.wallet.publicKey.toBase58(),
        mintAddress,
        metadataUri: metadataUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.saveNFTToDatabase(nftData);

      return nftData;

    } catch (error) {
      console.error('Error creating NFT:', error);
      throw new NFTMarketplaceError(
        error instanceof Error ? error.message : 'Failed to create NFT',
        'CREATE_NFT_FAILED'
      );
    }
  }

  public async updateNFT(id: string, updates: Partial<NFTData>): Promise<NFTData> {
    try {
      const response = await fetch(`/api/nfts/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new NFTMarketplaceError(`Failed to update NFT: ${response.statusText}`, 'UPDATE_NFT_FAILED');
      }

      const data = await response.json();
      return data.nft;

    } catch (error) {
      console.error('Error updating NFT:', error);
      throw new NFTMarketplaceError(
        error instanceof Error ? error.message : 'Failed to update NFT',
        'UPDATE_NFT_FAILED'
      );
    }
  }

  public async deleteNFT(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/nfts/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new NFTMarketplaceError(`Failed to delete NFT: ${response.statusText}`, 'DELETE_NFT_FAILED');
      }

    } catch (error) {
      console.error('Error deleting NFT:', error);
      throw new NFTMarketplaceError(
        error instanceof Error ? error.message : 'Failed to delete NFT',
        'DELETE_NFT_FAILED'
      );
    }
  }

  public async getCollections(): Promise<CollectionData[]> {
    try {
      const response = await fetch('/api/collections');
      
      if (!response.ok) {
        throw new CollectionError(`Failed to fetch collections: ${response.statusText}`, 'FETCH_COLLECTIONS_FAILED');
      }

      const data = await response.json();
      return data.collections || [];

    } catch (error) {
      console.error('Error fetching collections:', error);
      // Return mock data for development
      return this.getMockCollections();
    }
  }

  public async getCollectionById(id: string): Promise<CollectionData | null> {
    try {
      const response = await fetch(`/api/collections/${id}`);
      
      if (!response.ok) {
        throw new CollectionError(`Failed to fetch collection: ${response.statusText}`, 'FETCH_COLLECTION_FAILED');
      }

      const data = await response.json();
      return data.collection || null;

    } catch (error) {
      console.error('Error fetching collection:', error);
      return null;
    }
  }

  public async createCollection(request: CreateCollectionRequest): Promise<CollectionData> {
    if (!this.wallet?.publicKey) {
      throw new CollectionError('Wallet not connected', 'WALLET_NOT_CONNECTED');
    }

    try {
      // Upload images to IPFS
      const imageUrl = await this.uploadToIPFS(request.imageFile);
      const bannerUrl = request.bannerFile ? await this.uploadToIPFS(request.bannerFile) : undefined;

      // Create collection on Solana
      const collectionAddress = await this.createCollectionOnSolana({
        name: request.name,
        description: request.description,
        image: imageUrl,
        banner: bannerUrl
      });

      // Save to database
      const collectionData: CollectionData = {
        id: collectionAddress,
        name: request.name,
        description: request.description,
        image: imageUrl,
        bannerImage: bannerUrl,
        creator: this.wallet.publicKey.toBase58(),
        itemCount: 0,
        floorPrice: 0,
        volume: 0,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.saveCollectionToDatabase(collectionData);

      return collectionData;

    } catch (error) {
      console.error('Error creating collection:', error);
      throw new CollectionError(
        error instanceof Error ? error.message : 'Failed to create collection',
        'CREATE_COLLECTION_FAILED'
      );
    }
  }

  public async updateCollection(id: string, updates: Partial<CollectionData>): Promise<CollectionData> {
    try {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new CollectionError(`Failed to update collection: ${response.statusText}`, 'UPDATE_COLLECTION_FAILED');
      }

      const data = await response.json();
      return data.collection;

    } catch (error) {
      console.error('Error updating collection:', error);
      throw new CollectionError(
        error instanceof Error ? error.message : 'Failed to update collection',
        'UPDATE_COLLECTION_FAILED'
      );
    }
  }

  public async getProfile(): Promise<ProfileData> {
    try {
      const response = await fetch('/api/profile');
      
      if (!response.ok) {
        throw new ProfileError(`Failed to fetch profile: ${response.statusText}`, 'FETCH_PROFILE_FAILED');
      }

      const data = await response.json();
      return data.profile;

    } catch (error) {
      console.error('Error fetching profile:', error);
      // Return mock data for development
      return this.getMockProfile();
    }
  }

  public async updateProfile(updates: Partial<ProfileData>): Promise<ProfileData> {
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new ProfileError(`Failed to update profile: ${response.statusText}`, 'UPDATE_PROFILE_FAILED');
      }

      const data = await response.json();
      return data.profile;

    } catch (error) {
      console.error('Error updating profile:', error);
      throw new ProfileError(
        error instanceof Error ? error.message : 'Failed to update profile',
        'UPDATE_PROFILE_FAILED'
      );
    }
  }

  public async searchNFTs(query: string, filters: SearchFilters = {}): Promise<NFTData[]> {
    try {
      const searchFilters = { ...filters, query };
      return await this.getNFTs(searchFilters);

    } catch (error) {
      console.error('Error searching NFTs:', error);
      return [];
    }
  }

  public async getTrendingNFTs(): Promise<NFTData[]> {
    try {
      const filters: SearchFilters = {
        sortBy: 'popularity',
        sortOrder: 'desc',
        limit: 20
      };
      return await this.getNFTs(filters);

    } catch (error) {
      console.error('Error fetching trending NFTs:', error);
      return [];
    }
  }

  public async getRecentNFTs(): Promise<NFTData[]> {
    try {
      const filters: SearchFilters = {
        sortBy: 'created',
        sortOrder: 'desc',
        limit: 20
      };
      return await this.getNFTs(filters);

    } catch (error) {
      console.error('Error fetching recent NFTs:', error);
      return [];
    }
  }

  private async uploadToIPFS(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/ipfs/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.url;

    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      // Return mock URL for development
      return `https://ipfs.io/ipfs/mock-${Date.now()}`;
    }
  }

  private async uploadMetadataToIPFS(metadata: any): Promise<string> {
    try {
      const response = await fetch('/api/ipfs/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        throw new Error(`Metadata upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.url;

    } catch (error) {
      console.error('Error uploading metadata to IPFS:', error);
      // Return mock URL for development
      return `https://ipfs.io/ipfs/metadata-${Date.now()}`;
    }
  }

  private async createNFTOnSolana(params: {
    name: string;
    symbol: string;
    metadataUri: string;
    supply: number;
    royalties: number;
  }): Promise<string> {
    try {
      // This would integrate with Metaplex or similar NFT program
      // For now, return a mock mint address
      const mockMintAddress = new PublicKey().toBase58();
      
      // In a real implementation, this would:
      // 1. Create a new mint account
      // 2. Create metadata account
      // 3. Create master edition if supply > 1
      // 4. Return the actual mint address
      
      return mockMintAddress;

    } catch (error) {
      console.error('Error creating NFT on Solana:', error);
      throw new NFTMarketplaceError('Failed to create NFT on Solana', 'SOLANA_CREATE_FAILED');
    }
  }

  private async createCollectionOnSolana(params: {
    name: string;
    description: string;
    image: string;
    banner?: string;
  }): Promise<string> {
    try {
      // This would integrate with Metaplex or similar NFT program
      // For now, return a mock collection address
      const mockCollectionAddress = new PublicKey().toBase58();
      
      // In a real implementation, this would:
      // 1. Create a new collection account
      // 2. Set up collection metadata
      // 3. Configure collection settings
      // 4. Return the actual collection address
      
      return mockCollectionAddress;

    } catch (error) {
      console.error('Error creating collection on Solana:', error);
      throw new CollectionError('Failed to create collection on Solana', 'SOLANA_CREATE_FAILED');
    }
  }

  private async saveNFTToDatabase(nft: NFTData): Promise<void> {
    try {
      const response = await fetch('/api/nfts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(nft)
      });

      if (!response.ok) {
        throw new Error(`Failed to save NFT to database: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Error saving NFT to database:', error);
      // In development, we might not have a backend, so this is optional
    }
  }

  private async saveCollectionToDatabase(collection: CollectionData): Promise<void> {
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(collection)
      });

      if (!response.ok) {
        throw new Error(`Failed to save collection to database: ${response.statusText}`);
      }

    } catch (error) {
      console.error('Error saving collection to database:', error);
      // In development, we might not have a backend, so this is optional
    }
  }

  private getMockNFTs(): NFTData[] {
    return [
      {
        id: 'nft-1',
        name: 'Amazing Art #1234',
        symbol: 'AA',
        description: 'A beautiful piece of digital art',
        image: '/placeholder-nft-1.jpg',
        category: 'art',
        externalUrl: 'https://example.com',
        price: 2.5,
        royalties: 5,
        supply: 1,
        listingType: 'fixed',
        attributes: [
          { trait: 'Background', value: 'Blue' },
          { trait: 'Eyes', value: 'Green' },
          { trait: 'Mouth', value: 'Smile' }
        ],
        creator: 'creator-1',
        collection: 'Cool Collection',
        mintAddress: 'mint-1',
        metadataUri: 'https://ipfs.io/ipfs/metadata-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      },
      {
        id: 'nft-2',
        name: 'Gaming Character #5678',
        symbol: 'GC',
        description: 'A unique gaming character',
        image: '/placeholder-nft-2.jpg',
        category: 'gaming',
        price: 1.8,
        royalties: 3,
        supply: 1,
        listingType: 'auction',
        attributes: [
          { trait: 'Class', value: 'Warrior' },
          { trait: 'Level', value: '50' },
          { trait: 'Rarity', value: 'Epic' }
        ],
        creator: 'creator-2',
        collection: 'Game Collection',
        mintAddress: 'mint-2',
        metadataUri: 'https://ipfs.io/ipfs/metadata-2',
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02')
      }
    ];
  }

  private getMockCollections(): CollectionData[] {
    return [
      {
        id: 'collection-1',
        name: 'My Art Collection',
        description: 'A collection of my digital artwork',
        image: '/placeholder-collection-1.jpg',
        bannerImage: '/placeholder-banner-1.jpg',
        creator: 'creator-1',
        itemCount: 12,
        floorPrice: 2.5,
        volume: 15.2,
        verified: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
      }
    ];
  }

  private getMockProfile(): ProfileData {
    return {
      id: 'profile-1',
      name: 'John Doe',
      username: 'johndoe',
      bio: 'Digital artist and NFT creator',
      avatar: '/placeholder-avatar.jpg',
      banner: '/placeholder-banner.jpg',
      nftCount: 24,
      collectionCount: 3,
      totalSales: 156.8,
      followers: 1250,
      following: 890,
      verified: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    };
  }
}

// Export singleton instance
export const enhancedNFTMarketplaceService = new EnhancedNFTMarketplaceService();

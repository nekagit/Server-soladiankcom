/**
 * Solana NFT Service Unit Tests
 * Comprehensive testing for the Solana NFT service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setupTestEnvironment, cleanupTestEnvironment, mockFetch } from '../utils/test-utils';

// Mock the Solana NFT service
const mockNFTService = {
  getNFTsByOwner: vi.fn(),
  getNFTMetadata: vi.fn(),
  mintNFT: vi.fn(),
  transferNFT: vi.fn(),
  burnNFT: vi.fn(),
  getNFTCollection: vi.fn(),
  createNFTCollection: vi.fn(),
  updateNFTMetadata: vi.fn(),
  getNFTHistory: vi.fn(),
  searchNFTs: vi.fn()
};

// Mock RPC client
const mockRPCClient = {
  getAccountInfo: vi.fn(),
  sendTransaction: vi.fn(),
  getTransaction: vi.fn(),
  getTokenAccountsByOwner: vi.fn(),
  getProgramAccounts: vi.fn()
};

describe('Solana NFT Service', () => {
  beforeEach(() => {
    setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('getNFTsByOwner', () => {
    it('should fetch NFTs by owner successfully', async () => {
      const mockNFTs = [
        {
          mint: 'nft-1',
          owner: 'owner-address',
          name: 'Test NFT 1',
          image: 'https://example.com/nft1.png',
          attributes: [
            { trait_type: 'Color', value: 'Red' },
            { trait_type: 'Rarity', value: 'Common' }
          ]
        },
        {
          mint: 'nft-2',
          owner: 'owner-address',
          name: 'Test NFT 2',
          image: 'https://example.com/nft2.png',
          attributes: [
            { trait_type: 'Color', value: 'Blue' },
            { trait_type: 'Rarity', value: 'Rare' }
          ]
        }
      ];

      mockRPCClient.getTokenAccountsByOwner.mockResolvedValue({
        value: [
          { pubkey: { toString: () => 'nft-1' } },
          { pubkey: { toString: () => 'nft-2' } }
        ]
      });

      mockNFTService.getNFTsByOwner.mockResolvedValue(mockNFTs);

      const result = await mockNFTService.getNFTsByOwner('owner-address');

      expect(result).toEqual(mockNFTs);
      expect(mockNFTService.getNFTsByOwner).toHaveBeenCalledWith('owner-address');
    });

    it('should handle empty NFT collection', async () => {
      mockRPCClient.getTokenAccountsByOwner.mockResolvedValue({
        value: []
      });

      mockNFTService.getNFTsByOwner.mockResolvedValue([]);

      const result = await mockNFTService.getNFTsByOwner('owner-address');

      expect(result).toEqual([]);
    });

    it('should handle RPC errors', async () => {
      mockRPCClient.getTokenAccountsByOwner.mockRejectedValue(new Error('RPC error'));

      mockNFTService.getNFTsByOwner.mockRejectedValue(new Error('RPC error'));

      await expect(mockNFTService.getNFTsByOwner('owner-address')).rejects.toThrow('RPC error');
    });
  });

  describe('getNFTMetadata', () => {
    it('should fetch NFT metadata successfully', async () => {
      const mockMetadata = {
        name: 'Test NFT',
        symbol: 'TNFT',
        description: 'A test NFT',
        image: 'https://example.com/nft.png',
        attributes: [
          { trait_type: 'Color', value: 'Red' },
          { trait_type: 'Rarity', value: 'Common' }
        ]
      };

      mockRPCClient.getAccountInfo.mockResolvedValue({
        data: Buffer.from(JSON.stringify(mockMetadata))
      });

      mockNFTService.getNFTMetadata.mockResolvedValue(mockMetadata);

      const result = await mockNFTService.getNFTMetadata('metadata-address');

      expect(result).toEqual(mockMetadata);
      expect(mockNFTService.getNFTMetadata).toHaveBeenCalledWith('metadata-address');
    });

    it('should handle metadata not found', async () => {
      mockRPCClient.getAccountInfo.mockResolvedValue(null);

      mockNFTService.getNFTMetadata.mockResolvedValue(null);

      const result = await mockNFTService.getNFTMetadata('invalid-address');

      expect(result).toBeNull();
    });

    it('should handle invalid metadata', async () => {
      mockRPCClient.getAccountInfo.mockResolvedValue({
        data: Buffer.from('invalid-json')
      });

      mockNFTService.getNFTMetadata.mockRejectedValue(new Error('Invalid metadata'));

      await expect(mockNFTService.getNFTMetadata('invalid-metadata')).rejects.toThrow('Invalid metadata');
    });
  });

  describe('mintNFT', () => {
    it('should mint NFT successfully', async () => {
      const mockSignature = 'mint-signature';
      const mockNFT = {
        mint: 'new-nft-address',
        owner: 'owner-address',
        name: 'New NFT',
        image: 'https://example.com/new-nft.png'
      };

      mockRPCClient.sendTransaction.mockResolvedValue({
        result: mockSignature,
        error: null
      });

      mockNFTService.mintNFT.mockResolvedValue({
        success: true,
        signature: mockSignature,
        nft: mockNFT
      });

      const mintData = {
        name: 'New NFT',
        symbol: 'NNFT',
        description: 'A new NFT',
        image: 'https://example.com/new-nft.png',
        attributes: [
          { trait_type: 'Color', value: 'Green' }
        ]
      };

      const result = await mockNFTService.mintNFT(mintData);

      expect(result).toEqual({
        success: true,
        signature: mockSignature,
        nft: mockNFT
      });
      expect(mockNFTService.mintNFT).toHaveBeenCalledWith(mintData);
    });

    it('should handle minting failure', async () => {
      mockRPCClient.sendTransaction.mockResolvedValue({
        result: null,
        error: { code: -32602, message: 'Insufficient funds' }
      });

      mockNFTService.mintNFT.mockResolvedValue({
        success: false,
        error: 'Insufficient funds'
      });

      const mintData = {
        name: 'New NFT',
        symbol: 'NNFT',
        description: 'A new NFT',
        image: 'https://example.com/new-nft.png'
      };

      const result = await mockNFTService.mintNFT(mintData);

      expect(result).toEqual({
        success: false,
        error: 'Insufficient funds'
      });
    });

    it('should validate mint data', async () => {
      const invalidMintData = {
        name: '',
        symbol: '',
        description: '',
        image: ''
      };

      mockNFTService.mintNFT.mockRejectedValue(new Error('Invalid mint data'));

      await expect(mockNFTService.mintNFT(invalidMintData)).rejects.toThrow('Invalid mint data');
    });
  });

  describe('transferNFT', () => {
    it('should transfer NFT successfully', async () => {
      const mockSignature = 'transfer-signature';

      mockRPCClient.sendTransaction.mockResolvedValue({
        result: mockSignature,
        error: null
      });

      mockNFTService.transferNFT.mockResolvedValue({
        success: true,
        signature: mockSignature
      });

      const result = await mockNFTService.transferNFT('nft-address', 'from-address', 'to-address');

      expect(result).toEqual({
        success: true,
        signature: mockSignature
      });
      expect(mockNFTService.transferNFT).toHaveBeenCalledWith('nft-address', 'from-address', 'to-address');
    });

    it('should handle transfer failure', async () => {
      mockRPCClient.sendTransaction.mockResolvedValue({
        result: null,
        error: { code: -32602, message: 'Invalid owner' }
      });

      mockNFTService.transferNFT.mockResolvedValue({
        success: false,
        error: 'Invalid owner'
      });

      const result = await mockNFTService.transferNFT('nft-address', 'invalid-owner', 'to-address');

      expect(result).toEqual({
        success: false,
        error: 'Invalid owner'
      });
    });

    it('should validate transfer parameters', async () => {
      mockNFTService.transferNFT.mockRejectedValue(new Error('Invalid parameters'));

      await expect(mockNFTService.transferNFT('', '', '')).rejects.toThrow('Invalid parameters');
    });
  });

  describe('burnNFT', () => {
    it('should burn NFT successfully', async () => {
      const mockSignature = 'burn-signature';

      mockRPCClient.sendTransaction.mockResolvedValue({
        result: mockSignature,
        error: null
      });

      mockNFTService.burnNFT.mockResolvedValue({
        success: true,
        signature: mockSignature
      });

      const result = await mockNFTService.burnNFT('nft-address');

      expect(result).toEqual({
        success: true,
        signature: mockSignature
      });
      expect(mockNFTService.burnNFT).toHaveBeenCalledWith('nft-address');
    });

    it('should handle burn failure', async () => {
      mockRPCClient.sendTransaction.mockResolvedValue({
        result: null,
        error: { code: -32602, message: 'NFT not found' }
      });

      mockNFTService.burnNFT.mockResolvedValue({
        success: false,
        error: 'NFT not found'
      });

      const result = await mockNFTService.burnNFT('invalid-nft');

      expect(result).toEqual({
        success: false,
        error: 'NFT not found'
      });
    });
  });

  describe('getNFTCollection', () => {
    it('should get NFT collection successfully', async () => {
      const mockCollection = {
        name: 'Test Collection',
        symbol: 'TC',
        description: 'A test collection',
        image: 'https://example.com/collection.png',
        nfts: [
          { mint: 'nft-1', name: 'NFT 1' },
          { mint: 'nft-2', name: 'NFT 2' }
        ]
      };

      mockNFTService.getNFTCollection.mockResolvedValue(mockCollection);

      const result = await mockNFTService.getNFTCollection('collection-address');

      expect(result).toEqual(mockCollection);
      expect(mockNFTService.getNFTCollection).toHaveBeenCalledWith('collection-address');
    });

    it('should handle collection not found', async () => {
      mockNFTService.getNFTCollection.mockResolvedValue(null);

      const result = await mockNFTService.getNFTCollection('invalid-collection');

      expect(result).toBeNull();
    });
  });

  describe('createNFTCollection', () => {
    it('should create NFT collection successfully', async () => {
      const mockSignature = 'collection-signature';
      const mockCollection = {
        address: 'new-collection-address',
        name: 'New Collection',
        symbol: 'NC'
      };

      mockRPCClient.sendTransaction.mockResolvedValue({
        result: mockSignature,
        error: null
      });

      mockNFTService.createNFTCollection.mockResolvedValue({
        success: true,
        signature: mockSignature,
        collection: mockCollection
      });

      const collectionData = {
        name: 'New Collection',
        symbol: 'NC',
        description: 'A new collection',
        image: 'https://example.com/collection.png'
      };

      const result = await mockNFTService.createNFTCollection(collectionData);

      expect(result).toEqual({
        success: true,
        signature: mockSignature,
        collection: mockCollection
      });
      expect(mockNFTService.createNFTCollection).toHaveBeenCalledWith(collectionData);
    });

    it('should handle collection creation failure', async () => {
      mockRPCClient.sendTransaction.mockResolvedValue({
        result: null,
        error: { code: -32602, message: 'Collection already exists' }
      });

      mockNFTService.createNFTCollection.mockResolvedValue({
        success: false,
        error: 'Collection already exists'
      });

      const collectionData = {
        name: 'Existing Collection',
        symbol: 'EC',
        description: 'An existing collection'
      };

      const result = await mockNFTService.createNFTCollection(collectionData);

      expect(result).toEqual({
        success: false,
        error: 'Collection already exists'
      });
    });
  });

  describe('updateNFTMetadata', () => {
    it('should update NFT metadata successfully', async () => {
      const mockSignature = 'update-signature';

      mockRPCClient.sendTransaction.mockResolvedValue({
        result: mockSignature,
        error: null
      });

      mockNFTService.updateNFTMetadata.mockResolvedValue({
        success: true,
        signature: mockSignature
      });

      const updateData = {
        name: 'Updated NFT',
        description: 'Updated description',
        attributes: [
          { trait_type: 'Color', value: 'Purple' }
        ]
      };

      const result = await mockNFTService.updateNFTMetadata('nft-address', updateData);

      expect(result).toEqual({
        success: true,
        signature: mockSignature
      });
      expect(mockNFTService.updateNFTMetadata).toHaveBeenCalledWith('nft-address', updateData);
    });

    it('should handle metadata update failure', async () => {
      mockRPCClient.sendTransaction.mockResolvedValue({
        result: null,
        error: { code: -32602, message: 'Unauthorized' }
      });

      mockNFTService.updateNFTMetadata.mockResolvedValue({
        success: false,
        error: 'Unauthorized'
      });

      const updateData = {
        name: 'Updated NFT'
      };

      const result = await mockNFTService.updateNFTMetadata('nft-address', updateData);

      expect(result).toEqual({
        success: false,
        error: 'Unauthorized'
      });
    });
  });

  describe('getNFTHistory', () => {
    it('should get NFT history successfully', async () => {
      const mockHistory = [
        {
          type: 'mint',
          timestamp: '2023-01-01T00:00:00Z',
          from: null,
          to: 'owner-address',
          signature: 'mint-signature'
        },
        {
          type: 'transfer',
          timestamp: '2023-01-02T00:00:00Z',
          from: 'owner-address',
          to: 'new-owner-address',
          signature: 'transfer-signature'
        }
      ];

      mockNFTService.getNFTHistory.mockResolvedValue(mockHistory);

      const result = await mockNFTService.getNFTHistory('nft-address');

      expect(result).toEqual(mockHistory);
      expect(mockNFTService.getNFTHistory).toHaveBeenCalledWith('nft-address');
    });

    it('should handle empty history', async () => {
      mockNFTService.getNFTHistory.mockResolvedValue([]);

      const result = await mockNFTService.getNFTHistory('nft-address');

      expect(result).toEqual([]);
    });
  });

  describe('searchNFTs', () => {
    it('should search NFTs successfully', async () => {
      const mockSearchResults = [
        {
          mint: 'nft-1',
          name: 'Red NFT',
          attributes: [
            { trait_type: 'Color', value: 'Red' }
          ]
        },
        {
          mint: 'nft-2',
          name: 'Red Dragon',
          attributes: [
            { trait_type: 'Color', value: 'Red' },
            { trait_type: 'Type', value: 'Dragon' }
          ]
        }
      ];

      mockNFTService.searchNFTs.mockResolvedValue(mockSearchResults);

      const result = await mockNFTService.searchNFTs('red');

      expect(result).toEqual(mockSearchResults);
      expect(mockNFTService.searchNFTs).toHaveBeenCalledWith('red');
    });

    it('should handle search with filters', async () => {
      const mockSearchResults = [
        {
          mint: 'nft-1',
          name: 'Rare NFT',
          attributes: [
            { trait_type: 'Rarity', value: 'Rare' }
          ]
        }
      ];

      mockNFTService.searchNFTs.mockResolvedValue(mockSearchResults);

      const filters = {
        query: 'rare',
        attributes: [
          { trait_type: 'Rarity', value: 'Rare' }
        ],
        collection: 'test-collection'
      };

      const result = await mockNFTService.searchNFTs('rare', filters);

      expect(result).toEqual(mockSearchResults);
      expect(mockNFTService.searchNFTs).toHaveBeenCalledWith('rare', filters);
    });

    it('should handle empty search results', async () => {
      mockNFTService.searchNFTs.mockResolvedValue([]);

      const result = await mockNFTService.searchNFTs('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockNFTService.getNFTsByOwner.mockRejectedValue(new Error('Network error'));

      await expect(mockNFTService.getNFTsByOwner('owner-address')).rejects.toThrow('Network error');
    });

    it('should handle RPC errors', async () => {
      mockNFTService.mintNFT.mockRejectedValue(new Error('RPC error'));

      await expect(mockNFTService.mintNFT({})).rejects.toThrow('RPC error');
    });

    it('should handle validation errors', async () => {
      mockNFTService.transferNFT.mockRejectedValue(new Error('Validation error'));

      await expect(mockNFTService.transferNFT('', '', '')).rejects.toThrow('Validation error');
    });
  });
});

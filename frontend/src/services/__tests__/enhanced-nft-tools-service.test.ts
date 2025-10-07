import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { EnhancedNFTToolsService, NFTToolsError, IPFSError, BatchOperationError } from '../enhanced-nft-tools-service.ts';

// Mock fetch globally
global.fetch = vi.fn();

// Mock File constructor
global.File = class MockFile {
  name: string;
  size: number;
  type: string;
  
  constructor(name: string, size: number = 1024, type: string = 'image/png') {
    this.name = name;
    this.size = size;
    this.type = type;
  }
} as any;

describe('EnhancedNFTToolsService', () => {
  let service: EnhancedNFTToolsService;
  let mockWallet: any;
  let mockFile: File;

  beforeEach(() => {
    service = new EnhancedNFTToolsService();
    mockWallet = {
      publicKey: new PublicKey('11111111111111111111111111111112'),
      connected: true,
      connect: vi.fn(),
      disconnect: vi.fn(),
      signTransaction: vi.fn(),
      signAllTransactions: vi.fn()
    };
    mockFile = new File(['test'], 'test.png', { type: 'image/png' });
    
    // Reset mocks
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  describe('bulkMint', () => {
    it('should throw error if wallet is not connected', async () => {
      service.setWallet(null);
      
      await expect(service.bulkMint([mockFile], {
        collectionName: 'Test Collection',
        collectionSymbol: 'TEST',
        mintPrice: 0.1,
        maxSupply: 100,
        autoGenerateMetadata: false,
        includeAttributes: false,
        uploadToIPFS: false
      })).rejects.toThrow(NFTToolsError);
    });

    it('should throw error if no files provided', async () => {
      service.setWallet(mockWallet);
      
      await expect(service.bulkMint([], {
        collectionName: 'Test Collection',
        collectionSymbol: 'TEST',
        mintPrice: 0.1,
        maxSupply: 100,
        autoGenerateMetadata: false,
        includeAttributes: false,
        uploadToIPFS: false
      })).rejects.toThrow(NFTToolsError);
    });

    it('should throw error if required fields are missing', async () => {
      service.setWallet(mockWallet);
      
      await expect(service.bulkMint([mockFile], {
        collectionName: '',
        collectionSymbol: 'TEST',
        mintPrice: 0.1,
        maxSupply: 100,
        autoGenerateMetadata: false,
        includeAttributes: false,
        uploadToIPFS: false
      })).rejects.toThrow(NFTToolsError);
    });

    it('should successfully mint NFTs with valid settings', async () => {
      service.setWallet(mockWallet);
      
      const result = await service.bulkMint([mockFile], {
        collectionName: 'Test Collection',
        collectionSymbol: 'TEST',
        mintPrice: 0.1,
        maxSupply: 100,
        autoGenerateMetadata: false,
        includeAttributes: false,
        uploadToIPFS: false
      });

      expect(result).toHaveProperty('count', 1);
      expect(result).toHaveProperty('signatures');
      expect(result.signatures).toHaveLength(1);
      expect(result.signatures[0]).toMatch(/^mock_signature_/);
    });

    it('should create collection for multiple NFTs', async () => {
      service.setWallet(mockWallet);
      
      const result = await service.bulkMint([mockFile, mockFile], {
        collectionName: 'Test Collection',
        collectionSymbol: 'TEST',
        mintPrice: 0.1,
        maxSupply: 100,
        autoGenerateMetadata: false,
        includeAttributes: false,
        uploadToIPFS: false
      });

      expect(result).toHaveProperty('collectionAddress');
      expect(result.collectionAddress).toBeDefined();
    });
  });

  describe('uploadToIPFS', () => {
    it('should successfully upload files to IPFS', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          hash: 'QmTestHash123',
          url: 'https://ipfs.io/ipfs/QmTestHash123'
        })
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await service.uploadToIPFS([mockFile], {
        pinService: 'pinata',
        redundancy: 'standard',
        encryption: 'none'
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('name', 'test.png');
      expect(result[0]).toHaveProperty('hash', 'QmTestHash123');
      expect(result[0]).toHaveProperty('status', 'completed');
      expect(result[0]).toHaveProperty('url', 'https://ipfs.io/ipfs/QmTestHash123');
    });

    it('should throw error if IPFS upload fails', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'Upload failed'
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(service.uploadToIPFS([mockFile], {
        pinService: 'pinata',
        redundancy: 'standard',
        encryption: 'none'
      })).rejects.toThrow(IPFSError);
    });

    it('should handle multiple files', async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          hash: 'QmTestHash123',
          url: 'https://ipfs.io/ipfs/QmTestHash123'
        })
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const files = [mockFile, new File(['test2'], 'test2.png')];
      const result = await service.uploadToIPFS(files, {
        pinService: 'pinata',
        redundancy: 'standard',
        encryption: 'none'
      });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('test.png');
      expect(result[1].name).toBe('test2.png');
    });
  });

  describe('generateMetadata', () => {
    it('should generate enhanced metadata with AI attributes', async () => {
      const metadata = {
        name: 'Test NFT',
        description: 'A test NFT',
        externalUrl: 'https://example.com',
        attributes: []
      };

      const result = await service.generateMetadata(metadata);

      expect(result).toHaveProperty('name', 'Test NFT');
      expect(result).toHaveProperty('description', 'A test NFT');
      expect(result).toHaveProperty('externalUrl', 'https://example.com');
      expect(result.attributes).toHaveLength(3); // AI-generated attributes
      expect(result.attributes[0]).toHaveProperty('trait');
      expect(result.attributes[0]).toHaveProperty('value');
      expect(result.attributes[0]).toHaveProperty('rarity');
    });

    it('should preserve existing attributes', async () => {
      const metadata = {
        name: 'Test NFT',
        description: 'A test NFT',
        attributes: [
          { trait: 'Color', value: 'Blue' }
        ]
      };

      const result = await service.generateMetadata(metadata);

      expect(result.attributes).toHaveLength(4); // 1 existing + 3 AI-generated
      expect(result.attributes[0]).toEqual({ trait: 'Color', value: 'Blue', rarity: expect.any(Number) });
    });

    it('should add standard metadata fields', async () => {
      const metadata = {
        name: 'Test NFT',
        description: 'A test NFT',
        attributes: []
      };

      const result = await service.generateMetadata(metadata);

      expect(result).toHaveProperty('version', '1.0.0');
      expect(result).toHaveProperty('standard', 'metaplex');
      expect(result).toHaveProperty('properties');
    });
  });

  describe('executeBatchOperation', () => {
    beforeEach(() => {
      service.setWallet(mockWallet);
    });

    it('should throw error if wallet is not connected', async () => {
      service.setWallet(null);
      
      await expect(service.executeBatchOperation('transfer', ['nft1'], {
        recipient: 'recipient123'
      })).rejects.toThrow(BatchOperationError);
    });

    it('should throw error if no NFTs selected', async () => {
      await expect(service.executeBatchOperation('transfer', [], {
        recipient: 'recipient123'
      })).rejects.toThrow(BatchOperationError);
    });

    it('should execute transfer operation', async () => {
      const result = await service.executeBatchOperation('transfer', ['nft1', 'nft2'], {
        recipient: 'recipient123'
      });

      expect(result).toHaveProperty('affected', 2);
      expect(result).toHaveProperty('signatures');
      expect(result.signatures).toHaveLength(2);
      expect(result.signatures[0]).toMatch(/^mock_transfer_signature_/);
    });

    it('should execute price update operation', async () => {
      const result = await service.executeBatchOperation('update-price', ['nft1'], {
        price: 1.5
      });

      expect(result).toHaveProperty('affected', 1);
      expect(result.signatures[0]).toMatch(/^mock_price_update_signature_/);
    });

    it('should execute metadata update operation', async () => {
      const result = await service.executeBatchOperation('update-metadata', ['nft1'], {
        metadataUri: 'https://example.com/metadata.json'
      });

      expect(result).toHaveProperty('affected', 1);
      expect(result.signatures[0]).toMatch(/^mock_metadata_update_signature_/);
    });

    it('should execute burn operation', async () => {
      const result = await service.executeBatchOperation('burn', ['nft1'], {
        confirmed: true
      });

      expect(result).toHaveProperty('affected', 1);
      expect(result.signatures[0]).toMatch(/^mock_burn_signature_/);
    });

    it('should throw error for unknown operation', async () => {
      await expect(service.executeBatchOperation('unknown', ['nft1'], {}))
        .rejects.toThrow(BatchOperationError);
    });

    it('should validate transfer settings', async () => {
      await expect(service.executeBatchOperation('transfer', ['nft1'], {}))
        .rejects.toThrow(BatchOperationError);
    });

    it('should validate price update settings', async () => {
      await expect(service.executeBatchOperation('update-price', ['nft1'], {
        price: -1
      })).rejects.toThrow(BatchOperationError);
    });

    it('should validate metadata update settings', async () => {
      await expect(service.executeBatchOperation('update-metadata', ['nft1'], {}))
        .rejects.toThrow(BatchOperationError);
    });

    it('should require confirmation for burn operation', async () => {
      await expect(service.executeBatchOperation('burn', ['nft1'], {
        confirmed: false
      })).rejects.toThrow(BatchOperationError);
    });
  });

  describe('getAnalytics', () => {
    it('should return analytics data from API', async () => {
      const mockAnalytics = {
        totalSales: 1000,
        totalVolume: 2000.5,
        avgPrice: 2.0,
        floorPrice: 1.5,
        salesChart: [10, 20, 30],
        volumeChart: [100, 200, 300]
      };

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockAnalytics)
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await service.getAnalytics({ timeRange: '7d' });

      expect(result).toEqual(mockAnalytics);
      expect(global.fetch).toHaveBeenCalledWith('/api/analytics/nft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ timeRange: '7d' })
      });
    });

    it('should return mock data if API fails', async () => {
      const mockResponse = {
        ok: false,
        statusText: 'API Error'
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await service.getAnalytics({ timeRange: '7d' });

      expect(result).toHaveProperty('totalSales');
      expect(result).toHaveProperty('totalVolume');
      expect(result).toHaveProperty('avgPrice');
      expect(result).toHaveProperty('floorPrice');
      expect(result).toHaveProperty('salesChart');
      expect(result).toHaveProperty('volumeChart');
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      const result = await service.getAnalytics({ timeRange: '7d' });

      expect(result).toHaveProperty('totalSales');
      expect(result).toHaveProperty('totalVolume');
    });
  });

  describe('error handling', () => {
    it('should create NFTToolsError with proper properties', () => {
      const error = new NFTToolsError('Test error', 'TEST_CODE');
      
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('NFTToolsError');
    });

    it('should create IPFSError with proper properties', () => {
      const error = new IPFSError('IPFS error', 'IPFS_CODE');
      
      expect(error.message).toBe('IPFS error');
      expect(error.code).toBe('IPFS_CODE');
      expect(error.name).toBe('IPFSError');
    });

    it('should create BatchOperationError with proper properties', () => {
      const error = new BatchOperationError('Batch error', 'BATCH_CODE');
      
      expect(error.message).toBe('Batch error');
      expect(error.code).toBe('BATCH_CODE');
      expect(error.name).toBe('BatchOperationError');
    });
  });

  describe('utility methods', () => {
    it('should set wallet correctly', () => {
      service.setWallet(mockWallet);
      expect(service['wallet']).toBe(mockWallet);
    });

    it('should handle null wallet', () => {
      service.setWallet(null);
      expect(service['wallet']).toBeNull();
    });
  });
});

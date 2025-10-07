import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SolanaNFTService } from '../solana/solana-nft'

// Mock the Solana RPC client
const mockRPCClient = {
  getTokenAccountsByOwner: vi.fn(),
  getAccountInfo: vi.fn()
}

describe('SolanaNFTService', () => {
  let nftService: SolanaNFTService

  beforeEach(() => {
    vi.clearAllMocks()
    nftService = new SolanaNFTService(mockRPCClient as any)
  })

  describe('getNFTsByOwner', () => {
    it('should fetch NFTs by owner successfully', async () => {
      const mockNFTs = [
        {
          mint: 'nft-mint-1',
          amount: 1,
          tokenAccount: 'token-account-1',
          metadata: {
            name: 'Test NFT 1',
            symbol: 'TNFT1',
            image: 'https://example.com/nft1.png'
          }
        },
        {
          mint: 'nft-mint-2',
          amount: 1,
          tokenAccount: 'token-account-2',
          metadata: {
            name: 'Test NFT 2',
            symbol: 'TNFT2',
            image: 'https://example.com/nft2.png'
          }
        }
      ]

      mockRPCClient.getTokenAccountsByOwner.mockResolvedValue({
        result: {
          value: mockNFTs.map(nft => ({
            pubkey: nft.tokenAccount,
            account: {
              data: {
                parsed: {
                  info: {
                    mint: nft.mint,
                    tokenAmount: { amount: nft.amount.toString() }
                  }
                }
              }
            }
          }))
        },
        error: null
      })

      const result = await nftService.getNFTsByOwner('owner-address')

      expect(result).toHaveLength(2)
      expect(mockRPCClient.getTokenAccountsByOwner).toHaveBeenCalledWith('owner-address')
    })

    it('should handle empty NFT collection', async () => {
      mockRPCClient.getTokenAccountsByOwner.mockResolvedValue({
        result: { value: [] },
        error: null
      })

      const result = await nftService.getNFTsByOwner('owner-address')

      expect(result).toEqual([])
    })
  })

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
      }

      mockRPCClient.getAccountInfo.mockResolvedValue({
        result: {
          data: [Buffer.from(JSON.stringify(mockMetadata)).toString('base64'), 'base64']
        },
        error: null
      })

      const result = await nftService.getNFTMetadata('metadata-address')

      expect(result).toEqual(mockMetadata)
      expect(mockRPCClient.getAccountInfo).toHaveBeenCalledWith('metadata-address')
    })

    it('should handle metadata not found', async () => {
      mockRPCClient.getAccountInfo.mockResolvedValue({
        result: null,
        error: { code: -32602, message: 'Account not found' }
      })

      await expect(nftService.getNFTMetadata('invalid-address'))
        .rejects.toThrow('Account not found')
    })
  })

  describe('mintNFT', () => {
    it('should mint NFT successfully', async () => {
      const mintData = {
        name: 'New NFT',
        symbol: 'NNFT',
        description: 'A newly minted NFT',
        image: 'https://example.com/new-nft.png'
      }

      const mockSignature = 'mint-signature'
      mockRPCClient.sendTransaction.mockResolvedValue({
        result: mockSignature,
        error: null
      })

      const result = await nftService.mintNFT('owner-address', mintData)

      expect(result).toEqual(mockSignature)
    })

    it('should handle minting failure', async () => {
      const mintData = {
        name: 'New NFT',
        symbol: 'NNFT',
        description: 'A newly minted NFT',
        image: 'https://example.com/new-nft.png'
      }

      mockRPCClient.sendTransaction.mockResolvedValue({
        result: null,
        error: { code: -32602, message: 'Insufficient funds' }
      })

      await expect(nftService.mintNFT('owner-address', mintData))
        .rejects.toThrow('Insufficient funds')
    })
  })

  describe('transferNFT', () => {
    it('should transfer NFT successfully', async () => {
      const mockSignature = 'transfer-signature'
      mockRPCClient.sendTransaction.mockResolvedValue({
        result: mockSignature,
        error: null
      })

      const result = await nftService.transferNFT(
        'from-address',
        'to-address',
        'nft-mint',
        'token-account'
      )

      expect(result).toEqual(mockSignature)
    })

    it('should handle transfer failure', async () => {
      mockRPCClient.sendTransaction.mockResolvedValue({
        result: null,
        error: { code: -32602, message: 'Invalid owner' }
      })

      await expect(nftService.transferNFT(
        'invalid-owner',
        'to-address',
        'nft-mint',
        'token-account'
      )).rejects.toThrow('Invalid owner')
    })
  })
})



import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SolanaWalletService } from '../solana-wallet'

// Mock the Solana wallet
const mockWallet = {
  isPhantom: true,
  connect: vi.fn(),
  disconnect: vi.fn(),
  signTransaction: vi.fn(),
  signAllTransactions: vi.fn(),
  request: vi.fn()
}

describe('SolanaWalletService', () => {
  let walletService: SolanaWalletService

  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-ignore
    window.solana = mockWallet
    walletService = new SolanaWalletService()
  })

  describe('connectWallet', () => {
    it('should connect to Phantom wallet successfully', async () => {
      const mockResponse = {
        publicKey: {
          toString: () => 'mock-wallet-address'
        }
      }
      mockWallet.connect.mockResolvedValue(mockResponse)

      const result = await walletService.connectWallet()

      expect(result).toEqual({
        success: true,
        address: 'mock-wallet-address',
        wallet: 'phantom'
      })
      expect(mockWallet.connect).toHaveBeenCalledTimes(1)
    })

    it('should handle wallet connection failure', async () => {
      mockWallet.connect.mockRejectedValue(new Error('Connection failed'))

      const result = await walletService.connectWallet()

      expect(result).toEqual({
        success: false,
        error: 'Connection failed'
      })
    })

    it('should handle missing wallet', async () => {
      // @ts-ignore
      window.solana = undefined

      const result = await walletService.connectWallet()

      expect(result).toEqual({
        success: false,
        error: 'Phantom wallet not found'
      })
    })
  })

  describe('disconnectWallet', () => {
    it('should disconnect wallet successfully', async () => {
      mockWallet.disconnect.mockResolvedValue(undefined)

      const result = await walletService.disconnectWallet()

      expect(result).toEqual({
        success: true
      })
      expect(mockWallet.disconnect).toHaveBeenCalledTimes(1)
    })

    it('should handle disconnect failure', async () => {
      mockWallet.disconnect.mockRejectedValue(new Error('Disconnect failed'))

      const result = await walletService.disconnectWallet()

      expect(result).toEqual({
        success: false,
        error: 'Disconnect failed'
      })
    })
  })

  describe('getWalletAddress', () => {
    it('should return wallet address when connected', () => {
      walletService.setWalletAddress('mock-address')

      const address = walletService.getWalletAddress()

      expect(address).toBe('mock-address')
    })

    it('should return null when not connected', () => {
      const address = walletService.getWalletAddress()

      expect(address).toBeNull()
    })
  })

  describe('isConnected', () => {
    it('should return true when wallet is connected', () => {
      walletService.setWalletAddress('mock-address')

      const connected = walletService.isConnected()

      expect(connected).toBe(true)
    })

    it('should return false when wallet is not connected', () => {
      const connected = walletService.isConnected()

      expect(connected).toBe(false)
    })
  })
})


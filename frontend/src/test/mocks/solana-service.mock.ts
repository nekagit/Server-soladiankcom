/**
 * Solana Service Mock
 * Mock implementation for testing
 */

export const mockSolanaService = {
  connectWallet: vi.fn(),
  disconnectWallet: vi.fn(),
  getWalletAddress: vi.fn(),
  isConnected: vi.fn(),
  createTransferTransaction: vi.fn(),
  transferToken: vi.fn(),
  getTokenBalance: vi.fn(),
  getNFTsByOwner: vi.fn(),
  getNFTMetadata: vi.fn(),
  mintNFT: vi.fn(),
  transferNFT: vi.fn(),
  getTransaction: vi.fn(),
  sendTransaction: vi.fn(),
  getTransactionStatus: vi.fn(),
  waitForConfirmation: vi.fn()
};

export default mockSolanaService;

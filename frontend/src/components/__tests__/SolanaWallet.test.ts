/**
 * SolanaWallet Component Tests
 * Comprehensive testing for the SolanaWallet component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import SolanaWallet from '../solana/SolanaWallet.astro';

// Mock the Solana service
vi.mock('../../services/solana', () => ({
  solanaService: {
    getHealthStatus: vi.fn(() => Promise.resolve({ data: { status: 'healthy' } })),
    getWalletInfo: vi.fn(),
    getWalletBalance: vi.fn(),
    createTransferTransaction: vi.fn(),
    verifyTransaction: vi.fn(),
  }
}));

// Mock the wallet connection service
vi.mock('../../services/wallet-connection', () => ({
  walletService: {
    isConnected: vi.fn(() => false),
    connect: vi.fn(),
    disconnect: vi.fn(),
    getWalletInfo: vi.fn(() => null),
    getSupportedWallets: vi.fn(() => ['phantom', 'solflare', 'backpack']),
  }
}));

// Mock window.solana
Object.defineProperty(window, 'solana', {
  value: {
    isPhantom: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    signTransaction: vi.fn(),
    signAllTransactions: vi.fn(),
    request: vi.fn(),
  },
  writable: true
});

describe('SolanaWallet Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders wallet connection interface when not connected', () => {
      render(SolanaWallet);
      
      expect(screen.getByTestId('wallet-connect-section')).toBeInTheDocument();
      expect(screen.getByText('Connect Your Solana Wallet')).toBeInTheDocument();
      expect(screen.getByText('Connect to start trading on Soladia')).toBeInTheDocument();
    });

    it('renders supported wallet options', () => {
      render(SolanaWallet);
      
      const supportedWallets = ['Phantom', 'Solflare', 'Backpack'];
      supportedWallets.forEach(wallet => {
        expect(screen.getByText(wallet)).toBeInTheDocument();
      });
    });

    it('renders network status indicator', () => {
      render(SolanaWallet);
      
      expect(screen.getByTestId('network-status')).toBeInTheDocument();
      expect(screen.getByText('Solana Network')).toBeInTheDocument();
    });

    it('renders wallet info when connected', () => {
      vi.mocked(require('../../services/wallet-connection').walletService.isConnected).mockReturnValue(true);
      vi.mocked(require('../../services/wallet-connection').walletService.getWalletInfo).mockReturnValue({
        address: 'test-wallet-address',
        balance: 1.5,
        network: 'mainnet',
        walletType: 'phantom'
      });

      render(SolanaWallet);
      
      expect(screen.getByTestId('wallet-info')).toBeInTheDocument();
      expect(screen.getByText('test-wallet-address')).toBeInTheDocument();
      expect(screen.getByText('1.5 SOL')).toBeInTheDocument();
    });
  });

  describe('Wallet Connection', () => {
    it('connects to Phantom wallet successfully', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-wallet-address' }
      });
      vi.mocked(require('../../services/wallet-connection').walletService.connect).mockImplementation(mockConnect);
      
      render(SolanaWallet);
      
      const phantomBtn = screen.getByTestId('phantom-connect');
      fireEvent.click(phantomBtn);
      
      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledWith('phantom');
        expect(screen.getByTestId('wallet-info')).toBeInTheDocument();
      });
    });

    it('connects to Solflare wallet successfully', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-wallet-address' }
      });
      vi.mocked(require('../../services/wallet-connection').walletService.connect).mockImplementation(mockConnect);
      
      render(SolanaWallet);
      
      const solflareBtn = screen.getByTestId('solflare-connect');
      fireEvent.click(solflareBtn);
      
      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledWith('solflare');
      });
    });

    it('connects to Backpack wallet successfully', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-wallet-address' }
      });
      vi.mocked(require('../../services/wallet-connection').walletService.connect).mockImplementation(mockConnect);
      
      render(SolanaWallet);
      
      const backpackBtn = screen.getByTestId('backpack-connect');
      fireEvent.click(backpackBtn);
      
      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledWith('backpack');
      });
    });

    it('handles wallet connection errors', async () => {
      const mockConnect = vi.fn().mockRejectedValue(new Error('User rejected connection'));
      vi.mocked(require('../../services/wallet-connection').walletService.connect).mockImplementation(mockConnect);
      
      render(SolanaWallet);
      
      const phantomBtn = screen.getByTestId('phantom-connect');
      fireEvent.click(phantomBtn);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText('Failed to connect wallet')).toBeInTheDocument();
      });
    });

    it('shows loading state during connection', async () => {
      const mockConnect = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
      vi.mocked(require('../../services/wallet-connection').walletService.connect).mockImplementation(mockConnect);
      
      render(SolanaWallet);
      
      const phantomBtn = screen.getByTestId('phantom-connect');
      fireEvent.click(phantomBtn);
      
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Wallet Disconnection', () => {
    it('disconnects wallet successfully', async () => {
      vi.mocked(require('../../services/wallet-connection').walletService.isConnected).mockReturnValue(true);
      const mockDisconnect = vi.fn().mockResolvedValue(undefined);
      vi.mocked(require('../../services/wallet-connection').walletService.disconnect).mockImplementation(mockDisconnect);
      
      render(SolanaWallet);
      
      const disconnectBtn = screen.getByTestId('disconnect-wallet');
      fireEvent.click(disconnectBtn);
      
      await waitFor(() => {
        expect(mockDisconnect).toHaveBeenCalled();
        expect(screen.getByTestId('wallet-connect-section')).toBeInTheDocument();
      });
    });

    it('handles disconnection errors', async () => {
      vi.mocked(require('../../services/wallet-connection').walletService.isConnected).mockReturnValue(true);
      const mockDisconnect = vi.fn().mockRejectedValue(new Error('Disconnection failed'));
      vi.mocked(require('../../services/wallet-connection').walletService.disconnect).mockImplementation(mockDisconnect);
      
      render(SolanaWallet);
      
      const disconnectBtn = screen.getByTestId('disconnect-wallet');
      fireEvent.click(disconnectBtn);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
      });
    });
  });

  describe('Wallet Information Display', () => {
    it('displays wallet address correctly', () => {
      vi.mocked(require('../../services/wallet-connection').walletService.isConnected).mockReturnValue(true);
      vi.mocked(require('../../services/wallet-connection').walletService.getWalletInfo).mockReturnValue({
        address: 'test-wallet-address-123456789',
        balance: 1.5,
        network: 'mainnet'
      });

      render(SolanaWallet);
      
      expect(screen.getByText('test-wallet-address-123456789')).toBeInTheDocument();
    });

    it('displays wallet balance correctly', () => {
      vi.mocked(require('../../services/wallet-connection').walletService.isConnected).mockReturnValue(true);
      vi.mocked(require('../../services/wallet-connection').walletService.getWalletInfo).mockReturnValue({
        address: 'test-wallet-address',
        balance: 2.5,
        network: 'mainnet'
      });

      render(SolanaWallet);
      
      expect(screen.getByText('2.5 SOL')).toBeInTheDocument();
    });

    it('displays network information', () => {
      vi.mocked(require('../../services/wallet-connection').walletService.isConnected).mockReturnValue(true);
      vi.mocked(require('../../services/wallet-connection').walletService.getWalletInfo).mockReturnValue({
        address: 'test-wallet-address',
        balance: 1.5,
        network: 'mainnet'
      });

      render(SolanaWallet);
      
      expect(screen.getByText('Mainnet')).toBeInTheDocument();
    });

    it('formats wallet address for display', () => {
      vi.mocked(require('../../services/wallet-connection').walletService.isConnected).mockReturnValue(true);
      vi.mocked(require('../../services/wallet-connection').walletService.getWalletInfo).mockReturnValue({
        address: 'test-wallet-address-very-long-123456789',
        balance: 1.5,
        network: 'mainnet'
      });

      render(SolanaWallet);
      
      // Should show truncated address
      expect(screen.getByText('test-wallet-address-very-long-123456789')).toBeInTheDocument();
    });
  });

  describe('Network Status', () => {
    it('displays healthy network status', async () => {
      vi.mocked(require('../../services/solana').solanaService.getHealthStatus).mockResolvedValue({
        data: { status: 'healthy', network: 'mainnet' }
      });

      render(SolanaWallet);
      
      await waitFor(() => {
        expect(screen.getByTestId('network-status-indicator')).toHaveClass('status-online');
        expect(screen.getByText('Online')).toBeInTheDocument();
      });
    });

    it('displays unhealthy network status', async () => {
      vi.mocked(require('../../services/solana').solanaService.getHealthStatus).mockResolvedValue({
        data: { status: 'unhealthy', network: 'mainnet' }
      });

      render(SolanaWallet);
      
      await waitFor(() => {
        expect(screen.getByTestId('network-status-indicator')).toHaveClass('status-offline');
        expect(screen.getByText('Offline')).toBeInTheDocument();
      });
    });

    it('handles network status errors', async () => {
      vi.mocked(require('../../services/solana').solanaService.getHealthStatus).mockRejectedValue(new Error('Network error'));

      render(SolanaWallet);
      
      await waitFor(() => {
        expect(screen.getByTestId('network-status-indicator')).toHaveClass('status-error');
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
    });
  });

  describe('Transaction Handling', () => {
    it('creates transfer transaction successfully', async () => {
      vi.mocked(require('../../services/wallet-connection').walletService.isConnected).mockReturnValue(true);
      const mockCreateTransaction = vi.fn().mockResolvedValue({
        data: { signature: 'test-signature', transaction: 'test-transaction' }
      });
      vi.mocked(require('../../services/solana').solanaService.createTransferTransaction).mockImplementation(mockCreateTransaction);

      render(SolanaWallet);
      
      const transferBtn = screen.getByTestId('transfer-funds');
      fireEvent.click(transferBtn);
      
      await waitFor(() => {
        expect(mockCreateTransaction).toHaveBeenCalled();
        expect(screen.getByText('Transaction created successfully')).toBeInTheDocument();
      });
    });

    it('verifies transaction successfully', async () => {
      vi.mocked(require('../../services/wallet-connection').walletService.isConnected).mockReturnValue(true);
      const mockVerifyTransaction = vi.fn().mockResolvedValue({
        data: { confirmed: true, success: true }
      });
      vi.mocked(require('../../services/solana').solanaService.verifyTransaction).mockImplementation(mockVerifyTransaction);

      render(SolanaWallet);
      
      const verifyBtn = screen.getByTestId('verify-transaction');
      fireEvent.click(verifyBtn);
      
      await waitFor(() => {
        expect(mockVerifyTransaction).toHaveBeenCalled();
        expect(screen.getByText('Transaction verified')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for wallet buttons', () => {
      render(SolanaWallet);
      
      expect(screen.getByTestId('phantom-connect')).toHaveAttribute('aria-label', 'Connect Phantom wallet');
      expect(screen.getByTestId('solflare-connect')).toHaveAttribute('aria-label', 'Connect Solflare wallet');
      expect(screen.getByTestId('backpack-connect')).toHaveAttribute('aria-label', 'Connect Backpack wallet');
    });

    it('has proper ARIA labels for wallet info', () => {
      vi.mocked(require('../../services/wallet-connection').walletService.isConnected).mockReturnValue(true);
      vi.mocked(require('../../services/wallet-connection').walletService.getWalletInfo).mockReturnValue({
        address: 'test-wallet-address',
        balance: 1.5,
        network: 'mainnet'
      });

      render(SolanaWallet);
      
      expect(screen.getByTestId('wallet-address')).toHaveAttribute('aria-label', 'Wallet address');
      expect(screen.getByTestId('wallet-balance')).toHaveAttribute('aria-label', 'Wallet balance');
    });

    it('supports keyboard navigation', () => {
      render(SolanaWallet);
      
      const phantomBtn = screen.getByTestId('phantom-connect');
      phantomBtn.focus();
      
      expect(document.activeElement).toBe(phantomBtn);
    });

    it('announces wallet connection status to screen readers', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-wallet-address' }
      });
      vi.mocked(require('../../services/wallet-connection').walletService.connect).mockImplementation(mockConnect);
      
      render(SolanaWallet);
      
      const phantomBtn = screen.getByTestId('phantom-connect');
      fireEvent.click(phantomBtn);
      
      await waitFor(() => {
        expect(screen.getByTestId('wallet-status-announcement')).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles wallet not found error', async () => {
      // Mock wallet not found
      Object.defineProperty(window, 'solana', {
        value: undefined,
        writable: true
      });

      render(SolanaWallet);
      
      const phantomBtn = screen.getByTestId('phantom-connect');
      fireEvent.click(phantomBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Wallet not found. Please install a Solana wallet.')).toBeInTheDocument();
      });
    });

    it('handles network errors gracefully', async () => {
      vi.mocked(require('../../services/solana').solanaService.getHealthStatus).mockRejectedValue(new Error('Network error'));

      render(SolanaWallet);
      
      await waitFor(() => {
        expect(screen.getByTestId('network-error')).toBeInTheDocument();
      });
    });

    it('shows retry button for failed operations', async () => {
      const mockConnect = vi.fn().mockRejectedValue(new Error('Connection failed'));
      vi.mocked(require('../../services/wallet-connection').walletService.connect).mockImplementation(mockConnect);
      
      render(SolanaWallet);
      
      const phantomBtn = screen.getByTestId('phantom-connect');
      fireEvent.click(phantomBtn);
      
      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('renders without performance issues', () => {
      const startTime = performance.now();
      render(SolanaWallet);
      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('handles rapid wallet connection attempts gracefully', async () => {
      const mockConnect = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      vi.mocked(require('../../services/wallet-connection').walletService.connect).mockImplementation(mockConnect);
      
      render(SolanaWallet);
      
      const phantomBtn = screen.getByTestId('phantom-connect');
      
      // Click multiple times rapidly
      fireEvent.click(phantomBtn);
      fireEvent.click(phantomBtn);
      fireEvent.click(phantomBtn);
      
      // Should only call connect once
      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalledTimes(1);
      });
    });
  });
});

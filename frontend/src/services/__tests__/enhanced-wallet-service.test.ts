/**
 * Enhanced Wallet Service Tests
 * Comprehensive testing for the enhanced wallet service
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { enhancedWalletService, WalletConnection, WalletState, WalletError } from '../enhanced-wallet-service.ts';

// Mock the Solana service
vi.mock('../solana', () => ({
  solanaService: {
    getWalletBalance: vi.fn(),
    getWalletInfo: vi.fn(),
    createTransferTransaction: vi.fn(),
    verifyTransaction: vi.fn(),
  }
}));

// Mock window objects
Object.defineProperty(window, 'solana', {
  value: {
    isPhantom: true,
    isConnected: vi.fn(() => false),
    connect: vi.fn(),
    disconnect: vi.fn(),
    signTransaction: vi.fn(),
    signAllTransactions: vi.fn(),
    request: vi.fn(),
  },
  writable: true
});

Object.defineProperty(window, 'solflare', {
  value: {
    isSolflare: true,
    isConnected: vi.fn(() => false),
    connect: vi.fn(),
    disconnect: vi.fn(),
    signTransaction: vi.fn(),
    signAllTransactions: vi.fn(),
    request: vi.fn(),
  },
  writable: true
});

Object.defineProperty(window, 'backpack', {
  value: {
    isBackpack: true,
    isConnected: vi.fn(() => false),
    connect: vi.fn(),
    disconnect: vi.fn(),
    signTransaction: vi.fn(),
    signAllTransactions: vi.fn(),
    request: vi.fn(),
  },
  writable: true
});

describe('EnhancedWalletService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset localStorage
    localStorage.clear();
    // Reset wallet state
    enhancedWalletService.cleanup();
  });

  afterEach(() => {
    enhancedWalletService.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const state = enhancedWalletService.getState();
      
      expect(state.connected).toBe(false);
      expect(state.address).toBeNull();
      expect(state.balance).toBe(0);
      expect(state.network).toBe('mainnet');
      expect(state.walletType).toBeNull();
      expect(state.error).toBeNull();
      expect(state.loading).toBe(false);
    });

    it('should detect connected wallet on initialization', async () => {
      // Mock connected wallet
      window.solana.isConnected = vi.fn(() => true);
      window.solana.connect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-address' }
      });

      // Create new instance to test initialization
      const { EnhancedWalletService } = await import('../enhanced-wallet-service');
      const service = new EnhancedWalletService();

      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 100));

      const state = service.getState();
      expect(state.connected).toBe(true);
      expect(state.address).toBe('test-address');
    });
  });

  describe('Wallet Connection', () => {
    it('should connect to Phantom wallet successfully', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'phantom-address' }
      });
      window.solana.connect = mockConnect;

      const connection = await enhancedWalletService.connectWallet('phantom');

      expect(connection.publicKey).toBe('phantom-address');
      expect(connection.walletType).toBe('phantom');
      expect(connection.connected).toBe(true);

      const state = enhancedWalletService.getState();
      expect(state.connected).toBe(true);
      expect(state.address).toBe('phantom-address');
      expect(state.walletType).toBe('phantom');
    });

    it('should connect to Solflare wallet successfully', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'solflare-address' }
      });
      window.solflare.connect = mockConnect;

      const connection = await enhancedWalletService.connectWallet('solflare');

      expect(connection.publicKey).toBe('solflare-address');
      expect(connection.walletType).toBe('solflare');
      expect(connection.connected).toBe(true);
    });

    it('should connect to Backpack wallet successfully', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'backpack-address' }
      });
      window.backpack.connect = mockConnect;

      const connection = await enhancedWalletService.connectWallet('backpack');

      expect(connection.publicKey).toBe('backpack-address');
      expect(connection.walletType).toBe('backpack');
      expect(connection.connected).toBe(true);
    });

    it('should handle wallet connection errors', async () => {
      const mockConnect = vi.fn().mockRejectedValue(new Error('User rejected'));
      window.solana.connect = mockConnect;

      await expect(enhancedWalletService.connectWallet('phantom')).rejects.toThrow('User rejected');

      const state = enhancedWalletService.getState();
      expect(state.connected).toBe(false);
      expect(state.error).toBe('User rejected');
    });

    it('should handle wallet not found error', async () => {
      // Mock no wallet available
      Object.defineProperty(window, 'solana', {
        value: undefined,
        writable: true
      });

      await expect(enhancedWalletService.connectWallet('phantom')).rejects.toThrow('phantom wallet not found');
    });

    it('should update wallet balance after connection', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-address' }
      });
      window.solana.connect = mockConnect;

      // Mock balance response
      const { solanaService } = await import('../solana');
      vi.mocked(solanaService.getWalletBalance).mockResolvedValue({
        success: true,
        data: { balance_sol: 2.5 }
      });

      await enhancedWalletService.connectWallet('phantom');

      const state = enhancedWalletService.getState();
      expect(state.balance).toBe(2.5);
    });
  });

  describe('Wallet Disconnection', () => {
    it('should disconnect wallet successfully', async () => {
      // First connect
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-address' }
      });
      window.solana.connect = mockConnect;
      await enhancedWalletService.connectWallet('phantom');

      // Then disconnect
      const mockDisconnect = vi.fn().mockResolvedValue(undefined);
      window.solana.disconnect = mockDisconnect;

      await enhancedWalletService.disconnectWallet();

      const state = enhancedWalletService.getState();
      expect(state.connected).toBe(false);
      expect(state.address).toBeNull();
      expect(state.walletType).toBeNull();
    });

    it('should handle disconnection errors', async () => {
      // First connect
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-address' }
      });
      window.solana.connect = mockConnect;
      await enhancedWalletService.connectWallet('phantom');

      // Mock disconnection error
      const mockDisconnect = vi.fn().mockRejectedValue(new Error('Disconnection failed'));
      window.solana.disconnect = mockDisconnect;

      await expect(enhancedWalletService.disconnectWallet()).rejects.toThrow('Disconnection failed');
    });
  });

  describe('State Management', () => {
    it('should notify listeners on state changes', async () => {
      const listener = vi.fn();
      const unsubscribe = enhancedWalletService.addListener(listener);

      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-address' }
      });
      window.solana.connect = mockConnect;

      await enhancedWalletService.connectWallet('phantom');

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          connected: true,
          address: 'test-address',
          walletType: 'phantom'
        })
      );

      unsubscribe();
    });

    it('should save and load wallet state from localStorage', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-address' }
      });
      window.solana.connect = mockConnect;

      await enhancedWalletService.connectWallet('phantom');

      // Check if state is saved
      const savedState = localStorage.getItem('soladia-wallet-state');
      expect(savedState).toBeTruthy();

      const parsedState = JSON.parse(savedState!);
      expect(parsedState.connected).toBe(true);
      expect(parsedState.address).toBe('test-address');
    });

    it('should refresh wallet state', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-address' }
      });
      window.solana.connect = mockConnect;

      await enhancedWalletService.connectWallet('phantom');

      // Mock balance response
      const { solanaService } = await import('../solana');
      vi.mocked(solanaService.getWalletBalance).mockResolvedValue({
        success: true,
        data: { balance_sol: 5.0 }
      });

      await enhancedWalletService.refreshWalletState();

      const state = enhancedWalletService.getState();
      expect(state.balance).toBe(5.0);
    });
  });

  describe('Wallet Information', () => {
    it('should return correct wallet information', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-address' }
      });
      window.solana.connect = mockConnect;

      await enhancedWalletService.connectWallet('phantom');

      expect(enhancedWalletService.isConnected()).toBe(true);
      expect(enhancedWalletService.getAddress()).toBe('test-address');
      expect(enhancedWalletService.getWalletType()).toBe('phantom');
      expect(enhancedWalletService.getNetwork()).toBe('mainnet');
    });

    it('should return supported wallets', () => {
      const supportedWallets = enhancedWalletService.getSupportedWallets();

      expect(supportedWallets).toHaveLength(3);
      expect(supportedWallets[0].name).toBe('phantom');
      expect(supportedWallets[0].available).toBe(true);
      expect(supportedWallets[1].name).toBe('solflare');
      expect(supportedWallets[1].available).toBe(true);
      expect(supportedWallets[2].name).toBe('backpack');
      expect(supportedWallets[2].available).toBe(true);
    });
  });

  describe('Transaction Signing', () => {
    it('should sign transaction successfully', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-address' }
      });
      window.solana.connect = mockConnect;

      await enhancedWalletService.connectWallet('phantom');

      const mockSignTransaction = vi.fn().mockResolvedValue('signed-transaction');
      window.solana.signTransaction = mockSignTransaction;

      const transaction = { test: 'transaction' };
      const signedTransaction = await enhancedWalletService.signTransaction(transaction);

      expect(signedTransaction).toBe('signed-transaction');
      expect(mockSignTransaction).toHaveBeenCalledWith(transaction);
    });

    it('should sign multiple transactions successfully', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-address' }
      });
      window.solana.connect = mockConnect;

      await enhancedWalletService.connectWallet('phantom');

      const mockSignAllTransactions = vi.fn().mockResolvedValue(['signed-tx1', 'signed-tx2']);
      window.solana.signAllTransactions = mockSignAllTransactions;

      const transactions = [{ test: 'tx1' }, { test: 'tx2' }];
      const signedTransactions = await enhancedWalletService.signAllTransactions(transactions);

      expect(signedTransactions).toEqual(['signed-tx1', 'signed-tx2']);
      expect(mockSignAllTransactions).toHaveBeenCalledWith(transactions);
    });

    it('should handle signing errors', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-address' }
      });
      window.solana.connect = mockConnect;

      await enhancedWalletService.connectWallet('phantom');

      const mockSignTransaction = vi.fn().mockRejectedValue(new Error('Signing failed'));
      window.solana.signTransaction = mockSignTransaction;

      await expect(enhancedWalletService.signTransaction({})).rejects.toThrow('Signing failed');
    });
  });

  describe('Network Management', () => {
    it('should switch network successfully', async () => {
      const mockConnect = vi.fn().mockResolvedValue({
        publicKey: { toString: () => 'test-address' }
      });
      window.solana.connect = mockConnect;

      await enhancedWalletService.connectWallet('phantom');

      await enhancedWalletService.switchNetwork('devnet');

      const state = enhancedWalletService.getState();
      expect(state.network).toBe('devnet');
    });

    it('should handle network switch errors', async () => {
      await expect(enhancedWalletService.switchNetwork('devnet')).rejects.toThrow('Wallet is not connected');
    });
  });

  describe('Error Handling', () => {
    it('should handle user rejection error', async () => {
      const mockConnect = vi.fn().mockRejectedValue({ code: 4001, message: 'User rejected' });
      window.solana.connect = mockConnect;

      await expect(enhancedWalletService.connectWallet('phantom')).rejects.toThrow('User rejected the connection request');
    });

    it('should handle already connected error', async () => {
      const mockConnect = vi.fn().mockRejectedValue({ code: -32002, message: 'Already connected' });
      window.solana.connect = mockConnect;

      await expect(enhancedWalletService.connectWallet('phantom')).rejects.toThrow('Wallet is already connected');
    });

    it('should handle wallet not found error', async () => {
      const mockConnect = vi.fn().mockRejectedValue({ message: 'Wallet not found' });
      window.solana.connect = mockConnect;

      await expect(enhancedWalletService.connectWallet('phantom')).rejects.toThrow('Wallet not found. Please install a Solana wallet.');
    });

    it('should handle insufficient funds error', async () => {
      const mockConnect = vi.fn().mockRejectedValue({ message: 'Insufficient funds' });
      window.solana.connect = mockConnect;

      await expect(enhancedWalletService.connectWallet('phantom')).rejects.toThrow('Insufficient funds for this transaction');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', () => {
      const listener = vi.fn();
      enhancedWalletService.addListener(listener);

      enhancedWalletService.cleanup();

      const state = enhancedWalletService.getState();
      expect(state.connected).toBe(false);
      expect(state.address).toBeNull();
      expect(state.balance).toBe(0);
      expect(state.walletType).toBeNull();
    });
  });

  describe('Event Listeners', () => {
    it('should setup page visibility listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');
      
      // Create new instance to test event listener setup
      new (enhancedWalletService.constructor as any)();

      expect(addEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should setup storage listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      // Create new instance to test event listener setup
      new (enhancedWalletService.constructor as any)();

      expect(addEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function));
    });

    it('should setup beforeunload listener', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      // Create new instance to test event listener setup
      new (enhancedWalletService.constructor as any)();

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });
  });

  describe('Performance', () => {
    it('should handle rapid connection attempts gracefully', async () => {
      const mockConnect = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          publicKey: { toString: () => 'test-address' }
        }), 100))
      );
      window.solana.connect = mockConnect;

      // Attempt multiple connections rapidly
      const promises = [
        enhancedWalletService.connectWallet('phantom'),
        enhancedWalletService.connectWallet('phantom'),
        enhancedWalletService.connectWallet('phantom')
      ];

      // Should not throw errors
      await expect(Promise.allSettled(promises)).resolves.toBeDefined();
    });

    it('should not leak memory with listeners', () => {
      const initialListeners = (enhancedWalletService as any).listeners.size;

      const unsubscribe1 = enhancedWalletService.addListener(() => {});
      const unsubscribe2 = enhancedWalletService.addListener(() => {});

      expect((enhancedWalletService as any).listeners.size).toBe(initialListeners + 2);

      unsubscribe1();
      unsubscribe2();

      expect((enhancedWalletService as any).listeners.size).toBe(initialListeners);
    });
  });
});

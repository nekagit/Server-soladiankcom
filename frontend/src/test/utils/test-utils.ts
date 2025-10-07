/**
 * Test Utilities
 * Common utilities for testing
 */

import { vi } from 'vitest';

// Mock fetch globally
export const mockFetch = vi.fn();

// Mock localStorage
export const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
};

// Mock window object
export const mockWindow = {
  localStorage: mockLocalStorage,
  location: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Mock Solana wallet
export const mockSolanaWallet = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  signTransaction: vi.fn(),
  signAllTransactions: vi.fn(),
  isPhantom: true,
  isConnected: false,
  publicKey: null
};

// Setup test environment
export function setupTestEnvironment() {
  // Mock global fetch
  global.fetch = mockFetch;
  
  // Mock window object
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true
  });
  
  Object.defineProperty(window, 'location', {
    value: mockWindow.location,
    writable: true
  });
  
  // Mock Solana wallet
  Object.defineProperty(window, 'solana', {
    value: mockSolanaWallet,
    writable: true
  });
  
  // Reset all mocks
  vi.clearAllMocks();
}

// Cleanup after tests
export function cleanupTestEnvironment() {
  vi.clearAllMocks();
  mockFetch.mockClear();
  mockLocalStorage.getItem.mockClear();
  mockLocalStorage.setItem.mockClear();
  mockLocalStorage.removeItem.mockClear();
  mockLocalStorage.clear.mockClear();
  mockSolanaWallet.connect.mockClear();
  mockSolanaWallet.disconnect.mockClear();
}

export default {
  mockFetch,
  mockLocalStorage,
  mockWindow,
  mockSolanaWallet,
  setupTestEnvironment,
  cleanupTestEnvironment
};

/**
 * Test Setup Configuration
 * Global test setup and mocks
 */

import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});

// Mock fetch
global.fetch = vi.fn();

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid'),
    getRandomValues: vi.fn((arr) => arr.map(() => Math.floor(Math.random() * 256))),
  },
});

// Mock performance
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByType: vi.fn(() => []),
    getEntriesByName: vi.fn(() => []),
    clearMarks: vi.fn(),
    clearMeasures: vi.fn(),
  },
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// Mock URL
global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
global.URL.revokeObjectURL = vi.fn();

// Mock FileReader
global.FileReader = vi.fn().mockImplementation(() => ({
  readAsDataURL: vi.fn(),
  readAsText: vi.fn(),
  readAsArrayBuffer: vi.fn(),
  result: null,
  error: null,
  onload: null,
  onerror: null,
  onabort: null,
  onprogress: null,
  abort: vi.fn(),
}));

// Mock Clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('mock-clipboard-text')),
    write: vi.fn(() => Promise.resolve()),
    read: vi.fn(() => Promise.resolve()),
  },
});

// Mock Web Share API
Object.defineProperty(navigator, 'share', {
  value: vi.fn(() => Promise.resolve()),
});

// Mock Notification API
Object.defineProperty(global, 'Notification', {
  value: vi.fn().mockImplementation(() => ({
    close: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

// Mock Service Worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: vi.fn(() => Promise.resolve()),
    unregister: vi.fn(() => Promise.resolve()),
    ready: Promise.resolve({
      active: null,
      installing: null,
      waiting: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
});

// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.CONNECTING,
  url: 'ws://localhost:8080',
  protocol: '',
  extensions: '',
  bufferedAmount: 0,
  onopen: null,
  onclose: null,
  onmessage: null,
  onerror: null,
}));

// Mock EventSource
global.EventSource = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: EventSource.CONNECTING,
  url: 'http://localhost:8080/events',
  withCredentials: false,
  onopen: null,
  onmessage: null,
  onerror: null,
}));

// Mock Solana wallet objects
Object.defineProperty(window, 'solana', {
  value: {
    isPhantom: true,
    connect: vi.fn(() => Promise.resolve({
      publicKey: { toString: () => 'test-wallet-address' }
    })),
    disconnect: vi.fn(() => Promise.resolve()),
    signTransaction: vi.fn((tx) => Promise.resolve(tx)),
    signAllTransactions: vi.fn((txs) => Promise.resolve(txs)),
    request: vi.fn(() => Promise.resolve({ result: 'success' })),
  },
  writable: true,
});

Object.defineProperty(window, 'solflare', {
  value: {
    isSolflare: true,
    connect: vi.fn(() => Promise.resolve({
      publicKey: { toString: () => 'test-solflare-address' }
    })),
    disconnect: vi.fn(() => Promise.resolve()),
    signTransaction: vi.fn((tx) => Promise.resolve(tx)),
    signAllTransactions: vi.fn((txs) => Promise.resolve(txs)),
    request: vi.fn(() => Promise.resolve({ result: 'success' })),
  },
  writable: true,
});

Object.defineProperty(window, 'backpack', {
  value: {
    isBackpack: true,
    connect: vi.fn(() => Promise.resolve({
      publicKey: { toString: () => 'test-backpack-address' }
    })),
    disconnect: vi.fn(() => Promise.resolve()),
    signTransaction: vi.fn((tx) => Promise.resolve(tx)),
    signAllTransactions: vi.fn((txs) => Promise.resolve(txs)),
    request: vi.fn(() => Promise.resolve({ result: 'success' })),
  },
  writable: true,
});

// Mock CSS custom properties
Object.defineProperty(document.documentElement.style, 'getPropertyValue', {
  value: vi.fn((property) => {
    const mockProperties: Record<string, string> = {
      '--soladia-primary': '#E60012',
      '--soladia-secondary': '#0066CC',
      '--soladia-accent': '#FFD700',
      '--soladia-success': '#00A650',
      '--soladia-warning': '#FF8C00',
      '--soladia-error': '#DC2626',
      '--soladia-info': '#0EA5E9',
      '--soladia-bg-primary': '#ffffff',
      '--soladia-bg-secondary': '#f8f9fa',
      '--soladia-text-primary': '#1a1a1a',
      '--soladia-text-secondary': '#666666',
      '--soladia-border': '#e1e5e9',
    };
    return mockProperties[property] || '';
  }),
});

// Mock theme detection
Object.defineProperty(document.documentElement, 'dataset', {
  value: {
    theme: 'light',
  },
  writable: true,
});

// Mock prefers-reduced-motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => {
    if (query === '(prefers-reduced-motion: reduce)') {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }),
});

// Mock prefers-color-scheme
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => {
    if (query === '(prefers-color-scheme: dark)') {
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }
    return {
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  }),
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Global test utilities
declare global {
  namespace Vi {
    interface Assertion<T> {
      toBeInTheDocument(): T;
      toHaveClass(className: string): T;
      toHaveAttribute(attr: string, value?: string): T;
      toHaveStyle(style: Record<string, string>): T;
      toContainText(text: string): T;
      toBeVisible(): T;
      toBeHidden(): T;
      toBeDisabled(): T;
      toBeEnabled(): T;
      toBeChecked(): T;
      toBeUnchecked(): T;
      toHaveValue(value: string): T;
      toHaveTextContent(text: string): T;
      toHaveFocus(): T;
      toBeFocused(): T;
    }
  }
}